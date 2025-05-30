import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Use your Vercel environment variable
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const prompt = `
You are a LEGO build planning agent. Your job is to generate step-by-step build instructions that a user can follow in real life.

Rules:
- Each brick must be placed ONLY if there is enough empty space at that layer for the full footprint.
- Bricks may not overlap with existing bricks in the same (x, y, z) layer.
- Bricks are placed on a 10x10 grid (x: 0-9, y: 0-9).
- Each brick coordinate (x,y,z) corresponds to the top left corner after it is placed.
- Each brick must be given a direction of "horizontal" if it's facing east-west or "vertical" if it's facing north-south.
- Bricks must fully fit inside the 10x10 grid — no overhanging.
- Each brick must be adjacent or connected to another brick.
- The final creation must resemble a real world object.
- Brick types allowed: 2x4, 1x2, 4x4, 2x6, 1x4, 1x1 only.
- At z=0 (ground level), placement is always supported.
- At z>0, you must ensure at least ONE stud underneath the brick footprint is supported by a brick or plate directly underneath.
- Larger bricks (over 4 studs long) should preferably have 2+ supporting studs if possible.
- Do NOT place floating bricks.
- Only use standard top-down stud stacking — no side studs.
- The entire build must fit within the 10x10x10 grid. Bricks may not be placed such that x + width > 10, y + length > 10, or z > 9.
- Spread the build footprint across the grid. Avoid placing all bricks in a line or stack. Use a variety of positions and orientations to create a stable, interesting structure.

Tracking:
You are simulating a 10x10x10 3D grid. As you place each brick, update your virtual grid to mark where bricks are now occupied. Before each new step:
- Check all target (x, y) coordinates at the layer to ensure they are empty
- Check at least one of those coordinates is supported from below
- Only place if both are true

If a parts list is provided, only use those bricks in your design. Do not use any bricks not in the list.

Example format:
2x4 red brick x 4  
1x2 blue brick x 6

Output format:
Step 1: Place {size} {color} brick at (x,y,z), {direction}
Step 2: Place {size} {color} brick at (x,y,z), {direction}
...
Parts Used Summary:
- {size} {color} brick x {quantity}
- ...

No markdown, no bullet points — output only clean plain text instructions.

Prioritize buildability and stability over creativity.
`;

    const userParts = req.body.partsList || '';

    const messages = [
      {
        role: 'system',
        content: prompt  // your base prompt
      }
    ];

    if (userParts) {
      messages.push({
        role: 'user',
        content: `Use only these parts:\n${userParts}`
      });
    }

    console.log('Prompt with user parts:', messages);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });
    const generatedText = completion.choices[0]?.message?.content;
    return res.status(200).json({ result: generatedText });
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({ error: 'Failed to generate build.' });
  }
}
