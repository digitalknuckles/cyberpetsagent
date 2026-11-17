# LinkLink v1.3.4 — Cyberpet Training & Persistent Stats (Preview)

Based on v1.3.3 Trainer Avatar Sync. Deploy only to feature branch Preview first.

## Changes
- Selected verified NFT has its own wallet+token scoped PostgreSQL `collector_pets` record (level, XP, HP, Power, Defense, Containment, Abilities, items and training wins).
- Trainer victory grants 20 Cyberpet XP, once per run; run must last at least 45 seconds, and a maximum of five rewarded victories per 24 hours per pet. Practice mode remains playable without XP.
- Structured containment mission XP is also awarded to the active selected Cyberpet **in the same transaction** as Agent XP, so a failed pet award rolls back the mission reward.
- Cyberpet levels grow HP (+4), Power (+2), Defense (+2), Containment (+1 every even level), and unlock Repair Pulse at level 3 and Containment Field at level 5. Starting stats: HP 20, Power 3, Defense 3, Containment 1, Signal Scan.
- Visible selected Cyberpet HP/XP bars and combat stats in the unified hub; Agent statistics remain separate.
- NFT profile image increased from 54 to 108 CSS pixels on desktop (88 on small screens); floating LinkLink avatar 140 to 280; Trainer rendered pet is twice its previous visual size while movement/collision remains unchanged.
- NFT contract metadata, rarity and on-chain state are never changed.

## Database
New tables auto-create: `collector_pets`, `pet_training_runs`. Requires existing `DATABASE_URL` in Preview. No new env vars.

## Security limitations
Trainer remains a browser-side minigame. Server validates wallet ownership, selected token, run duration, single-claim, and daily cap, but cannot independently prove gameplay success. Treat awarded training XP as a **prototype** until Trainer actions are server-authoritative or signed by a trusted game server. Do not use these rewards for transferable items or valuable competitive battles yet.

## Testing
1. Connect verified wallet, select NFT A, verify Cyberpet HUD.
2. Open Trainer via `cyberpet trainer`, complete a run lasting 45+ seconds. Check +20 pet XP and refresh persistence.
3. Select NFT B: separate stats should load. Return to NFT A: prior progress persists.
4. Complete an uncompleted structured mission with NFT A selected. Verify Agent and pet each gain the same mission XP.
5. Refresh, switch modes, restore saves and check legacy chat, adventure, memory, and NFT display.
6. Test repeated completion event and early completion: no duplicate or early rewards.

## Future battle system
The fields are placeholders for a future turn-based combat engine. No combat, PvP, item consumption, stat allocation, or healing endpoints are implemented in this version.
