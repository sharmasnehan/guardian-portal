import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true })); // Twilio sends form-encoded data
app.use(express.json());

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Guardian Portal Backend is running!' });
});

// Twilio webhook - receives incoming SMS
app.post('/sms', async (req, res) => {
  const { From: fromNumber, Body: messageBody } = req.body;
  
  console.log(`📱 Incoming SMS from ${fromNumber}: ${messageBody}`);

  try {
    // 1. Check if sender is a registered recipient
    const { data: recipient } = await supabase
      .from('RecipientProfile')
      .select('*, CaregiverProfile(*)')
      .eq('phoneNumber', fromNumber)
      .single();

    if (!recipient) {
      console.log('Unknown sender, ignoring message');
      return res.status(200).send('<Response></Response>');
    }

    // 2. Get caregiver's tone guidance
    const toneGuidance = recipient.CaregiverProfile?.toneGuidance || 
      'Be helpful, warm, and patient. Use simple language.';

    // 3. Fetch all content items for context
    const { data: contentItems } = await supabase
      .from('ContentItem')
      .select('*, Category(name)')
      .eq('userId', recipient.userId);

    // 4. Find relevant content based on keywords
    const lowerMessage = messageBody.toLowerCase();
    const relevantContent = (contentItems || []).filter(item => 
      lowerMessage.includes(item.title.toLowerCase()) ||
      (item.keywords && item.keywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) ||
      (item.description && item.description.toLowerCase().split(' ').some(word => 
        lowerMessage.includes(word) && word.length > 3
      ))
    );

    // 5. Build context for ChatGPT
    const contextText = relevantContent.length > 0
      ? "RELEVANT INFORMATION:\n" + relevantContent.map(item => 
          `- ${item.title} (${item.Category?.name || 'General'}): ${item.description || 'No details'}`
        ).join("\n")
      : "No specific information found in the database for this query.";

    const allCategories = [...new Set((contentItems || []).map(i => i.Category?.name).filter(Boolean))];

    const systemPrompt = `You are a helpful Guardian assistant. ${toneGuidance}

Available information categories: ${allCategories.join(', ') || 'None set up yet'}

${contextText}

Keep responses concise and friendly - this is an SMS conversation. If you don't have specific information, say so kindly and suggest they contact a family member.`;

    // 6. Generate response with ChatGPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messageBody }
      ],
      max_tokens: 300 // Keep SMS responses short
    });

    const aiResponse = completion.choices[0]?.message?.content || 
      "I'm sorry, I couldn't generate a response. Please try again.";

    console.log(`🤖 AI Response: ${aiResponse}`);

    // 7. Log conversation to database
    await supabase.from('Conversation').insert({
      id: crypto.randomUUID(),
      recipientId: recipient.id,
      userId: recipient.userId,
      phoneNumber: fromNumber,
      incomingMessage: messageBody,
      response: aiResponse,
      contentSent: relevantContent.map(c => c.title)
    });

    // 8. Send TwiML response (Twilio will send this as SMS reply)
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(aiResponse);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('Error processing SMS:', error);
    
    // Send a friendly error message
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("I'm having trouble right now. Please try again in a moment.");
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Guardian Portal Backend running on port ${PORT}`);
  console.log(`📱 Twilio webhook URL: http://localhost:${PORT}/sms`);
});
