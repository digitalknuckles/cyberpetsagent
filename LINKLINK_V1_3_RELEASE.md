# CyberpetsAI LinkLink v1.3 — Full Integration

Based on the v1.2.1 Integration Repair archive. Preserve existing wallet signature authentication, OpenSea ownership verification, memory, legacy chat, and freeform adventure saves/checkpoints.

## New
- One LinkLink identity and chat stream for companion and adventure narration.
- Shared archive-driven prompt retrieval (`linklink-core.js`, `src/linklink-lore/index.js`), fixing a broken duplicate function tail.
- Seven additional knowledge archive files, explicitly distinguishing canon and proposed game scenarios.
- Shorter AI responses and less chat history; deterministic missions make zero model calls.
- Wallet-scoped PostgreSQL `collector_rpg` with transactional revision checking, XP, level, HP, inventory, and three sequential training missions.
- Compact Agent panel with server-validated choices and responsive controls; existing freeform Adventure and Memory remain.

## Deploy
1. Keep DATABASE_URL, OPENAI_API_KEY and OPENSEA_API_KEY in Vercel Preview. Never commit credentials.
2. Deploy to feature branch/Preview first. Tables auto-create when accessed.
3. Sign wallet, open Agent, complete Signal Anomaly, refresh, verify XP and inventory persist.
4. Open Missions, start legacy freeform Adventure, verify checkpoints and LinkLink chat remain functional.
5. Test desktop/mobile widths, memory toggle and NFT switching.

## Mechanics
Campaign is deliberately deterministic and fixed, not procedurally generated. The three missions each have three actions; one-time rewards are enforced by row locks and revision checks. HP is persistent and increases on level-up; combat damage and consumable use are not yet implemented. Freeform Adventure remains AI-narrated and uses its existing separate state; it does not award RPG XP or items. Browser state is display-only; PostgreSQL is authoritative.

## Notes
No NFT transfers, on-chain actions, or financial rewards are performed. Existing verified NFT traits/rarity handling remains in the chat backend.
