# LinkLink Adventures v1.2 — Dual Mode

Preserves the existing companion chat and introduces a separate, wallet-authenticated Adventure panel. Existing Vercel `server.js` deployment, OpenAI and OpenSea environment variables, and PostgreSQL `DATABASE_URL` are retained. The adventure tables are created on first access.

## Features
- New and resumed NFT-linked adventures (Polygon chain 137 / CyberpetsAI contract).
- Structured location, scene, inventory, quests, NPC relationships, flags, and turn count.
- Save toggle ON: server commits each successful turn to PostgreSQL.
- Save toggle OFF: turns are held in the browser tab only. Re-enable requires loading the saved adventure, discarding the temporary branch.
- Named checkpoints and checkpoint restore.
- Only the selected owned NFT can be used for an adventure; current ownership is checked against the authenticated wallet's connection snapshot.
- Compact AI requests: current structured state, last three short exchanges, and the latest action; no full chat replay and no summarization calls.

## Deployment
1. Configure `DATABASE_URL`, `OPENAI_API_KEY`, and existing OpenSea variables in Vercel as for v1.1.
2. Deploy via GitHub/Vercel with `server.js` as the serverless entry point.
3. Connect a wallet, select an NFT, click Adventure, then Start.
4. Verify persistence across refresh, temporary save-off behavior, checkpoints, and the unchanged companion chat.

## Limitations and security notes
- This is a v1.2 MVP, not a production-audited game engine. The LLM proposes state and the backend bounds its shape/size, but does not enforce a complete inventory/quest ruleset.
- Save-OFF draft state is submitted by the client; do not use it for valuable items, rewards, or on-chain entitlements.
- A save-OFF branch cannot be merged into the persisted adventure in this version.
- NFT ownership is refreshed on wallet authentication, not continuously. A transfer after authentication may remain in the session snapshot until the next connection.
- Checkpoints store compact state and recent context, not a complete transcript. Story text in the panel is ephemeral between reloads.
- Each story turn makes one OpenAI call; there is no model call on load, checkpoint, or login.
- PostgreSQL schema initialization is automatic. For production, prefer versioned migrations and apply request rate limits and usage quotas.
