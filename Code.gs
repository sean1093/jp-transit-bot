/**
 * JP-Transit Bot
 * LINE Bot powered by Google Apps Script and Gemini API
 * Provides Japanese transit information for elderly travelers
 */

// Model fallback configuration
const MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro'];

// System instruction for Gemini API
const SYSTEM_INSTRUCTION = `你是一位專業的日本交通調度員 (Professional Japan Transit Dispatcher)。

**嚴格遵守以下規則：**

1. **輸出語言**：所有回應必須使用繁體中文。
2. **站名格式**：每個車站或地標必須使用「中文 (日文)」格式，例如：東京 (東京)、輕井澤 (軽井沢)。
3. **格式化**：使用項目符號列表，提高可讀性。
4. **必要資訊**：包含列車名稱、出發/抵達時間、月台編號、目的地。
5. **嚴格事實**：不要有禮貌性寒暄或天氣警告，僅提供準確的交通資訊。
6. **簡潔明瞭**：直接提供結構化的交通數據，不要多餘內容。

**回應範例格式：**
【推薦班次】
* 路線名稱：[路線名稱] - [列車名稱]
* 出發時間：[時間] 從 [站名 (日文)] 出發
* 抵達時間：[時間] 到達 [站名 (日文)]
* 乘車月台：[月台資訊]
* 目的地：[站名 (日文)] 方向`;

/**
 * Webhook handler for LINE Messaging API
 * @param {Object} e - Event object from LINE
 */
function doPost(e) {
  try {
    // Parse incoming LINE webhook
    const contents = JSON.parse(e.postData.contents);
    const events = contents.events;

    // Process each event
    events.forEach(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        // Get response from Gemini with fallback
        const response = getGeminiResponseWithFallback(userMessage);

        // Send reply via LINE
        sendLineMessage(replyToken, response);
      }
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get response from Gemini API with automatic model fallback
 * @param {string} text - User's message
 * @return {string} - Generated response
 */
function getGeminiResponseWithFallback(text) {
  let lastError = null;

  // Try each model in sequence
  for (let i = 0; i < MODELS.length; i++) {
    try {
      const response = getGeminiResponse(text, MODELS[i]);
      Logger.log(`Success with model: ${MODELS[i]}`);
      return response;
    } catch (error) {
      lastError = error;
      Logger.log(`Failed with model ${MODELS[i]}: ${error.toString()}`);

      // If it's the last model, throw the error
      if (i === MODELS.length - 1) {
        throw error;
      }
      // Otherwise, continue to next model
    }
  }

  // This should never be reached, but just in case
  throw new Error('All models failed: ' + (lastError ? lastError.toString() : 'Unknown error'));
}

/**
 * Call Gemini API with Google Search grounding
 * @param {string} text - User's message
 * @param {string} model - Model name to use
 * @return {string} - Generated response
 */
function getGeminiResponse(text, model) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in Script Properties');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        google_search_retrieval: {
          dynamic_retrieval_config: {
            mode: "MODE_DYNAMIC",
            dynamic_threshold: 0.3
          }
        }
      }
    ],
    generationConfig: {
      temperature: 0.0,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  };

  const options = {
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
    Logger.log(`API Error ${responseCode}: ${responseText}`);
    throw new Error(`API Error ${responseCode}: ${responseText}`);
  }

  // Parse response
  const result = JSON.parse(responseText);

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
 * @param {string} replyToken - Reply token from LINE webhook
 * @param {string} text - Message text to send
 */
function sendLineMessage(replyToken, text) {
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
        text: text
      }
    ]
  };

  const options = {
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
    Logger.log(`LINE API Error ${responseCode}: ${responseText}`);
    throw new Error(`LINE API Error ${responseCode}: ${responseText}`);
  }

  Logger.log('Message sent successfully');
}

/**
 * Test function for local development
 * Uncomment and run this to test Gemini API integration
 */
function testGemini() {
  const testMessage = "明日 09:00 東京到輕井澤";
  try {
    const response = getGeminiResponseWithFallback(testMessage);
    Logger.log('Response: ' + response);
  } catch (error) {
    Logger.log('Error: ' + error.toString());
  }
}
