// server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch'; // Node 18+ can use global fetch
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static('.')); // serve index.html and any static assets






const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

// Simple in-memory session store
const sessions = {};

// --- Serve index.html ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- /api/auth ---
app.post('/api/auth', (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Missing wallet address' });


  const sessionId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  sessions[sessionId] = { address };

  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ sessionId });
});

// --- /api/chat ---
app.post('/api/chat', async (req, res) => {
  const { input } = req.body;
  const sessionId = req.cookies.sessionId;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized — invalid session' });
  }

  if (!input) return res.status(400).json({ error: 'Missing input' });

  try {
    // Use non-streaming OpenAI call for Node
    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: input }],
        max_tokens: 300,
      }),
    });

    if (!openaiResp.ok) {
      return res.status(openaiResp.status).json({ error: 'OpenAI request failed' });
    }

    const data = await openaiResp.json();
    const text = data.choices?.[0]?.message?.content || 'No response from AI';

    res.json({ text });
  } catch (err) {
    console.error('OpenAI API error:', err);
    res.status(500).json({ error: 'Server error contacting AI' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});