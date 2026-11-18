# LinkLink Memory v1.1 — low-token, opt-in

## Behavior
- The wallet signs in as in v1.0. NFT synchronization still occurs **only on wallet authentication**, not in background jobs.
- The collector's wallet-scoped memory notes live in PostgreSQL, never localStorage. Notes are disabled by default.
- The Memory button allows enabling/disabling memory, viewing notes, and deleting all notes.
- Once enabled, send `remember: I like Cyberpet #7736` in chat to save an explicit note without making an OpenAI API request. Maximum 8 notes, 180 characters each. Repeated identical notes deduplicate.
- Send `forget my memories` to clear notes without an OpenAI request.
- LinkLink receives at most eight short notes in the existing system context, instead of retrieving old conversations or performing LLM summarization. No token use occurs for memory extraction, welcome-back text, or the Memory UI.
- Disabling memory excludes notes from the prompt but preserves them until explicitly cleared.

## Important limitations
- Memory is explicit, not automatic semantic extraction from chats. Conversation history remains session-scoped (last eight messages sent per request).
- Greetings are deterministic frontend messages, not additional LLM calls.
- Database migration runs automatically on the first database access using `CREATE TABLE IF NOT EXISTS`.
- NFT change alerts in v1.0 remain snapshot comparisons, not transaction-level Polygon event verification.
- Stored notes are treated as untrusted collector-provided data. Do not store secrets or sensitive information.

## Deployment
Use the existing Vercel environment variables, including DATABASE_URL. Run npm install and deploy using the existing server.js/vercel.json setup. Test sign-in, memory on/off, note persistence after logout/login, deletion, and wallet isolation in a preview deployment.
