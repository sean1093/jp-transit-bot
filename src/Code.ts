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
  description: string;
}

interface HelpContent {
  title: string;
  sections: {
    icon: string;
    title: string;
    items: string[];
  }[];
  footer: string;
}

interface EmergencyContent {
  title: string;
  stationService: {
    title: string;
    items: string[];
  };
  emergencyContacts: {
    title: string;
    items: string[];
  };
  japanesePhases: {
    title: string;
    items: {
      chinese: string;
      japanese: string;
      romaji: string;
    }[];
  };
  importantLocations: {
    title: string;
    items: string[];
  };
  tips: {
    title: string;
    items: string[];
  };
}

// ============================================================================
// Constants
// ============================================================================

const GEMINI_MODEL = 'gemini-2.5-flash';

// ============================================================================
// Rich Menu Content (JSON Format)
// ============================================================================

/**
 * Help / Usage Instructions Content
 */
const HELP_CONTENT: HelpContent = {
  title: '📖 JP-Transit Bot 使用說明',
  sections: [
    {
      icon: '🔍',
      title: '查詢方式：',
      items: [
        '直接輸入您的交通需求，例如：',
        '・明天早上 9 點博多到熊本',
        '・今天下午從天神到由布院',
        '・福岡機場到博多站'
      ]
    },
    {
      icon: '📍',
      title: '回覆內容包含：',
      items: [
        '・班次時間與路線資訊',
        '・月台編號',
        '・💴 票價資訊',
        '・Google Maps 路線連結'
      ]
    },
    {
      icon: '💡',
      title: '小技巧：',
      items: [
        '・可使用 LINE 語音輸入功能',
        '・點選回覆中的連結可直接導航',
        '・支援自然語言查詢'
      ]
    }
  ],
  footer: '祝您旅途愉快！🎌'
};

/**
 * Fukuoka Attractions Content
 */
const ATTRACTIONS_CONTENT = {
  title: '⭐ 福岡周邊熱門景點',
  description: '請點選下方景點，我會告訴您如何前往：',
  attractions: [
    { name: '太宰府天滿宮', station: '太宰府駅', emoji: '⛩️', description: '九州最知名神社，供奉學問之神' },
    { name: '由布院溫泉', station: '由布院駅', emoji: '♨️', description: '日本知名溫泉鄉，環境優美' },
    { name: '門司港懷舊區', station: '門司港駅', emoji: '🏛️', description: '保留明治時代建築的港口區' },
    { name: '熊本城', station: '熊本駅', emoji: '🏯', description: '日本三大名城之一' },
    { name: '福岡塔', station: '西新駅', emoji: '🗼', description: '福岡地標，可眺望博多灣' },
    { name: '天神地下街', station: '天神駅', emoji: '🛍️', description: '福岡最大購物街' },
    { name: '柳川遊船', station: '西鉄柳川駅', emoji: '🚣', description: '乘坐小舟遊覽水鄉' },
    { name: '博多運河城', station: '中洲川端駅', emoji: '🏢', description: '大型購物娛樂複合設施' }
  ],
  footer: '💡 或直接詢問：「從博多站到太宰府天滿宮」'
} as const;

/**
 * Emergency Information Content
 */
const EMERGENCY_CONTENT: EmergencyContent = {
  title: '🆘 緊急求助資訊',
  stationService: {
    title: '【車站服務】',
    items: [
      '🏢 車站服務台：駅員室（えきいんしつ）',
      '📞 JR 九州客服：092-431-6238'
    ]
  },
  emergencyContacts: {
    title: '【緊急聯絡】',
    items: [
      '🚨 警察：110（免費）',
      '🚑 救護車/消防：119（免費）'
    ]
  },
  japanesePhases: {
    title: '【簡單日語應急用語】',
    items: [
      {
        chinese: '我迷路了',
        japanese: '道に迷いました',
        romaji: 'Michi ni mayoimashita'
      },
      {
        chinese: '請幫忙',
        japanese: '助けてください',
        romaji: 'Tasukete kudasai'
      },
      {
        chinese: '我不會說日文',
        japanese: '日本語が話せません',
        romaji: 'Nihongo ga hanasemasen'
      },
      {
        chinese: '請說英文',
        japanese: '英語で話してください',
        romaji: 'Eigo de hanashite kudasai'
      },
      {
        chinese: '請問廁所在哪裡？',
        japanese: 'トイレはどこですか？',
        romaji: 'Toire wa doko desuka?'
      },
      {
        chinese: '這個多少錢？',
        japanese: 'いくらですか？',
        romaji: 'Ikura desuka?'
      }
    ]
  },
  importantLocations: {
    title: '【福岡重要地點】',
    items: [
      '🏥 福岡市急救醫療中心：092-847-1099',
      '🇹🇼 台北駐福岡辦事處：092-734-2810',
      '📍 地址：福岡市中央區天神 2-14-8'
    ]
  },
  tips: {
    title: '💡 小提醒：',
    items: [
      '・日本警察局都有英文/中文翻譯服務',
      '・大車站都有服務中心可協助',
      '・保持冷靜，善用翻譯 App'
    ]
  }
};

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

      // Handle text message
      if (event.type === 'message' && event.message?.type === 'text') {
        const userMessage = event.message.text;

        if (!userMessage) {
          return;
        }

        try {
          // Check for Rich Menu keywords (只處理 3 個 Rich Menu 功能)
          const helpKeywords = ['幫助', '說明', '教學', 'help', '使用方法', '使用說明'];
          const attractionKeywords = ['熱門景點', '景點', '觀光', '旅遊'];
          const emergencyKeywords = ['緊急求助', '求助', '迷路', '幫忙', 'SOS'];

          const isHelpRequest = helpKeywords.some(keyword => userMessage.includes(keyword));
          const isAttractionRequest = attractionKeywords.some(keyword => userMessage.includes(keyword));
          const isEmergencyRequest = emergencyKeywords.some(keyword => userMessage.includes(keyword));

          if (isAttractionRequest) {
            // 直接回覆熱門景點選單 (不經過 Gemini)
            sendAttractionsMenu(replyToken);
          } else if (isHelpRequest) {
            // 直接回覆使用說明 (不經過 Gemini)
            sendHelpMessage(replyToken);
          } else if (isEmergencyRequest) {
            // 直接回覆緊急求助資訊 (不經過 Gemini)
            sendEmergencyInfo(replyToken);
          } else {
            // 其他訊息交給 Gemini 處理
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
 * Send LINE message with Quick Reply buttons
 * @param replyToken - Reply token from LINE webhook
 * @param text - Message text to send
 */
function sendLineMessageWithQuickReply(replyToken: string, text: string): void {
  // 簡化版本：直接使用 sendLineMessage，不再添加 Quick Reply 按鈕
  sendLineMessage(replyToken, text);
}

/**
 * Send popular routes menu to user
 * @param replyToken - Reply token from LINE webhook
 */
/**
 * Send help/instruction message to user (using JSON content)
 * @param replyToken - Reply token from LINE webhook
 */
function sendHelpMessage(replyToken: string): void {
  let helpText = HELP_CONTENT.title + '\n\n';

  HELP_CONTENT.sections.forEach(section => {
    helpText += `${section.icon} **${section.title}**\n`;
    section.items.forEach(item => {
      helpText += `${item}\n`;
    });
    helpText += '\n';
  });

  helpText += HELP_CONTENT.footer;

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
 * Create a simple solid color PNG image for Rich Menu
 * @returns Image blob (2500x1686 solid gray background)
 */
function createPlaceholderImage(): GoogleAppsScript.Base.Blob {
  // Download a placeholder image from a public service
  // This creates a 2500x1686 gray image
  const imageUrl = 'https://via.placeholder.com/2500x1686/CCCCCC/FFFFFF?text=JP+Transit+Bot';

  try {
    const response = UrlFetchApp.fetch(imageUrl);
    const blob = response.getBlob();
    return blob.setName('richmenu.png');
  } catch (error) {
    console.log('Failed to download placeholder image: ' + (error as Error).toString());
    throw new Error('Failed to create placeholder image');
  }
}

/**
 * Create Rich Menu without image (image must be uploaded manually in LINE Console)
 * This is the main function to call for initial setup
 */
function setupRichMenuNoImage(): void {
  try {
    // Step 1: Create Rich Menu
    console.log('Creating Rich Menu...');
    const richMenuId = createRichMenu();

    console.log('✅ Rich Menu created successfully!');
    console.log(`Rich Menu ID: ${richMenuId}`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Go to LINE Developers Console: https://developers.line.biz/console/');
    console.log('2. Select your channel → Messaging API → Rich menus');
    console.log(`3. Find Rich Menu ID: ${richMenuId}`);
    console.log('4. Click "Edit" → Upload a 2500x1686 image');
    console.log('5. Click "Set as default"');
    console.log('');
    console.log('Or use the Rich Menu editor to create background with text labels.');
  } catch (error) {
    console.log('❌ Error creating Rich Menu: ' + (error as Error).toString());
  }
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

    // Step 2: Create a simple placeholder image (solid gray color)
    console.log('Creating placeholder image...');
    const imageBlob = createPlaceholderImage();

    // Step 3: Upload image
    console.log('Uploading image...');
    uploadRichMenuImage(richMenuId, imageBlob);

    // Step 4: Set as default
    console.log('Setting as default menu...');
    setDefaultRichMenu(richMenuId);

    console.log('✅ Rich Menu setup completed successfully!');
    console.log(`Rich Menu ID: ${richMenuId}`);
    console.log('You can now see the menu in your LINE Bot chat.');
    console.log('📝 Note: Currently using a placeholder gray image.');
    console.log('   You can upload a custom image later via LINE Developers Console.');
  } catch (error) {
    console.log('❌ Error setting up Rich Menu: ' + (error as Error).toString());
  }
}

// ============================================================================
// Location Functions
// ============================================================================
// Feature Functions
// ============================================================================

/**
 * Send attractions menu to user (using JSON content)
 * @param replyToken - Reply token from LINE webhook
 */
function sendAttractionsMenu(replyToken: string): void {
  // Build attractions text from JSON
  let attractionsText = `${ATTRACTIONS_CONTENT.title}\n\n${ATTRACTIONS_CONTENT.description}\n\n`;

  attractionsText += ATTRACTIONS_CONTENT.attractions.map(attr =>
    `${attr.emoji} ${attr.name}\n   ${attr.description}`
  ).join('\n\n');

  attractionsText += `\n\n${ATTRACTIONS_CONTENT.footer}`;

  // Create quick reply with attraction names
  const quickReplyItems = ATTRACTIONS_CONTENT.attractions.map(attr => ({
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
 * Send emergency information to user (using JSON content)
 * @param replyToken - Reply token from LINE webhook
 */
function sendEmergencyInfo(replyToken: string): void {
  // Build emergency info text from JSON
  let emergencyText = `${EMERGENCY_CONTENT.title}\n\n`;

  emergencyText += `${EMERGENCY_CONTENT.stationService.title}\n`;
  emergencyText += EMERGENCY_CONTENT.stationService.items.join('\n') + '\n\n';

  emergencyText += `${EMERGENCY_CONTENT.emergencyContacts.title}\n`;
  emergencyText += EMERGENCY_CONTENT.emergencyContacts.items.join('\n') + '\n\n';

  emergencyText += `${EMERGENCY_CONTENT.japanesePhases.title}\n`;
  EMERGENCY_CONTENT.japanesePhases.items.forEach(phrase => {
    emergencyText += `・${phrase.chinese}\n`;
    emergencyText += `  → ${phrase.japanese}\n`;
    emergencyText += `  （${phrase.romaji}）\n\n`;
  });

  emergencyText += `${EMERGENCY_CONTENT.importantLocations.title}\n`;
  emergencyText += EMERGENCY_CONTENT.importantLocations.items.join('\n') + '\n\n';

  emergencyText += `${EMERGENCY_CONTENT.tips.title}\n`;
  emergencyText += EMERGENCY_CONTENT.tips.items.join('\n');

  sendLineMessageWithQuickReply(replyToken, emergencyText);
}

