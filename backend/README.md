# Guardian Portal Backend

This server handles incoming SMS messages via Twilio and responds using ChatGPT with your Supabase content.

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create environment file

Create a `.env` file in the `/backend` folder with:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Server
PORT=3001
```

### 3. Run locally

```bash
npm run dev
```

### 4. Expose to internet (for Twilio webhook)

Use ngrok to create a public URL:

```bash
ngrok http 3001
```

Copy the `https://xxx.ngrok.io` URL.

### 5. Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click your phone number
4. Under **Messaging Configuration**:
   - Set "A message comes in" webhook to: `https://your-ngrok-url.ngrok.io/sms`
   - Method: `POST`
5. Save

## Deploy to Production

For production, deploy to one of these platforms:

### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Render
1. Push to GitHub
2. Connect repo at [render.com](https://render.com)
3. Set environment variables in dashboard

### Vercel
```bash
npm install -g vercel
vercel
```

After deploying, update your Twilio webhook URL to your production URL.

## How It Works

1. **SMS received** → Twilio sends webhook to `/sms`
2. **Verify sender** → Check if phone number is in RecipientProfile
3. **Fetch content** → Get ContentItems from Supabase
4. **Match keywords** → Find relevant content based on message
5. **Generate response** → ChatGPT creates reply using content + tone guidance
6. **Log conversation** → Save to Conversation table
7. **Send reply** → Return TwiML response to Twilio
