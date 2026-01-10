// /api/auth.js
import { randomBytes } from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Missing wallet address' });

    // Generate simple session ID
    const sessionId = `sess_${randomBytes(12).toString('hex')}_${Date.now()}`;
    res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=${24*60*60}; SameSite=Strict`);
    return res.status(200).json({ sessionId });
  } catch (err) {
    console.error('auth error', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
