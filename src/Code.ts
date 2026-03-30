/**
 * JP-Transit Bot
 * LINE Bot powered by Google Apps Script and Gemini API
 * Provides Japanese transit information for travelers
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface LineWebhookEvent {
  type: string;
  message?: {
    type: string;
    text?: string;
  };
  replyToken: string;
}

interface LineWebhookPayload {
  events: LineWebhookEvent[];
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface QuickReplyButton {
  type: 'action';
  action: {
    type: 'message';
    label: string;
    text: string;
  };
}

interface QuickReply {
  items: QuickReplyButton[];
}

interface LineMessage {
  type: string;
  text: string;
  quickReply?: QuickReply;
}

interface LineReplyPayload {
  replyToken: string;
  messages: LineMessage[];
}

interface LineBroadcastPayload {
  messages: Array<{
    type: string;
    text: string;
  }>;
}

interface LineQuotaResponse {
  type: string;
  value: number;
}

interface RichMenuSize {
  width: number;
  height: number;
}

interface RichMenuBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RichMenuArea {
  bounds: RichMenuBounds;
  action: {
    type: string;
    text?: string;
    uri?: string;
  };
}

interface RichMenuPayload {
  size: RichMenuSize;
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
}

interface LocationMessage {
  type: 'location';
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface Attraction {
  name: string;
  station: string;
  emoji: string;
  description?: string;
}

// ============================================================================
// Constants
// ============================================================================

const GEMINI_MODEL = 'gemini-2.5-flash';

// Fukuoka popular routes for quick reply menu
const FUKUOKA_ROUTES = [
  { label: '🏯 福岡→熊本', text: '福岡到熊本' },
  { label: '♨️ 福岡→由布院', text: '福岡到由布院' },
  { label: '⛩️ 福岡→門司港', text: '福岡到門司港' },
  { label: '🏙️ 博多→天神', text: '博多站到天神' },
  { label: '✈️ 機場→博多', text: '福岡機場到博多站' },
  { label: '❓ 使用說明', text: '使用說明' }
];

// Fukuoka attractions database
const FUKUOKA_ATTRACTIONS: Attraction[] = [
  { name: '太宰府天滿宮', station: '太宰府駅', emoji: '⛩️', description: '九州最知名神社，供奉學問之神' },
  { name: '由布院溫泉', station: '由布院駅', emoji: '♨️', description: '日本知名溫泉鄉，環境優美' },
  { name: '門司港懷舊區', station: '門司港駅', emoji: '🏛️', description: '保留明治時代建築的港口區' },
  { name: '熊本城', station: '熊本駅', emoji: '🏯', description: '日本三大名城之一' },
  { name: '福岡塔', station: '西新駅', emoji: '🗼', description: '福岡地標，可眺望博多灣' },
  { name: '天神地下街', station: '天神駅', emoji: '🛍️', description: '福岡最大購物街' },
  { name: '柳川遊船', station: '西鉄柳川駅', emoji: '🚣', description: '乘坐小舟遊覽水鄉' },
  { name: '博多運河城', station: '中洲川端駅', emoji: '🏢', description: '大型購物娛樂複合設施' }
];

// Fukuoka major stations for location matching
const FUKUOKA_STATIONS = [
  { name: '博多駅', lat: 33.5904, lon: 130.4206 },
  { name: '天神駅', lat: 33.5915, lon: 130.3987 },
  { name: '福岡空港駅', lat: 33.5859, lon: 130.4510 },
  { name: '西新駅', lat: 33.5839, lon: 130.3618 },
  { name: '中洲川端駅', lat: 33.5950, lon: 130.4065 },
  { name: '薬院駅', lat: 33.5798, lon: 130.4017 }
];

// Transportation ticket information
const TICKET_INFO = `🎫 福岡交通票券資訊

【JR 九州鐵路周遊券】
📍 類型：
・北九州版：3日券 ¥11,000 / 5日券 ¥14,000
・全九州版：3日券 ¥20,000 / 5日券 ¥23,000
・南九州版：3日券 ¥9,000

💡 使用範圍：
・可搭乘 JR 九州所有列車（含新幹線）
・部分版本限制區域

🛒 購買地點：
・日本海外旅行社
・博多站綠色窗口（JR Ticket Office）

【福岡悠遊卡（FUKUOKA TOURIST CITY PASS）】
💰 1日券：¥820
📍 使用範圍：
・福岡市地鐵全線
・西鐵巴士市內線

【SUGOCAⓔ交通IC卡】
💡 儲值式交通卡
・地鐵、JR、巴士通用
・便利商店可使用

📌 提醒：
・持 JR Pass 無法搭乘私鐵（西鐵）
・建議根據行程選擇適合票券`;

// Emergency information
const EMERGENCY_INFO = `🆘 緊急求助資訊

【車站服務】
🏢 車站服務台：駅員室（えきいんしつ）
📞 JR 九州客服：092-431-6238

【緊急聯絡】
🚨 警察：110（免費）
🚑 救護車/消防：119（免費）

【簡單日語應急用語】
・我迷路了
  → 道に迷いました
  （Michi ni mayoimashita）

・請幫忙
  → 助けてください
  （Tasukete kudasai）

・我不會說日文
  → 日本語が話せません
  （Nihongo ga hanasemasen）

・請說英文
  → 英語で話してください
  （Eigo de hanashite kudasai）

・請問廁所在哪裡？
  → トイレはどこですか？
  （Toire wa doko desuka?）

・這個多少錢？
  → いくらですか？
  （Ikura desuka?）

【福岡重要地點】
🏥 福岡市急救醫療中心：092-847-1099
🇹🇼 台北駐福岡辦事處：092-734-2810
📍 地址：福岡市中央區天神 2-14-8

💡 小提醒：
・日本警察局都有英文/中文翻譯服務
・大車站都有服務中心可協助
・保持冷靜，善用翻譯 App`;

const SYSTEM_INSTRUCTION = `你是一位專業的日本交通調度員 (Professional Japan Transit Dispatcher)。

**嚴格遵守以下規則：**

1. **輸出語言**：所有回應必須使用繁體中文。
2. **站名格式**：每個車站或地標必須使用「中文 (日文)」格式，例如：東京 (東京)、輕井澤 (軽井沢)。
3. **格式化**：使用項目符號列表，提高可讀性。
4. **必要資訊**：包含列車名稱、出發/抵達時間、月台編號、目的地。
5. **票價資訊**：必須提供票價資訊（日圓），並標註是否可使用 JR Pass。如果有多種車票選擇（自由席、指定席等），請一併列出。
6. **嚴格事實**：不要有禮貌性寒暄或天氣警告，僅提供準確的交通資訊。
7. **簡潔明瞭**：直接提供結構化的交通數據，不要多餘內容。
8. **Google Maps 路線連結**：在每次回應的最後，必須附上 Google Maps 大眾運輸路線連結。格式為 https://www.google.com/maps/dir/起點站駅/終點站駅/?travelmode=transit，站名使用日文並加上「駅」後綴（例如：東京駅、軽井沢駅）。

**回應範例格式：**
【推薦班次】
* 路線名稱：[路線名稱] - [列車名稱]
* 出發時間：[時間] 從 [站名 (日文)] 出發
* 抵達時間：[時間] 到達 [站名 (日文)]
* 乘車月台：[月台資訊]
* 目的地：[站名 (日文)] 方向
* 💴 票價：[金額] 日圓
* JR Pass：[可使用/不可使用]

📍 查看路線詳情：https://www.google.com/maps/dir/[起點站駅]/[終點站駅]/?travelmode=transit`;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Webhook handler for LINE Messaging API
 * @param e - Event object from LINE
 */
function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    // Validate request
    if (!e || !e.postData || !e.postData.contents) {
      console.log('Invalid request: no postData');
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Parse incoming LINE webhook
    const contents: LineWebhookPayload = JSON.parse(e.postData.contents);

    // Validate events
    if (!contents.events || contents.events.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const events = contents.events;

    // Process each event
    events.forEach((event: LineWebhookEvent) => {
      const replyToken = event.replyToken;

      // Handle location message
      if (event.type === 'message' && event.message?.type === 'location') {
        try {
          const location = event.message as unknown as LocationMessage;
          handleLocationMessage(replyToken, location.latitude, location.longitude);
        } catch (error) {
          console.log('Error processing location: ' + (error as Error).toString());
          sendLineMessage(replyToken, '位置處理發生錯誤，請稍後再試');
        }
        return;
      }

      // Handle text message
      if (event.type === 'message' && event.message?.type === 'text') {
        const userMessage = event.message.text;

        if (!userMessage) {
          return;
        }

        try {
          // Check for feature keywords
          const menuKeywords = ['選單', '菜單', '熱門路線', '路線', 'menu'];
          const helpKeywords = ['幫助', '說明', '教學', 'help', '使用方法', '使用說明'];
          const locationKeywords = ['我的位置', '位置', '附近', '最近的車站'];
          const attractionKeywords = ['熱門景點', '景點', '觀光', '旅遊'];
          const ticketKeywords = ['交通票券', '票券', 'JR Pass', '周遊券'];
          const emergencyKeywords = ['緊急求助', '求助', '迷路', '幫忙', 'SOS'];
          const resetKeywords = ['重新查詢', '重新開始', '重來', '清空', 'reset'];

          const isMenuRequest = menuKeywords.some(keyword => userMessage.includes(keyword));
          const isHelpRequest = helpKeywords.some(keyword => userMessage.includes(keyword));
          const isLocationRequest = locationKeywords.some(keyword => userMessage.includes(keyword));
          const isAttractionRequest = attractionKeywords.some(keyword => userMessage.includes(keyword));
          const isTicketRequest = ticketKeywords.some(keyword => userMessage.includes(keyword));
          const isEmergencyRequest = emergencyKeywords.some(keyword => userMessage.includes(keyword));
          const isResetRequest = resetKeywords.some(keyword => userMessage.includes(keyword));

          if (isLocationRequest) {
            // Handle location request
            handleLocationRequest(replyToken);
          } else if (isAttractionRequest) {
            // Send attractions menu
            sendAttractionsMenu(replyToken);
          } else if (isTicketRequest) {
            // Send ticket information
            sendTicketInfo(replyToken);
          } else if (isEmergencyRequest) {
            // Send emergency information
            sendEmergencyInfo(replyToken);
          } else if (isResetRequest) {
            // Reset conversation
            handleResetConversation(replyToken);
          } else if (isMenuRequest) {
            // Send popular routes menu
            sendMenuMessage(replyToken);
          } else if (isHelpRequest) {
            // Send help message
            sendHelpMessage(replyToken);
          } else {
            // Get response from Gemini
            const response = getGeminiResponse(userMessage);

            // Send reply via LINE with quick reply buttons
            sendLineMessageWithQuickReply(replyToken, response);
          }
        } catch (error) {
          console.log('Error processing message: ' + (error as Error).toString());
          // Send error message to user
          try {
            sendLineMessage(replyToken, '今日使用已達上限');
          } catch (e) {
            console.log('Failed to send error message: ' + (e as Error).toString());
          }
        }
      }
    });

    // Always return 200 OK
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.log('Error in doPost: ' + (error as Error).toString());
    // Still return 200 to prevent LINE from retrying
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Call Gemini API with Google Search grounding
 * @param text - User's message
 * @returns Generated response
 */
function getGeminiResponse(text: string): string {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in Script Properties');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [
        {
          text: SYSTEM_INSTRUCTION
        }
      ]
    },
    contents: [
      {
        parts: [
          {
            text: text
          }
        ]
      }
    ],
    tools: [
      {
        googleSearch: {}
      }
    ],
    generationConfig: {
      temperature: 0.0,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  // Handle errors
  if (responseCode === 429) {
    throw new Error('Quota exceeded (429)');
  }

  if (responseCode >= 400) {
    console.log(`API Error ${responseCode}: ${responseText}`);
    throw new Error(`API Error ${responseCode}: ${responseText}`);
  }

  // Parse response
  const result: GeminiResponse = JSON.parse(responseText);

  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('No candidates in response');
  }

  const candidate = result.candidates[0];

  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('No content in candidate');
  }

  return candidate.content.parts[0].text;
}

/**
 * Send reply message via LINE Messaging API
 * @param replyToken - Reply token from LINE webhook
 * @param text - Message text to send
 */
function sendLineMessage(replyToken: string, text: string): void {
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = 'https://api.line.me/v2/bot/message/reply';

  const payload: LineReplyPayload = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: text
      }
    ]
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`LINE API Error ${responseCode}: ${responseText}`);
    throw new Error(`LINE API Error ${responseCode}: ${responseText}`);
  }

  console.log('Message sent successfully');
}

/**
 * Generate Quick Reply buttons from Fukuoka routes
 * @returns Quick Reply object with route buttons
 */
function getQuickReplyButtons(): QuickReply {
  return {
    items: FUKUOKA_ROUTES.map(route => ({
      type: 'action' as const,
      action: {
        type: 'message' as const,
        label: route.label,
        text: route.text
      }
    }))
  };
}

/**
 * Send LINE message with Quick Reply buttons
 * @param replyToken - Reply token from LINE webhook
 * @param text - Message text to send
 */
function sendLineMessageWithQuickReply(replyToken: string, text: string): void {
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = 'https://api.line.me/v2/bot/message/reply';

  const payload: LineReplyPayload = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: text,
        quickReply: getQuickReplyButtons()
      }
    ]
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`LINE API Error ${responseCode}: ${responseText}`);
    throw new Error(`LINE API Error ${responseCode}: ${responseText}`);
  }

  console.log('Message with quick reply sent successfully');
}

/**
 * Send popular routes menu to user
 * @param replyToken - Reply token from LINE webhook
 */
function sendMenuMessage(replyToken: string): void {
  const menuText = `🚄 福岡周邊熱門路線

請點選下方按鈕快速查詢：

🏯 福岡 ⇄ 熊本
♨️ 福岡 ⇄ 由布院（湯布院）
⛩️ 福岡 ⇄ 門司港
🏙️ 博多站 ⇄ 天神
✈️ 福岡機場 ⇄ 博多站

💡 或直接輸入查詢，例如：
「明天早上 9 點博多到熊本」`;

  sendLineMessageWithQuickReply(replyToken, menuText);
}

/**
 * Send help/instruction message to user
 * @param replyToken - Reply token from LINE webhook
 */
function sendHelpMessage(replyToken: string): void {
  const helpText = `📖 JP-Transit Bot 使用說明

🔍 **查詢方式：**
直接輸入您的交通需求，例如：
・明天早上 9 點博多到熊本
・今天下午從天神到由布院
・福岡機場到博多站

📍 **回覆內容包含：**
・班次時間與路線資訊
・月台編號
・💴 票價資訊
・Google Maps 路線連結

⚡ **快速查詢：**
輸入「選單」或「熱門路線」
查看福岡周邊常用路線

💡 **小技巧：**
・可使用 LINE 語音輸入功能
・點選回覆中的連結可直接導航
・支援自然語言查詢

祝您旅途愉快！🎌`;

  sendLineMessageWithQuickReply(replyToken, helpText);
}

/**
 * Broadcast message to all LINE Bot friends
 * Note: Free tier has 500 messages/month quota
 * @param text - Message text to broadcast
 */
function broadcastMessage(text: string): void {
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = 'https://api.line.me/v2/bot/message/broadcast';

  const payload: LineBroadcastPayload = {
    messages: [
      {
        type: 'text',
        text: text
      }
    ]
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`LINE Broadcast API Error ${responseCode}: ${responseText}`);
    throw new Error(`LINE Broadcast API Error ${responseCode}: ${responseText}`);
  }

  console.log('Broadcast message sent successfully');
}

/**
 * Get remaining broadcast quota for current month
 * @returns Number of remaining broadcast messages
 */
function getBroadcastQuota(): number {
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = 'https://api.line.me/v2/bot/message/quota';

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`LINE Quota API Error ${responseCode}: ${responseText}`);
    throw new Error(`LINE Quota API Error ${responseCode}: ${responseText}`);
  }

  const result: LineQuotaResponse = JSON.parse(response.getContentText());
  console.log(`Remaining broadcast quota: ${result.value}`);
  return result.value;
}

/**
 * Test function for broadcasting
 * Run this to send a test broadcast to all friends
 */
function testBroadcast(): void {
  try {
    // Check quota first
    const quota = getBroadcastQuota();
    console.log(`Current quota: ${quota} messages remaining`);

    if (quota === 0) {
      console.log('No broadcast quota remaining this month');
      return;
    }

    // Send test broadcast
    const testMessage = '🚄 JP-Transit Bot 測試廣播\n\n這是一則測試訊息，確認廣播功能正常運作。';
    broadcastMessage(testMessage);
    console.log('Test broadcast sent successfully');

    // Check quota after sending
    const remainingQuota = getBroadcastQuota();
    console.log(`Remaining quota after broadcast: ${remainingQuota}`);
  } catch (error) {
    console.log('Error: ' + (error as Error).toString());
  }
}

/**
 * Test function for local development
 * Uncomment and run this to test Gemini API integration
 */
function testGemini(): void {
  const testMessage = "明日 09:00 東京到輕井澤";
  try {
    const response = getGeminiResponse(testMessage);
    console.log('Response: ' + response);
  } catch (error) {
    console.log('Error: ' + (error as Error).toString());
  }
}

/**
 * Simple GET handler to verify deployment
 * This helps diagnose 302 redirect issues
 */
function doGet(_e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'JP-Transit Bot is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// Rich Menu Functions
// ============================================================================

/**
 * Create Rich Menu with 6-button layout (2x3 grid)
 * @returns Rich Menu ID
 */
function createRichMenu(): string {
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = 'https://api.line.me/v2/bot/richmenu';

  // Rich Menu configuration for 6-button layout (方案 A：功能導向)
  const richMenuPayload: RichMenuPayload = {
    size: {
      width: 2500,
      height: 1686
    },
    selected: true,
    name: 'Fukuoka Transit Helper Menu',
    chatBarText: '快速功能選單',
    areas: [
      // Top row - Left: 我的位置
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: '我的位置' }
      },
      // Top row - Middle: 熱門景點
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'message', text: '熱門景點' }
      },
      // Top row - Right: 交通票券
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: '交通票券' }
      },
      // Bottom row - Left: 緊急求助
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: 'message', text: '緊急求助' }
      },
      // Bottom row - Middle: 重新查詢
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: 'message', text: '重新查詢' }
      },
      // Bottom row - Right: 使用說明
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: 'message', text: '使用說明' }
      }
    ]
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(richMenuPayload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    console.log(`Rich Menu API Error ${responseCode}: ${responseText}`);
    throw new Error(`Rich Menu API Error ${responseCode}: ${responseText}`);
  }

  const result = JSON.parse(responseText);
  console.log('Rich Menu created successfully: ' + result.richMenuId);
  return result.richMenuId;
}

/**
 * Upload image to Rich Menu
 * @param richMenuId - Rich Menu ID
 * @param imageBlob - Image blob (PNG, JPEG)
 */
function uploadRichMenuImage(richMenuId: string, imageBlob: GoogleAppsScript.Base.Blob): void {
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`;

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'image/png'
    },
    payload: imageBlob.getBytes(),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`Upload Image Error ${responseCode}: ${responseText}`);
    throw new Error(`Upload Image Error ${responseCode}: ${responseText}`);
  }

  console.log('Rich Menu image uploaded successfully');
}

/**
 * Set Rich Menu as default for all users
 * @param richMenuId - Rich Menu ID
 */
function setDefaultRichMenu(richMenuId: string): void {
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`;

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`Set Default Rich Menu Error ${responseCode}: ${responseText}`);
    throw new Error(`Set Default Rich Menu Error ${responseCode}: ${responseText}`);
  }

  console.log('Rich Menu set as default successfully');
}

/**
 * Create and setup Rich Menu with default image
 * This is the main function to call for initial setup
 */
function setupRichMenu(): void {
  try {
    // Step 1: Create Rich Menu
    console.log('Creating Rich Menu...');
    const richMenuId = createRichMenu();

    // Step 2: Create a simple placeholder image (2500x1686, solid color)
    // Note: You can replace this with a custom image later
    console.log('Creating placeholder image...');
    const canvas = Charts.newAreaChart()
      .setDimensions(2500, 1686)
      .build();
    const imageBlob = canvas.getAs('image/png');

    // Step 3: Upload image
    console.log('Uploading image...');
    uploadRichMenuImage(richMenuId, imageBlob);

    // Step 4: Set as default
    console.log('Setting as default menu...');
    setDefaultRichMenu(richMenuId);

    console.log('✅ Rich Menu setup completed successfully!');
    console.log(`Rich Menu ID: ${richMenuId}`);
    console.log('You can now see the menu in your LINE Bot chat.');
  } catch (error) {
    console.log('❌ Error setting up Rich Menu: ' + (error as Error).toString());
  }
}

// ============================================================================
// Location Functions
// ============================================================================

/**
 * Handle location request - prompt user to share location
 * @param replyToken - Reply token from LINE webhook
 */
function handleLocationRequest(replyToken: string): void {
  const locationText = `📍 請分享您的位置

點擊下方的「位置」按鈕，
我會幫您找到最近的車站並建議交通方案。

💡 也可以直接告訴我：
「我在 XX 飯店，要去博多站」`;

  // Send message with location quick reply button
  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = 'https://api.line.me/v2/bot/message/reply';

  const payload = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: locationText,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'location',
                label: '📍 分享位置'
              }
            }
          ]
        }
      }
    ]
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`LINE API Error ${responseCode}: ${responseText}`);
    throw new Error(`LINE API Error ${responseCode}: ${responseText}`);
  }

  console.log('Location request sent successfully');
}

/**
 * Handle location message - find nearest station and suggest transportation
 * @param replyToken - Reply token from LINE webhook
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 */
function handleLocationMessage(replyToken: string, latitude: number, longitude: number): void {
  console.log(`Received location: ${latitude}, ${longitude}`);

  // Find nearest station
  const nearestStation = findNearestStation(latitude, longitude);

  const locationResponse = `📍 您的位置分析

🚉 最近的車站：${nearestStation}

💡 您可以詢問：
・從 ${nearestStation} 到博多站
・從 ${nearestStation} 到天神
・從 ${nearestStation} 到熱門景點

或直接告訴我您想去的地方！`;

  sendLineMessageWithQuickReply(replyToken, locationResponse);
}

/**
 * Find nearest station from user's location
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Nearest station name
 */
function findNearestStation(lat: number, lon: number): string {
  let nearestStation = '博多駅';
  let minDistance = Infinity;

  FUKUOKA_STATIONS.forEach(station => {
    const distance = Math.sqrt(
      Math.pow(station.lat - lat, 2) + Math.pow(station.lon - lon, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = station.name;
    }
  });

  return nearestStation;
}

// ============================================================================
// Feature Functions
// ============================================================================

/**
 * Send attractions menu to user
 * @param replyToken - Reply token from LINE webhook
 */
function sendAttractionsMenu(replyToken: string): void {
  const attractionsText = `⭐ 福岡周邊熱門景點

請點選下方景點，我會告訴您如何前往：

${FUKUOKA_ATTRACTIONS.map(attr =>
    `${attr.emoji} ${attr.name}\n   ${attr.description}`
  ).join('\n\n')}

💡 或直接詢問：「從博多站到太宰府天滿宮」`;

  // Create quick reply with attraction names
  const quickReplyItems = FUKUOKA_ATTRACTIONS.map(attr => ({
    type: 'action' as const,
    action: {
      type: 'message' as const,
      label: `${attr.emoji} ${attr.name}`,
      text: `從博多站到${attr.name}`
    }
  }));

  const accessToken = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in Script Properties');
  }

  const url = 'https://api.line.me/v2/bot/message/reply';

  const payload = {
    replyToken: replyToken,
    messages: [
      {
        type: 'text',
        text: attractionsText,
        quickReply: {
          items: quickReplyItems.slice(0, 13) // LINE Quick Reply 最多 13 個按鈕
        }
      }
    ]
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    const responseText = response.getContentText();
    console.log(`LINE API Error ${responseCode}: ${responseText}`);
    throw new Error(`LINE API Error ${responseCode}: ${responseText}`);
  }

  console.log('Attractions menu sent successfully');
}

/**
 * Send ticket information to user
 * @param replyToken - Reply token from LINE webhook
 */
function sendTicketInfo(replyToken: string): void {
  sendLineMessageWithQuickReply(replyToken, TICKET_INFO);
}

/**
 * Send emergency information to user
 * @param replyToken - Reply token from LINE webhook
 */
function sendEmergencyInfo(replyToken: string): void {
  sendLineMessageWithQuickReply(replyToken, EMERGENCY_INFO);
}

/**
 * Handle conversation reset
 * @param replyToken - Reply token from LINE webhook
 */
function handleResetConversation(replyToken: string): void {
  const resetText = `🔄 已重新開始！

請告訴我您的交通需求，例如：
・明天早上 9 點博多到熊本
・今天下午從天神到由布院
・福岡機場到博多站

或點選下方選單快速查詢 👇`;

  sendLineMessageWithQuickReply(replyToken, resetText);
}
