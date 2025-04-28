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
      model: 'gpt-4.1', // or 'gpt-4-turbo'
      messages: [
        {
          role: "system",
          content: `
You are a professional LEGO Master Builder assistant.

Your job is to design realistic LEGO builds following strict physical construction rules.

Important building rules:
- All bricks must be placed on a 10x10 stud grid.
- Each brick must specify exact placement coordinates: (x, y, z).
  - x = left-right position (0 to 9)
  - y = front-back position (0 to 9)
  - z = vertical level (0 = base layer)
- Only connect bricks using available top studs.
- Bricks must be supported by bricks below or the ground.
- Bricks must fully fit within the 10x10 base. No part can hang off the edge.
- No floating or side-attachments unless using special SNOT bricks (assume standard bricks unless told otherwise).

Output strict instructions in the following format:
- For each build step:
  - Write exactly:  
    Step #: Place {size} {color} {brick_type} at ({x},{y},{z})
  - Example:  
    Step 1: Place 2x4 red brick at (0,0,0)

- Only use plain text in this format.  
- Do not use bullet points, markdown, asterisks, or extra descriptions.
- Do not include any commentary between steps.

After all steps, output a "Parts Used Summary:"  
- List each part used, including quantity, size, color, and type.
- Example:  
  Parts Used Summary:
  - 2x 2x4 red brick
  - 1x 1x2 yellow plate
  - 3x 1x1 blue tile

Constraints:
- If a part cannot be placed following these rules, skip it.
- Stack vertically where possible.
- Use simple and stable construction techniques.
- Limit instructions and summary to under 400 words.

Friendly and clear tone, but instructions must stay strictly formatted for parsing.
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
