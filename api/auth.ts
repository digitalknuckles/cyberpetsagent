export const config = {
  runtime: 'nodejs', // instead of 'edge'
};
interface AuthRequest {
  address: string;
  signature?: string;
  nonce?: string;
}

const NONCE_STORE: Record<string, string> = {}; // simple in-memory store for demo; ephemeral

// minimal ethers utils using ESM-compatible functions
import { verifyMessage } from "https://cdn.jsdelivr.net/npm/ethers@6.9.2/dist/ethers.min.js";

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { address, signature, nonce } = (await req.json()) as AuthRequest;
    const lowerAddr = address.toLowerCase();

    // Step 1: no signature → generate nonce
    if (!signature) {
      const newNonce = Math.floor(Math.random() * 1e16).toString();
      NONCE_STORE[lowerAddr] = newNonce;
      return new Response(JSON.stringify({ nonce: newNonce }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Step 2: signature verification
    if (!nonce || !NONCE_STORE[lowerAddr] || NONCE_STORE[lowerAddr] !== nonce) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid nonce" }), { status: 400 });
    }

    const signerAddress = verifyMessage(nonce, signature);
    if (signerAddress.toLowerCase() !== lowerAddr) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), { status: 400 });
    }

    // ✅ Auth successful, delete nonce (one-time use)
    delete NONCE_STORE[lowerAddr];

    // For simplicity, just return ok; in prod, set a cookie or JWT
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Auth error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
