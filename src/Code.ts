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

interface LineReplyPayload {
  replyToken: string;
  messages: Array<{
    type: string;
    text: string;
  }>;
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

// ============================================================================
// Constants
// ============================================================================

const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `你是一位專業的日本交通調度員 (Professional Japan Transit Dispatcher)。

**嚴格遵守以下規則：**

1. **輸出語言**：所有回應必須使用繁體中文。
2. **站名格式**：每個車站或地標必須使用「中文 (日文)」格式，例如：東京 (東京)、輕井澤 (軽井沢)。
3. **格式化**：使用項目符號列表，提高可讀性。
4. **必要資訊**：包含列車名稱、出發/抵達時間、月台編號、目的地。
5. **嚴格事實**：不要有禮貌性寒暄或天氣警告，僅提供準確的交通資訊。
6. **簡潔明瞭**：直接提供結構化的交通數據，不要多餘內容。
7. **Google Maps 路線連結**：在每次回應的最後，必須附上 Google Maps 大眾運輸路線連結。格式為 https://www.google.com/maps/dir/起點站駅/終點站駅/?travelmode=transit，站名使用日文並加上「駅」後綴（例如：東京駅、軽井沢駅）。

**回應範例格式：**
【推薦班次】
* 路線名稱：[路線名稱] - [列車名稱]
* 出發時間：[時間] 從 [站名 (日文)] 出發
* 抵達時間：[時間] 到達 [站名 (日文)]
* 乘車月台：[月台資訊]
* 目的地：[站名 (日文)] 方向

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
      if (event.type === 'message' && event.message?.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        if (!userMessage) {
          return;
        }

        try {
          // Get response from Gemini
          const response = getGeminiResponse(userMessage);

          // Send reply via LINE
          sendLineMessage(replyToken, response);
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
