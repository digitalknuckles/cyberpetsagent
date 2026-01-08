import { ethers } from "ethers";

export const config = {
  runtime: "edge",
};

const SESSIONS = new Map<string, string>(); // sessionId -> address (in-memory, ephemeral)

function generateSessionId() {
  return crypto.randomUUID();
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://digitalknuckles.github.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { address, signature, nonce } = await req.json();

    if (!address) return new Response("Missing address", { status: 400 });

    // First step: if no signature provided, generate a nonce and return it
    if (!signature) {
      const newNonce = `auth:${Date.now()}:${Math.floor(Math.random() * 999999)}`;
      return new Response(JSON.stringify({ nonce: newNonce }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://digitalknuckles.github.io",
        },
      });
    }

    // Verify signature
    if (!nonce) return new Response("Missing nonce", { status: 400 });

    const signerAddr = ethers.verifyMessage(nonce, signature).toLowerCase();
    if (signerAddr !== address.toLowerCase()) {
      return new Response("Signature mismatch", { status: 401 });
    }

    // ✅ Signature valid, create session
    const sessionId = generateSessionId();
    SESSIONS.set(sessionId, address.toLowerCase());

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Set-Cookie": `session=${sessionId}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax`,
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://digitalknuckles.github.io",
      },
    });
  } catch (err) {
    console.error("Auth API error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "https://digitalknuckles.github.io",
      },
    });
  }
}
