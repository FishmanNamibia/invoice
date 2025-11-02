# AI Chatbot Support System Guide

## Overview
Your Financial Management System now includes an AI-powered chatbot that can answer user questions about application features, provide step-by-step guidance, and direct users to support when needed.

## Features

### 🤖 AI Assistant Capabilities
- **Feature Explanations** - Explains how to use invoices, quotes, payments, customers, etc.
- **Step-by-Step Guidance** - Provides detailed instructions for common tasks
- **Navigation Help** - Guides users to the right sections of the application
- **Troubleshooting** - Helps resolve common issues
- **Support Handoff** - Directs complex issues to support email: info@invoice.dynaverseinvestment.com

### 🎨 User Interface
- **Floating Button** - Purple gradient button in bottom-right corner
- **Chat Window** - Modern, responsive chat interface (380px × 600px)
- **Quick Questions** - Pre-built questions for common queries
- **Conversation History** - Maintains context for up to 10 messages
- **Typing Indicator** - Shows when AI is thinking
- **Mobile Responsive** - Adapts to all screen sizes

## Setup Instructions

### Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-`)

### Step 2: Configure Environment Variable

Open your `.env` file and update the OpenAI API key:

```env
# OpenAI Configuration (for AI Chatbot)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important:** Replace `your_openai_api_key_here` with your actual API key.

### Step 3: Restart the Server

After adding the API key, restart your development server:

```bash
# Stop the current server (Ctrl+C) and restart
npm run dev
```

Or if running separately:
```bash
npm run server
```

### Step 4: Test the Chatbot

1. Navigate to any page in your application
2. Look for the purple floating button in the bottom-right corner
3. Click to open the chat window
4. Try asking: "How do I create an invoice?"

## Usage Examples

### Sample Questions Users Can Ask

**Invoice Management:**
- "How do I create an invoice?"
- "How can I generate a PDF of my invoice?"
- "How do I edit an existing invoice?"

**Customer Management:**
- "How do I add a new customer?"
- "Where can I view all my customers?"
- "How do I update customer information?"

**Payments:**
- "How do I record a payment?"
- "Where can I track payments?"
- "How do I link a payment to an invoice?"

**Settings:**
- "How do I set up my bank account details?"
- "How do I enable two-factor authentication?"
- "Where do I update my company information?"

**Security:**
- "How do I reset my password?"
- "How do I enable 2FA?"
- "Is my data secure?"

### Quick Questions
The chatbot provides 4 quick-start questions when you first open it:
1. How do I create an invoice?
2. How do I add a new customer?
3. How do I set up bank details?
4. How do I enable 2FA?

## Technical Details

### Backend API

**Endpoint:** `/api/chatbot/message`
- **Method:** POST
- **Body:**
  ```json
  {
    "message": "How do I create an invoice?",
    "conversationHistory": []
  }
  ```
- **Response:**
  ```json
  {
    "reply": "To create an invoice...",
    "supportEmail": "info@invoice.dynaverseinvestment.com"
  }
  ```

**Health Check:** `/api/chatbot/health`
- **Method:** GET
- **Response:**
  ```json
  {
    "available": true,
    "message": "Chatbot service is available"
  }
  ```

### Frontend Component

**Location:** `/client/src/components/ChatBot.js`

**Features:**
- Automatic availability check on mount
- Conversation history management (last 10 messages)
- Error handling with fallback to support email
- Responsive design for all devices
- Accessibility features

### AI Model Configuration

**Model:** GPT-3.5 Turbo
**Temperature:** 0.7 (balanced creativity)
**Max Tokens:** 500 (concise responses)
**Context:** Custom system prompt with application knowledge

## Customization

### Update Application Knowledge

Edit `/server/routes/chatbot.js` and modify the `SYSTEM_CONTEXT` variable to:
- Add new features
- Update feature descriptions
- Change support email
- Modify response tone/style

### Update UI Appearance

Edit `/client/src/components/ChatBot.css` to customize:
- Colors and gradients
- Button size and position
- Chat window dimensions
- Font styles and sizes

### Add More Quick Questions

Edit `/client/src/components/ChatBot.js` and modify the `quickQuestions` array:

```javascript
const quickQuestions = [
  "Your custom question 1",
  "Your custom question 2",
  "Your custom question 3",
  "Your custom question 4"
];
```

## Cost Management

### OpenAI API Pricing (as of 2025)
- **GPT-3.5 Turbo:** ~$0.002 per 1K tokens
- **Average conversation:** 200-500 tokens per exchange
- **Estimated cost:** $0.0004 - $0.001 per user interaction

### Usage Tips
1. Set up billing limits in your OpenAI account
2. Monitor usage in OpenAI dashboard
3. Consider implementing rate limiting for high-traffic sites
4. Use conversation history limit (currently 10 messages)

## Troubleshooting

### Chatbot Button Not Appearing
- Check if `OPENAI_API_KEY` is set in `.env`
- The chatbot only shows if API key is configured
- Check browser console for errors

### "Service Not Configured" Error
- Verify API key is added to `.env`
- Restart the server after adding the key
- Check the key starts with `sk-`

### API Rate Limit Errors
- Check your OpenAI account quota
- Add billing method to your OpenAI account
- Implement rate limiting in your application

### Slow Responses
- Normal response time: 2-5 seconds
- Check your internet connection
- Verify OpenAI service status

## Security Considerations

1. **API Key Protection**
   - Never commit `.env` file to version control
   - Keep your OpenAI API key secret
   - Rotate keys periodically

2. **Rate Limiting** (Optional Enhancement)
   - Consider adding rate limiting per user
   - Prevent abuse of the chatbot service

3. **Input Validation**
   - Backend validates all user inputs
   - Prevents injection attacks
   - Sanitizes conversation history

## Future Enhancements

Consider adding:
1. **User Authentication** - Track conversations per user
2. **Analytics** - Monitor most asked questions
3. **Feedback System** - Let users rate responses
4. **Multi-language Support** - Detect and respond in user's language
5. **File Attachments** - Help users with screenshots
6. **Voice Input** - Speech-to-text integration

## Support

If users encounter issues with the chatbot, they are automatically directed to:
- **Email:** info@invoice.dynaverseinvestment.com
- **Support Hours:** As per your support policy

## Files Modified/Created

### Backend
- ✅ `/server/routes/chatbot.js` - AI chatbot API routes
- ✅ `/server/index.js` - Registered chatbot routes

### Frontend
- ✅ `/client/src/components/ChatBot.js` - Main chatbot component
- ✅ `/client/src/components/ChatBot.css` - Chatbot styling
- ✅ `/client/src/App.js` - Integrated chatbot into app

### Configuration
- ✅ `/.env` - Added OPENAI_API_KEY configuration
- ✅ `/package.json` - Added openai dependency

## Testing Checklist

- [ ] API key configured in `.env`
- [ ] Server restarted after configuration
- [ ] Chatbot button appears in bottom-right corner
- [ ] Chat window opens on button click
- [ ] Quick questions work correctly
- [ ] Custom questions receive appropriate responses
- [ ] Typing indicator shows during API calls
- [ ] Error handling works when API key is invalid
- [ ] Support email is displayed in footer
- [ ] Mobile responsive design works correctly
- [ ] Conversation history is maintained
- [ ] Chat window closes properly

---

**Status:** ✅ Chatbot is fully implemented and ready to use after API key configuration

**Last Updated:** November 2, 2025

