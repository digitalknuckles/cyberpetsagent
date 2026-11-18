# LinkLink v1.3.8 — Trainer mobile balance and sprite sizing

Based on v1.3.7. Trainer simulation uses elapsed-frame normalization (60fps baseline) for stat decay, health/training progress, cooldowns and roaming; removed a second per-frame movement call. Cyberpet sprite is drawn at 50% of the previous 500px logical size, with responsive scaling and boundary clamping for small screens. The existing trainer rewards, wallet authentication, NFT metadata, and other app UI are unchanged.

Browser testing on mobile is still required. This patch does not guarantee victory under all play patterns.
