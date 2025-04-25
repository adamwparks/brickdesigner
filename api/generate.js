import { OpenAI } from 'openai';
import { config } from 'dotenv';

config(); // Loads environment variables from .env (only needed locally, Vercel uses dashboard vars)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Vercel expects this exact signature for API routes:
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { partsList, theme } = req.body;

  if (!partsList) {
    return res.status(400).json({ error: 'Parts list is required' });
  }

  const userPrompt = `
Parts List:
${partsList}

Theme: ${theme || "No specific theme"}

Please suggest 1–3 LEGO build ideas based on the above, and provide step-by-step assembly instructions for one build.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4-turbo'
      messages: [
        {
          role: "system",
          content: `
You are a LEGO Master Builder assistant. 
Given a parts list and optional theme, suggest creative builds achievable with the parts provided. 
Provide clear, easy-to-follow, numbered step-by-step assembly instructions. 
Keep instructions under 400 words. 
Include a "Parts Used Summary."
Friendly tone, imaginative but feasible.
`
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7
    });

    res.status(200).json({ result: completion.choices[0].message.content });

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate build instructions' });
  }
}
