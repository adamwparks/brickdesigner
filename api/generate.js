import { OpenAI } from 'openai';

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

Please suggest 1-3 LEGO build ideas based on the above, and provide step-by-step assembly instructions for one build.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-4-turbo'
      messages: [
        {
          role: "system",
          content: `
You are a professional LEGO Master Builder assistant.

Important building rules:
- Only connect LEGO bricks using their top studs (the raised bumps).
- Do not attach standard bricks to smooth sides unless using special side-stud (SNOT) bricks. Assume only regular bricks unless told otherwise.
- Plates are thinner than bricks: 3 stacked plates = 1 brick tall.
- Respect gravity: bricks must be supported from below unless using hinges or angled connectors.
- Standard building direction is stacking vertically upwards.
- Assume users have only the parts listed — no invisible extra pieces.

Your task:
- Given a parts list and an optional theme, suggest 1-3 creative build ideas achievable with the parts provided.
- Pick one idea and write clear, step-by-step assembly instructions.
- Keep instructions physically possible according to the rules above.
- Write instructions clearly, simply, and under 400 words.
- Include a "Parts Used Summary" listing each piece and how it is used.
- Be imaginative and friendly, but prioritize realistic builds over fantasy builds.

Always think like a real LEGO engineer designing a build for real-world construction.

Keep instructions under 40 words times the number of pieces provided in the prompt. 
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
