// server.js (ESM)

// ---------------- IMPORTS ----------------
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import express from 'express';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';

// ---------------- PATH SETUP ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- DOTENV (MUST BE HERE) ----------------
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// ---------------- DEBUG (TEMPORARY) ----------------
console.log('CWD:', process.cwd());
console.log('ENV PATH:', envPath);
console.log('ENV FILE EXISTS:', fs.existsSync(envPath));
console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY loaded on Vercel:', !!process.env.OPENAI_API_KEY);
// ---------------- APP SETUP ----------------
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname)); // serve index.html

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

// In-memory session store (MVP)
const sessions = {};

// ---------------- ROUTES ----------------

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Auth (cookie-only MVP)
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

// Chat
app.post('/api/chat', async (req, res) => {
  const { input } = req.body;
  const sessionId = req.cookies.sessionId;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!input) {
    return res.status(400).json({ error: 'Missing input' });
  }

  try {
    const openaiResp = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
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
      }
    );

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error('OpenAI error:', errText);
      return res.status(openaiResp.status).json({ error: 'OpenAI request failed' });
    }

    const data = await openaiResp.json();
    const text = data.choices?.[0]?.message?.content ?? 'No response';

    res.json({ text });
  } catch (err) {
    console.error('OpenAI API error:', err);
    res.status(500).json({ error: 'Server error contacting AI' });
  }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});