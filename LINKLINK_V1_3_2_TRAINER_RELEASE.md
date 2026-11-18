# CyberpetsAI LinkLink v1.3.2 — Hidden Trainer Integration

## What changed
- Integrated the user-provided CyberpetsAI Trainer standalone canvas minigame in `/trainer/` as a LinkLink workspace iframe.
- Type `cyberpet trainer` (or `open cyberpet trainer`) in LinkLink chat to discover a hidden artifact, then choose **Reveal artifact**.
- The Trainer is protected by the existing server-side signed-wallet session and verified CyberpetsAI NFT ownership. No standalone MetaMask/ethers checks, wallet signatures, chain switching, or NFT access-pass requirements.
- Removed standalone mint/trophy transaction code. Training victory now offers **Train again**. `prize.gif` remains a visual victory asset only.
- Exit Trainer returns to Chat and unloads the iframe. Existing modes and wallet authentication remain intact.

## Scope and boundaries
- This is a self-contained minigame; training does **not** award RPG XP, HP, items, or NFT tokens.
- Existing NFT metadata and Collector Memory are unchanged.
- The standalone minigame's canvas controls and art assets are preserved. Embedded mobile layout and accessibility need device testing.
- The hidden artifact is a UI discovery, not a security secret; `/trainer/` itself requires authentication.

## Preview test
1. Deploy this archive's **contents** to `feature/linklink-adventures-v1.2` (not the stable main branch).
2. Authenticate with a CyberpetsAI NFT wallet.
3. Type `cyberpet trainer` in the main chat composer. Confirm the artifact discovery dialog appears without an AI call.
4. Click **Reveal artifact**, play Train/Charge/Clean/Play, then **Exit Trainer**.
5. Verify direct `/trainer/` access returns 401 without a session and 403 for a session with no NFTs.
6. Verify existing Chat, Adventure, Missions, Agent, Memory, and save controls still work.
7. Check Vercel Preview runtime logs and test on mobile.

No new environment variables or database migrations required.
