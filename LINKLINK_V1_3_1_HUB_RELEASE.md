# CyberpetsAI LinkLink v1.3.1 — Unified Hub patch

Based on v1.3 full source. Preserves signed wallet auth, verified NFT metadata, existing PostgreSQL schema, collector memory, scripted RPG, and freeform adventures.

## New UI
- One mode-switched workspace: Chat / Adventure / Missions / Agent, not stacked panels.
- Shared always-visible HP/XP/level bars sourced from GET /api/rpg and validated mission actions.
- Game menu for saved-adventure listing, loading, checkpoint/restore, server-side deletion with confirmation, collector memory settings, and UI-only cache controls.
- LinkLink navigation commands in chat: "open menu", "show inventory", "open missions", "open adventure", "open chat". These operate locally without LLM calls.

## Safety and persistence
- Deletion uses the existing wallet-scoped DELETE /api/adventures/:id route; PostgreSQL cascades checkpoints.
- No NFT ownership, metadata, or active NFT selection is modified by the menu.
- Local cache control removes only linklink:compact.
- Agent XP/HP are server-authoritative and are not reset by deleting adventures.
- Clearing on-screen chat does not erase server-side memory or database saves.

## Known scope limitations
- Existing Collector Memory editor remains the legacy prompt-based UI, now accessible from Game Menu.
- Freeform Adventure remains separate in gameplay mechanics from deterministic RPG campaign, although both share the workspace.
- No RPG reset or per-mission abandonment endpoint exists; none is fabricated.
- Browser/real-wallet/Vercel integration tests are required before production.

## Test checklist
1. Preview deployment and authenticated wallet restore.
2. Switch all four modes, verify only one view visible at a time.
3. Run a mission, verify XP bar updates and persists after refresh.
4. Create and load an adventure, save checkpoint, restore.
5. Delete a test adventure with two confirmations, verify checkpoints gone.
6. Confirm NFT metadata, NFT selection and memory are unchanged.
7. Test menu and controls on narrow touch viewport.
