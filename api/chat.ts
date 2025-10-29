export const config = {
  runtime: "edge",
};

export default async function handler(req: Request) {
  // ✅ Handle CORS preflight (fixes 405 + CORS)
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
    const { messages } = await req.json();

    // ✅ Streaming response proof-of-life (replace with OpenAI later)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("✅ Streaming active...\n"));
        setTimeout(() => controller.close(), 500);
      },
    });

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
