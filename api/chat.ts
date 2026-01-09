import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'Missing input' });

    // Demo AI response — replace with OpenAI API call
    const aiResponse = `Echo: ${input}`;

    res.status(200).json({ text: aiResponse });
  } catch (err) {
    console.error('chat error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
