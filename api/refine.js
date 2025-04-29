import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use your Vercel environment variable
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { buildSteps, rejectedBricks } = req.body;

  if (!buildSteps || !rejectedBricks || !Array.isArray(rejectedBricks)) {
    return res.status(400).json({ error: 'Missing buildSteps or rejectedBricks in request.' });
  }

  try {
    // Build the feedback prompt
    let feedbackPrompt = `
You previously generated this LEGO build:

${buildSteps.trim()}

However, the following steps were rejected during simulation because they lacked sufficient support or were floating:

`;

    for (const brick of rejectedBricks) {
      feedbackPrompt += `- Step ${brick.step}: ${brick.size} ${brick.color} brick at (${brick.x},${brick.y},${brick.z}), facing ${brick.orientation} — ${brick.reason}\n`;
    }

    feedbackPrompt += `
Please regenerate the build:
- Keep the successfully placed bricks if possible
- Replace or reposition the failed bricks with supported placements
- Ensure every new placement is properly supported by at least one occupied stud underneath
- Only use these part types: 2x4, 1x2, 4x4, 2x6, 1x4
- Stay within a 10x10 grid (x: 0–9, y: 0–9)
- Maintain simple Step-by-Step format:
Step 1: Place {size} {color} brick at (x,y,z), facing {direction}
...
Parts Used Summary:
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Use latest model
      messages: [
        {
          role: 'system',
          content: feedbackPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const refinedText = completion.choices[0]?.message?.content;

    return res.status(200).json({ result: refinedText });
  } catch (error) {
    console.error('OpenAI API error (refine):', error);
    return res.status(500).json({ error: 'Failed to refine build.' });
  }
};