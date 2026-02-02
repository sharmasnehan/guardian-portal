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
    const messageWords = lowerMessage.split(/\s+/).filter(w => w.length > 2);
    
    const relevantContent = (contentItems || []).filter(item => {
      const titleMatch = item.title && lowerMessage.includes(item.title.toLowerCase());
      const keywordMatch = item.keywords && item.keywords.some(kw => 
        lowerMessage.includes(kw.toLowerCase()) || 
        messageWords.some(word => kw.toLowerCase().includes(word))
      );
      const descriptionMatch = item.description && messageWords.some(word => 
        item.description.toLowerCase().includes(word)
      );
      return titleMatch || keywordMatch || descriptionMatch;
    });

    const allCategories = [...new Set((contentItems || []).map(i => i.Category?.name).filter(Boolean))];

    // 5. Build context for ChatGPT - STRICT MODE
    let systemPrompt;
    
    if (relevantContent.length > 0) {
      // We found matching content - use ONLY this information
      const contextText = relevantContent.map(item => 
        `• ${item.title}: ${item.description}`
      ).join("\n");
      
      systemPrompt = `You are a helpful Guardian assistant. ${toneGuidance}

IMPORTANT: You MUST only use the information provided below. Do NOT make up, guess, or invent any details like passwords, names, codes, or numbers.

VERIFIED INFORMATION FROM DATABASE:
${contextText}

Respond naturally using ONLY the verified information above. Keep it brief - this is SMS.`;
    } else {
      // No matching content found - be honest
      systemPrompt = `You are a helpful Guardian assistant. ${toneGuidance}

IMPORTANT: The user is asking about something that is NOT in the database. 

Available categories in the system: ${allCategories.join(', ') || 'None yet'}

You MUST NOT make up or guess any specific information like passwords, codes, names, or numbers.

Instead, politely tell them:
1. You don't have that specific information stored
2. Suggest they ask a family member or caregiver to add it to the system
3. If relevant, mention what categories ARE available

Keep it brief and friendly - this is SMS.`;
    }

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
