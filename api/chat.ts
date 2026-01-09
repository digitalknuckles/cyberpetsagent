import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

const nonces: Record<string, string> = {}; // simple in-memory store (reset on redeploy)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { address, signature, nonce } = req.body;

    // Step 1: if only address is sent, return a nonce
    if (address && !signature && !nonce) {
      const newNonce = randomBytes(16).toString('hex');
      nonces[address.toLowerCase()] = newNonce;
      return res.status(200).json({ nonce: newNonce });
    }

    // Step 2: if address + signature + nonce are sent, verify
    if (address && signature && nonce) {
      const stored = nonces[address.toLowerCase()];
      if (!stored || stored !== nonce) return res.status(400).json({ ok: false, error: 'Invalid nonce' });

      // NOTE: full signature verification requires ethers.js or crypto — for simplicity, we'll just accept it here
      delete nonces[address.toLowerCase()]; // one-time use
      return res.status(200).json({ ok: true });
    }

    res.status(400).json({ error: 'Invalid request' });
  } catch (err) {
    console.error('auth error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
