// /api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = { error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | any>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { input } = req.body;

    // ✅ Simple cookie auth check
    const { sessionId } = req.cookies;
    if (!sessionId) return res.status(401).json({ error: 'Unauthorized — missing session' });

    if (!input) return res.status(400).json({ error: 'Missing input' });

    // Streaming response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use built-in fetch (Node 18+ / Vercel runtime)
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: input }],
        stream: true
      })
    });

    if (!openaiResp.ok) {
      res.write(`data: Error contacting OpenAI: ${openaiResp.status}\n\n`);
      res.end();
      return;
    }

    const reader = openaiResp.body?.getReader();
    if (!reader) {
      res.write(`data: No readable body from OpenAI\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('data: [DONE]')) {
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace(/^data: /, '');
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices[0].delta?.content;
              if (content) res.write(`data: ${content}\n\n`);
            } catch (e) {
              console.warn('JSON parse error', e);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('chat.ts error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
