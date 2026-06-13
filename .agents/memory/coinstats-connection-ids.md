---
name: CoinStats connection IDs
description: Correct connectionId values for the CoinStats /wallet/* API endpoints — they differ from common chain names
---

# CoinStats connectionId values

Use the exact IDs from `/wallet/blockchains` — they are NOT the same as common shorthand names.

Key mappings verified against the live API:
- BSC → `binancesmartchain` (not "bsc")
- Base → `base-wallet` (not "base")
- Ethereum → `ethereum` ✓
- Solana → `solana` ✓
- Arbitrum → `arbitrum-wallet`
- Avalanche → `avalanche-wallet`
- Polygon → `polygon-wallet`

**Why:** The API returns 400 "Invalid connectionId" if you use the wrong ID. Always fetch `/wallet/blockchains` to verify new chains before using them.

**How to apply:** Any time a new network is added to the NETWORK_MAP in `artifacts/api-server/src/routes/portfolio.ts`, confirm its `connectionId` from the blockchains endpoint first.
