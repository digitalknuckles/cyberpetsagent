import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  runtime: "edge", // REQUIRED for streaming
};

export default async function handler(req: NextApiRequest) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { input } = await req.json();

  if (!input || typeof input !== "string") {
    return new Response("Invalid input", { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OpenAI API key", { status: 500 });
  }

  const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are Cyberpets AI, an NFT-gated assistant for Polygon NFT holders.",
        },
        { role: "user", content: input },
      ],
    }),
  });

  if (!openaiResp.ok || !openaiResp.body) {
    return new Response("OpenAI request failed", { status: 500 });
  }

  return new Response(openaiResp.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
