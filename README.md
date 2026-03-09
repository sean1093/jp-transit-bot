# JP-Transit Bot

A simple LINE Bot for querying Japanese transportation information. Powered by Google Apps Script and Gemini API with Google Search grounding to deliver real-time, accurate transit data in Traditional Chinese with bilingual station names.

## Features

- **Real-time Transit Information**: Uses Gemini 2.5 Flash with Google Search for accurate, up-to-date data
- **Bilingual Support**: All station names displayed as "中文 (日文)"
- **LINE Integration**: Quick and easy queries through LINE chat
- **Error Handling**: User-friendly error messages when quota is exceeded
- **Simple & Direct**: No fluff, just structured transport data

## Architecture

- **Platform**: Google Apps Script (JavaScript)
- **Deployment**: Web App (Execute as Me, Access: Anyone)
- **APIs**:
  - LINE Messaging API (Reply Message)
  - Google Gemini API 2.5 Flash

## Setup Instructions

### 1. Get API Credentials

#### LINE Messaging API
1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Create a new **Messaging API** channel (not LINE Login)
3. Go to "Messaging API" tab
4. Issue and copy the **Channel Access Token (long-lived)**
5. Note: This is different from Channel Secret

#### Google Gemini API
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Deploy to Google Apps Script

#### Option A: Using Clasp (Recommended for Development)

```bash
# Clone this repository
git clone https://github.com/sean1093/jp-transit-bot.git
cd jp-transit-bot

# Install clasp globally (if not installed)
npm install -g @google/clasp

# Login to Google
clasp login

# Create .clasp.json with your script ID
# Or use existing .clasp.json if you're the owner

# Push code to Google Apps Script
clasp push

# Open in browser to configure
# Visit: https://script.google.com/home/projects/YOUR_SCRIPT_ID/edit
```

Then configure Script Properties:
1. Click **Project Settings** (gear icon)
2. Scroll to **Script Properties**
3. Add properties:
   - `LINE_CHANNEL_ACCESS_TOKEN`: Your LINE channel access token
   - `GEMINI_API_KEY`: Your Gemini API key

#### Option B: Using Google Apps Script Editor

1. Go to [Google Apps Script](https://script.google.com/)
2. Create a new project named "JP-Transit Bot"
3. Delete the default `Code.gs` content
4. Copy the contents of [Code.gs](Code.gs) from this repo
5. Create a new file `appsscript.json` and copy its contents
6. Configure Script Properties as described in Option A

### 3. Deploy as Web App

1. In Google Apps Script, click **Deploy** → **Manage deployments**
2. Click the **Edit** icon (pencil) on @HEAD deployment
3. Configure:
   - **Execute as**: Me (your email)
   - **Who has access**: **Anyone** ⬅️ Important!
4. Click **Deploy**
5. Copy the **Web App URL** (format: `https://script.google.com/macros/s/.../exec`)

### 4. Configure LINE Webhook

1. Go back to [LINE Developers Console](https://developers.line.biz/console/)
2. Select your Messaging API channel
3. Go to "Messaging API" tab
4. In **Webhook settings**:
   - Paste the Web App URL into **Webhook URL**
   - Click **Update**
   - Click **Verify** (should show Success ✅)
   - Enable **Use webhook** toggle
5. **Important**: Disable **Auto-reply messages** to prevent duplicate responses

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

If API quota is exceeded or errors occur, the bot will reply:
```
今日使用已達上限
```

## Testing

### Test Gemini API Integration

1. Open your Google Apps Script project
2. Select the `testGemini` function from the dropdown
3. Click **Run** (▶️)
4. Check **Execution log** to see the response

### Test Deployment Health

Visit your Web App URL in a browser. You should see:
```json
{
  "status": "ok",
  "message": "JP-Transit Bot is running",
  "timestamp": "2026-03-09T..."
}
```

### Test LINE Integration

1. Add your bot as a LINE friend (scan QR code in Messaging API tab)
2. Send a test message
3. Check Apps Script **Executions** tab for logs if issues occur

## Project Structure

```
jp-transit-bot/
├── Code.gs              # Main application logic
├── appsscript.json      # Apps Script manifest
├── .clasp.json          # Clasp configuration (local only, not in git)
├── .claspignore         # Files to exclude from clasp push
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── SPEC.md             # Technical specification
└── README.md           # This file
```

## Key Files

- [Code.gs](Code.gs) - Main webhook handler, Gemini API integration, LINE messaging
  - `doPost(e)` - Webhook entry point
  - `doGet(e)` - Health check endpoint
  - `getGeminiResponse(text)` - Gemini API call with Google Search
  - `sendLineMessage(token, text)` - LINE reply API
  - `testGemini()` - Test function for development
- [appsscript.json](appsscript.json) - Apps Script configuration (timezone: Asia/Tokyo)
- [SPEC.md](SPEC.md) - Detailed technical specification

## Error Handling

The bot includes comprehensive error handling:

1. **Request Validation**: Checks for valid webhook payloads
2. **Error Messages**: Sends "今日使用已達上限" when API fails
3. **Always Returns 200**: Prevents LINE from retrying failed webhooks
4. **Detailed Logging**: All errors logged to Apps Script execution logs

## System Instructions

The Gemini API is configured with strict instructions:

- Output in Traditional Chinese only
- Format station names as "中文 (日文)"
- Use bullet-point formatting
- Include train name, times, platform, destination
- Provide factual data only (no weather warnings or small talk)
- Temperature set to 0.0 for consistency

## API Configuration

### Gemini 2.5 Flash
- **Model**: `gemini-2.5-flash`
- **Temperature**: 0.0 (factual responses)
- **Max Output Tokens**: 8192
- **Tools**: Google Search enabled

### Free Tier Quotas
- **Requests Per Minute (RPM)**: 15
- **Requests Per Day (RPD)**: 1,500
- **Tokens Per Minute (TPM)**: 1,000,000

For typical transit queries (~300-400 tokens), you can handle **~1,500 queries per day** on the free tier.

## Troubleshooting

### Webhook Returns 302 Error
- Ensure Web App deployment has **"Who has access: Anyone"**
- Use the correct URL format ending with `/exec`
- Redeploy by editing @HEAD deployment settings

### No Response from Bot
- Check **Executions** tab in Apps Script for errors
- Verify `GEMINI_API_KEY` and `LINE_CHANNEL_ACCESS_TOKEN` in Script Properties
- Ensure "Use webhook" is enabled in LINE console

### Bot Replies Twice
- Disable **Auto-reply messages** in LINE Messaging API settings

### Wrong Language or Format
- System instructions enforce Traditional Chinese at temperature 0.0
- Check `SYSTEM_INSTRUCTION` constant in [Code.gs:11-28](Code.gs#L11-L28)

### API Quota Exceeded
- Monitor usage at [Google AI Studio](https://aistudio.google.com/)
- Consider upgrading to pay-as-you-go for higher limits (~$0.30 per 1,000 queries)

## Development Workflow

1. **Make changes locally** to `Code.gs`
2. **Push to Apps Script**: `clasp push`
3. **Test**: Run `testGemini()` or send LINE message
4. **Commit**: `git add . && git commit -m "message" && git push`

Note: The deployment updates automatically when you push with clasp.

## Security

✅ **No API keys in code**: All credentials stored in Script Properties
✅ **No sensitive data in repository**: `.clasp.json` is gitignored
✅ **HTTPS only**: All API calls use secure connections

## License

MIT

## Contributing

Feel free to submit issues and pull requests!

## Support

For issues related to:
- LINE API: [LINE Developers Documentation](https://developers.line.biz/en/docs/)
- Gemini API: [Google AI Documentation](https://ai.google.dev/docs)
- Google Apps Script: [Apps Script Documentation](https://developers.google.com/apps-script)
