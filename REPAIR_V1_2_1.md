# CyberpetsAI LinkLink Adventures v1.2.1 — Integration Repair

## Scope
Built from the supplied `feature/linklink-adventures-v1.2` archive. Legacy `main` used as reference.

- Preserves signed wallet challenge, verification, wallet-scoped sessions, companion chat, memory, adventures and checkpoints.
- Avoids a server import crash when DATABASE_URL is absent; protected API requests return a service error instead.
- Restores OpenSea holdings pagination to 50 and uses bounded metadata batches. Verified holdings remain available even when individual metadata calls fail.
- Clarifies wallet-connected vs authenticated UI, retains explicit signing, and removes unused auto-auth helper.
- Prevents static delivery of server source and secrets; only approved public assets are served.
- Excludes `.env`, `node_modules`, `.git` and other local/private files from the ZIP.

## Deployment
1. Deploy to a **Vercel Preview** branch, not production main.
2. Configure OPENAI_API_KEY, OPENSEA_API_KEY and DATABASE_URL for Preview. PostgreSQL must be accessible and have CREATE TABLE permissions. Use a separate Preview database where possible.
3. Install dependencies using `npm ci`. Use the existing `vercel.json` routing to `server.js`.
4. Open the Preview URL; check `GET /api/session` (401 before login), then click Connect Wallet and sign the challenge.
5. Confirm owned NFT selector and AI chat, then Memory, Adventure start/turn, Save OFF/ON, checkpoints and reload.
6. Verify an unowned wallet cannot use chat or start an adventure. Test wallet account switching and expired sessions.
7. Only merge after end-to-end checks pass.

## Important limitations
- No live wallet, OpenSea, OpenAI, Vercel or PostgreSQL integration test has been performed.
- Ownership is refreshed at sign-in and stored in a session snapshot, not revalidated against the chain on every chat turn.
- The database SSL configuration assumes a trusted certificate for hosted PostgreSQL; configure your provider accordingly.
- The source archive included a `.env` file. It is intentionally **not** included in this deliverable. If those credentials were ever committed or shared, rotate them.
