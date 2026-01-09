import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Cookie-only session bootstrap
 * No wallet signing, no nonces, no crypto
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Create a lightweight session token
    const sessionId =
      "sess_" + Math.random().toString(36).slice(2) + "_" + Date.now();

    res.setHeader(
      "Set-Cookie",
      `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; ${
        process.env.NODE_ENV === "production" ? "Secure;" : ""
      } Max-Age=${60 * 60 * 24}`
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("auth error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
