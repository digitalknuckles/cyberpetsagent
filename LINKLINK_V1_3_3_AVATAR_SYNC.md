# LinkLink v1.3.3 — Selected NFT Trainer avatar synchronization

- Builds on v1.3.2.
- Trainer now uses the active, verified LinkLink NFT avatar image instead of its random Teddy sprite, using the existing avatar map with verified NFT image fallback.
- Switching the active NFT updates the running Trainer via a same-origin postMessage.
- Trainer waits for the new image to load before replacing the previous sprite; failure leaves the previous sprite intact.
- No wallet authentication in iframe; existing /api/session check and Trainer route protection remain.
- No NFT metadata, gameplay stats, RPG rewards, or database changes.

## Test
1. Authenticate in Preview and select an owned NFT.
2. Enter `cyberpet trainer`, reveal artifact, verify selected pet appears and moves.
3. Exit, select another NFT, reopen Trainer and verify new artwork.
4. Check Trainer controls, other LinkLink modes, and responsive layout.
5. Verify an invalid/expired session cannot open Trainer.
