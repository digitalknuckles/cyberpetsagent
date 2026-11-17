# LinkLink v1.3.4a — Trainer Reward Validation + Avatar Layout

Based on v1.3.4. No changes to NFT metadata, wallet authentication, database schema, or previously awarded XP.

- The Trainer notifies its parent when the player actually starts gameplay. Only then does LinkLink create a server training run.
- A visible countdown displays remaining time before a completed simulation can claim XP. Completion waits until the server's minimum eligibility time has elapsed. The server remains authoritative and enforces the original 45-second minimum, per-pet daily cap, wallet ownership, and one-time reward.
- Expected validation errors now return their intended HTTP codes (e.g. 409 for a short run), instead of being incorrectly returned as HTTP 500. Unexpected exceptions remain generic to the browser and detailed in server logs.
- The oversized floating avatar is constrained to an outside desktop rail where space permits, and hidden at narrower desktop widths. Chat message avatars are contained inside their bubbles. The selected NFT PFP and game sprites remain otherwise unchanged.

## Preview smoke test
1. Sign in and select an owned Cyberpet.
2. Reveal Trainer. Wait on its start screen: the countdown should NOT start.
3. Start Trainer; confirm the countdown appears.
4. Complete the game quickly: a remaining-time notice appears, then one XP claim after eligibility.
5. Confirm XP persists after reload, and repeat a claim does not award extra XP.
6. Switch Cyberpets and check the separate XP records.
7. Check desktop wide and mid-size layouts: floating pet must not cover chat bubbles, controls, or Trainer.
8. Verify existing missions, agent, inventory, save management and NFT metadata are unchanged.

Limitations: Browser-side Trainer completion is not independently attested by the backend. Keep rewards low-stakes until a server-verifiable gameplay protocol is added. The live Vercel deployment has not been tested here.
