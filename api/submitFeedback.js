import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { feedbackType, comment, buildInstructions } = req.body;

  if (!feedbackType || !buildInstructions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { error } = await supabase.from('feedback').insert([
    {
      feedback_type: feedbackType,
      comment,
      build_instructions: buildInstructions
    }
  ]);

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }

  res.status(200).json({ success: true });
}
