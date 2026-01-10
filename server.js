const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Load env
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- /api/auth route (cookie-only, simplified) ---
app.post('/api/auth', (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing wallet address' });

  // Generate simple session ID
  const sessionId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ sessionId });
});

// --- Helper: stream OpenAI response ---
async function streamOpenAIResponse(prompt, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!openaiResp.ok) {
    res.write(`data: Error contacting OpenAI: ${openaiResp.status}\n\n`);
    res.end();
    return;
  }

  const reader = openaiResp.body.getReader();
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
}

// --- /api/chat route ---
app.post('/api/chat', async (req, res) => {
  const { input, sessionId } = req.body;

  // Validate session cookie
  if (!sessionId || sessionId !== req.cookies.sessionId) {
    return res.status(401).json({ error: 'Unauthorized — invalid session' });
  }
  if (!input) return res.status(400).json({ error: 'Missing input' });

  try {
    await streamOpenAIResponse(input, res);
  } catch (e) {
    console.error('Streaming failed', e);
    res.status(500).json({ error: 'Server error streaming AI response' });
  }
});

// Serve static assets if any (optional)
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));