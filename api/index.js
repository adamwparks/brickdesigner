import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { OpenAI } from 'openai';

config(); // Load .env file

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// API endpoint for frontend to call
app.post('/generate', async (req, res) => {
  const { partsList, theme } = req.body;

  const userPrompt = `
Parts List:
${partsList}

Theme: ${theme || "No specific theme"}

Please suggest 1–3 LEGO build ideas based on the above, and provide step-by-step assembly instructions for one build.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Or gpt-4-turbo if you prefer
      messages: [
        {
          role: "system",
          content: `
You are a LEGO Master Builder assistant. 
Given a parts list and optional theme, suggest creative builds achievable with the parts provided. 
Provide clear, easy-to-follow, numbered step-by-step assembly instructions. 
Keep instructions under 400 words. 
Include a "Parts Used Summary." Be imaginative but stay feasible. Friendly tone.
`
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong generating the build instructions.');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
