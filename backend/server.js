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

    // 3. Fetch all content items AND categories for context
    const { data: contentItems } = await supabase
      .from('ContentItem')
      .select('*, Category(name)')
      .eq('userId', recipient.userId);
    
    const { data: categories } = await supabase
      .from('Category')
      .select('*')
      .eq('userId', recipient.userId);

    // 4. Find relevant content based on keywords
    const lowerMessage = messageBody.toLowerCase();
    const messageWords = lowerMessage.split(/\s+/).filter(w => w.length > 2);
    
    // Search ContentItems
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

    // Also search Category names and descriptions (in case info is stored there)
    const relevantCategories = (categories || []).filter(cat => {
      const nameMatch = cat.name && lowerMessage.includes(cat.name.toLowerCase().trim());
      const descMatch = cat.description && messageWords.some(word => 
        cat.description.toLowerCase().includes(word)
      );
      return nameMatch || descMatch;
    });

    const allCategories = [...new Set((categories || []).map(c => c.name).filter(Boolean))];

    // 5. Build context for ChatGPT - STRICT MODE
    let systemPrompt;
    
    // Combine content from both ContentItems and Categories
    const hasContent = relevantContent.length > 0 || relevantCategories.length > 0;
    
    if (hasContent) {
      // We found matching content - use ONLY this information
      let contextText = '';
      
      if (relevantContent.length > 0) {
        contextText += relevantContent.map(item => 
          `• ${item.title}: ${item.description}`
        ).join("\n");
      }
      
      if (relevantCategories.length > 0) {
        if (contextText) contextText += "\n";
        contextText += relevantCategories.map(cat => 
          `• ${cat.name}: ${cat.description}`
        ).join("\n");
      }
      
      systemPrompt = `You are a helpful Guardian assistant. ${toneGuidance}

IMPORTANT: You MUST only use the information provided below. Do NOT make up, guess, or invent any details like passwords, names, codes, or numbers.

VERIFIED INFORMATION FROM DATABASE:
${contextText}

Respond naturally using ONLY the verified information above. Keep it brief - this is SMS.`;
    } else {
      // No matching content found - let ChatGPT help naturally
      systemPrompt = `You are a helpful Guardian assistant. ${toneGuidance}

The user is asking about something that doesn't have specific stored information in the family database.

Available categories in the family database: ${allCategories.join(', ') || 'None yet'}

You CAN answer general questions helpfully using your knowledge. Be conversational and helpful!

However, if they ask for SPECIFIC personal info (like passwords, codes, addresses, phone numbers) that you don't have, kindly let them know that info isn't stored yet and suggest they ask a family member to add it.

Keep responses brief and friendly - this is SMS.`;
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
