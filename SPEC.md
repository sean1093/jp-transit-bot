SPEC: JP-Transit Bot (Line + GAS + Gemini)
1. Project Overview
A LINE Bot hosted on Google Apps Script (GAS) designed to help elderly travelers navigate Japanese transportation (JR, Metro, Shinkansen) using the Gemini 1.5 API with Google Search grounding.

2. Core Requirements
Simplicity: No fluff. Direct, structured transport data.

Accuracy: Real-time data via Gemini's Google Search_retrieval tool.

Bilingual Support: All Japanese station names must include Chinese translations.

Robustness: Automatic model fallback (Flash -> Pro) when quota is hit.

3. Technical Architecture
Language: Google Apps Script (JavaScript)

Deployment: Web App (Execute as Me, Access: Anyone)

External APIs:

LINE Messaging API (Reply Message)

Google Gemini API (Model: gemini-1.5-flash as primary, gemini-1.5-pro as fallback)

4. API Logic Flow
Webhook Entry: Receive JSON from LINE.

Preprocessing: Extract message.text and replyToken.

Gemini Call (Layer 1 - Flash):

Include system_instruction (Role: Transport Dispatcher).

Enable Google Search_retrieval tool.

Set temperature to 0.0 for factual accuracy.

Error Handling / Fallback:

If status code is 429 (Quota) or 500 (Error), retry with gemini-1.5-pro.

Post-processing: Extract text from candidates and send via LINE Reply API.

5. System Instructions (Prompt Engineering)
The AI must act as a "Professional Japan Transit Dispatcher".

Constraint 1: Output must be in Traditional Chinese.

Constraint 2: Every station/landmark must be formatted as Chinese (Japanese). Example: 東京 (東京), 輕井澤 (軽井沢).

Constraint 3: Formatting must be bulleted for readability.

Constraint 4: Include: Train name, Departure/Arrival time, Platform number, and Destination.

Constraint 5: NO polite small talk or weather warnings (Strictly factual).

6. Implementation Checklist for AI Agent
[ ] Implement doPost(e) to handle LINE Webhooks.

[ ] Create getGeminiResponse(text, model) function with Google Search tool configuration.

[ ] Implement a recursive or loop-based fallback mechanism for MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"].

[ ] Create sendLineMessage(token, text) using UrlFetchApp.

[ ] Ensure API keys and tokens are stored as PropertiesService.getScriptProperties().

7. Expected Response Structure
When a user asks: "明日 09:00 東京到輕井澤"
The output should look like:

Plaintext
【推薦班次】
* 路線名稱：北陸新幹線 - 淺間號 (あさま 605号)
* 出發時間：09:04 從 東京 (東京) 出發
* 抵達時間：10:16 到達 輕井澤 (軽井沢)
* 乘車月台：20-23 號新幹線月台
* 目的地：長野 (長野) 方向