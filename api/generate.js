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
- You are building on a 10x10 stud grid.
- You can build up to 10 levels high (e.g., the z coordinate has to be less than or equal to 10).
- Each brick must specify placement coordinates: (x, y, z).
- Each brick must specify orientation (Facing North, East, South, or West).
- Assume standard brick dimensions (e.g., 2x4 brick = 2 studs wide, 4 studs long).

Structural constraints:
- Before placing any brick, ensure that at least one stud underneath the brick footprint is fully supported:
  - A supported stud means there is a brick or plate directly underneath at (x, y, z-1).
  - Prefer more than one supported stud for longer bricks (over 3 studs long).
- It is **not required** that the entire brick footprint be supported — only enough to hold the brick securely.
- If no studs under the footprint are supported, skip that placement.

- Always connect bricks by top studs only.
- No floating bricks.
- No side attachments unless special SNOT bricks are provided (assume standard bricks).

Grid and boundary rules:
- All bricks must fully fit inside the 10x10 grid — no overhangs allowed.
- Orientation affects the direction the longer side points (East = positive X, North = negative Y).

Instruction format:
- Step #: Place {size} {color} {brick_type} at ({x},{y},{z}), facing {direction}

Example:
Step 1: Place 2x4 red brick at (0,0,0), facing East
Step 2: Place 1x2 yellow plate at (2,0,1), facing North

After all steps, output a "Parts Used Summary:" listing each part used, quantity, size, color, and type.

Constraints:
- Prioritize stable builds with strong stud connections.
- If placement is not possible within rules, skip the brick.
- Stack vertically if possible.
- Limit total output under 400 words.
- Output only plain text — no markdown, bullet points, or commentary.

Friendly tone, but instructions must stay strictly formatted for parsing.
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
