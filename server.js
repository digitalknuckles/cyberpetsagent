const express = require("express");
const fetch = require("node-fetch");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(cookieParser());

// ─────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

if (!OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY is not set");
}

// ─────────────────────────────────────────────
// SESSION (COOKIE-ONLY)
// ─────────────────────────────────────────────
app.post("/api/session", (req, res) => {
  const sessionId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  res.cookie("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24h
  });

  res.json({ ok: true });
});

// ─────────────────────────────────────────────
// STREAMING CHAT ENDPOINT
// ─────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  if (!req.cookies.session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ error: "Missing input" });
  }

  try {
    const openaiResp = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: input }],
          temperature: 0.7,
          stream: true,
        }),
      }
    );

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      console.error("OpenAI error:", errText);
      return res.status(500).json({ error: "OpenAI request failed" });
    }

    // IMPORTANT: streaming for fetch(), NOT SSE
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");

    const reader = openaiResp.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // OpenAI streams "data: {...}" lines
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        if (line.includes("[DONE]")) continue;

        try {
          const json = JSON.parse(line.replace("data:", "").trim());
          const token = json.choices?.[0]?.delta?.content;
          if (token) res.write(token);
        } catch {
          // ignore malformed chunks
        }
      }
    }

    res.end();
  } catch (err) {
    console.error("Chat streaming error:", err);
    res.status(500).end();
  }
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
