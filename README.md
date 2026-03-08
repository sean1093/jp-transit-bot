# JP-Transit Bot

A LINE Bot powered by Google Apps Script and Gemini API that provides Japanese transportation information for elderly travelers. The bot uses Gemini's Google Search grounding to deliver real-time, accurate transit data in Traditional Chinese with bilingual station names.

## Features

- **Real-time Transit Information**: Uses Gemini 1.5 with Google Search grounding for accurate, up-to-date data
- **Bilingual Support**: All station names displayed as "中文 (日文)"
- **Automatic Fallback**: Switches from Flash to Pro model on quota/error
- **Simple & Direct**: No fluff, just structured transport data
- **Traditional Chinese Output**: Optimized for elderly Taiwanese users

## Architecture

- **Platform**: Google Apps Script (JavaScript)
- **Deployment**: Web App (Execute as Me, Access: Anyone)
- **APIs**:
  - LINE Messaging API (Reply Message)
  - Google Gemini API (gemini-1.5-flash-latest → gemini-1.5-pro-latest)

## Setup Instructions

### 1. Get API Credentials

#### LINE Messaging API
1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Create a new channel or use existing one
3. Go to "Messaging API" tab
4. Copy the **Channel Access Token**
5. Set webhook URL (you'll get this after deployment)

#### Google Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Deploy to Google Apps Script

#### Option A: Using Google Apps Script Editor (Recommended)

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project named "JP-Transit Bot"
3. Delete the default `Code.gs` content
4. Copy the contents of `Code.gs` from this repo
5. Create a new file `appsscript.json` and copy its contents from this repo
6. Go to **Project Settings** (gear icon)
7. Scroll to **Script Properties** and add:
   - `LINE_CHANNEL_ACCESS_TOKEN`: Your LINE token
   - `GEMINI_API_KEY`: Your Gemini API key

#### Option B: Using Clasp (Command Line)

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google
clasp login

# Create new project
clasp create --type webapp --title "JP-Transit Bot"

# Push code to Google Apps Script
clasp push

# Open in browser to configure
clasp open
```

Then configure Script Properties as described in Option A, step 7.

### 3. Deploy as Web App

1. In Google Apps Script, click **Deploy** → **New deployment**
2. Click **Select type** → **Web app**
3. Configure:
   - **Description**: "JP Transit Bot v1"
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. Copy the **Web App URL**

### 4. Configure LINE Webhook

1. Go back to [LINE Developers Console](https://developers.line.biz/console/)
2. Select your channel
3. Go to "Messaging API" tab
4. Paste the Web App URL into **Webhook URL**
5. Click **Verify** to test the connection
6. Enable **Use webhook**

## Usage

Simply send a message to your LINE Bot:

```
明日 09:00 東京到輕井澤
```

The bot will reply with:

```
【推薦班次】
* 路線名稱：北陸新幹線 - 淺間號 (あさま 605号)
* 出發時間：09:04 從 東京 (東京) 出發
* 抵達時間：10:16 到達 輕井澤 (軽井沢)
* 乘車月台：20-23 號新幹線月台
* 目的地：長野 (長野) 方向
```

## Testing

### Test Gemini API Integration

1. Open your Google Apps Script project
2. Uncomment the `testGemini()` function in [Code.gs](Code.gs)
3. Run the function
4. Check logs: **Execution log** to see the response

### Test LINE Webhook

Use LINE's webhook tester or send a test message from LINE app.

## Project Structure

```
jp-transit-bot/
├── Code.gs              # Main application logic
├── appsscript.json      # Apps Script manifest
├── .env.example         # Environment variables template
├── SPEC.md             # Technical specification
└── README.md           # This file
```

## Key Files

- [Code.gs](Code.gs) - Main webhook handler, Gemini API integration, LINE messaging
- [appsscript.json](appsscript.json) - Apps Script configuration (timezone: Asia/Tokyo)
- [SPEC.md](SPEC.md) - Detailed technical specification

## Error Handling

The bot includes robust error handling:

1. **Model Fallback**: Automatically switches from `gemini-1.5-flash-latest` to `gemini-1.5-pro-latest` if quota is exceeded (429) or errors occur (500)
2. **API Validation**: Checks for missing credentials in Script Properties
3. **Response Validation**: Verifies API responses before sending to LINE
4. **Logging**: All errors logged to Stackdriver for debugging

## System Instructions

The Gemini API is configured with strict instructions to:

- Output in Traditional Chinese only
- Format station names as "中文 (日文)"
- Use bullet-point formatting
- Include train name, times, platform, destination
- Provide factual data only (no weather warnings or small talk)

## Troubleshooting

### Webhook verification fails
- Ensure Web App is deployed with "Anyone" access
- Check that the correct URL is copied to LINE console
- Verify Script Properties are set correctly

### No response from bot
- Check Google Apps Script execution logs
- Verify `GEMINI_API_KEY` is valid
- Check if quota limits are reached

### Wrong language or format
- System instructions are enforced at temperature 0.0
- If issues persist, check the `SYSTEM_INSTRUCTION` constant in [Code.gs:8-28](Code.gs#L8-L28)

## API Quotas

- **Gemini 1.5 Flash**: Higher rate limits, faster responses
- **Gemini 1.5 Pro**: Fallback model, better quality but lower rate limits
- Monitor usage at [Google AI Studio](https://aistudio.google.com/)

## License

MIT

## Contributing

Feel free to submit issues and pull requests!

## Support

For issues related to:
- LINE API: [LINE Developers Documentation](https://developers.line.biz/en/docs/)
- Gemini API: [Google AI Documentation](https://ai.google.dev/docs)
- Google Apps Script: [Apps Script Documentation](https://developers.google.com/apps-script)
