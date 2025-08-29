# Portfolio Time-Traveler

A cross-platform investing game. The server randomly picks a past date window; you get starting cash and allocate across crypto (CoinGecko) and equities/ETFs (FMP). Each turn you can rebalance. No look-ahead: the server (Supabase Edge Functions) does all NAV math. Final NAV writes to a live leaderboard.

## Quickstart

```bash
# 1) Tooling
corepack enable
corepack use pnpm@latest-10
npm i -g supabase

# 2) Install deps
pnpm i

# 3) Dev servers
pnpm dev:web      # Next.js (apps/web)
pnpm dev:mobile   # Expo (apps/mobile)
