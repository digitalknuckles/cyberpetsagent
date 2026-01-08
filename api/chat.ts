import { OpenAIStream, OpenAIStreamPayload } from "./utils/OpenAIStream"; // helper for streaming OpenAI responses

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  // ----------------- CORS preflight -----------------
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "https://digitalknuckles.github.io",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // ----------------- verify session cookie -----------------
    const cookie = req.headers.get("cookie") || "";
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (!sessionMatch) {
      return new Response("Unauthorized: no session", { status: 401 });
    }
    const sessionId = sessionMatch[1];

    // TODO: optionally verify sessionId server-side (lookup DB or in-memory store)
    // For simplicity, assume valid if present

    const { input, context } = await req.json();

    if (!input) {
      return new Response("Bad Request: missing input", { status: 400 });
    }

    // ----------------- build OpenAI payload -----------------
    const payload: OpenAIStreamPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for NFT-gated users. Context: ${JSON.stringify(
            context || {}
          )}`,
        },
        { role: "user", content: input },
      ],
      temperature: 0.7,
      stream: true,
    };

    // ----------------- create streaming response -----------------
    const stream = await OpenAIStream(payload);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "https://digitalknuckles.github.io",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "https://digitalknuckles.github.io",
      },
    });
  }
}
