# Oathly — Say it. Stake it. Keep it.

**Commitment contracts on GenLayer.** Put money behind a public goal. Prove you did it and you get it back. Miss, and it goes to someone you chose.

- **Live app:** https://gen-oathly.vercel.app
- **Contract (StudioNet):** [`0xA85005663e9368791Bc3Bdaf311138Eb4558C565`](https://explorer-studio.genlayer.com/address/0xA85005663e9368791Bc3Bdaf311138Eb4558C565)

---

## The problem it solves

Goals are cheap to announce and easy to abandon. Oathly makes a public commitment financially real: you lock GEN in an intelligent contract against a goal, a deadline, and a recipient. At the deadline, GenLayer validators fetch your public proof and judge whether the goal was met — **kept means a full refund, broken means your stake is paid out** to the friend, charity, or rival you named.

Why GenLayer: deciding "did they actually do it?" from public web pages is subjective and needs live web access, which ordinary oracles can't do.

## How it works

```
Make the oath → Do the thing → Validators decide
     ↓                ↓                  ↓
 goal + deadline   public proof    validators fetch proof,
 + stake +         posted as       LLM judges MET / NOT_MET /
 recipient         check-ins       UNCLEAR under validator consensus
```

1. **Make the oath** — pick a template (ship code, publish posts, public page, custom), write a plain-English success rule, link 1–3 public proof URLs, set a deadline and stake, name the recipient.
2. **Do the thing** — post public check-ins as you work.
3. **Validators decide** — after the deadline, validators independently re-fetch your proof and must agree on the outcome. `UNCLEAR` gets one grace period for extra proof; a second `UNCLEAR` counts as missed. One appeal per oath (bond returned if the ruling flips), then settlement.

## Tech stack

| Layer | Choice |
|---|---|
| Contract | GenLayer Intelligent Contract (Python, GenVM) — `contracts/oathly_pledge.py` |
| Network | StudioNet (chain 61999, dev funds only) |
| Frontend | Next.js 16 App Router, TypeScript, Tailwind v4, TanStack Query, react-hook-form + zod, viem, genlayer-js |
| Tests | gltest direct-mode (contract), Vitest (web) |

## Repo structure

```
oathly/
  contracts/        oathly_pledge.py — escrow, verdict, grace, appeal, settle + views
  tests/            direct-mode contract tests (no network, no LLM)
  web/              Next.js app (src/app, src/components, src/lib, public/brand)
  web/scripts/      StudioNet deploy script
  docs/             ARCHITECTURE.md, DECISIONS.md, DEPLOY.md
  .env.example      public config template (never commit real keys)
```

## Getting started

```bash
cd oathly/web
npm install
cp ../.env.example .env.local   # fill in values below
npm run dev                     # http://localhost:3000
```

### Environment

```bash
NEXT_PUBLIC_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_RPC=https://studio.genlayer.com/api
NEXT_PUBLIC_EXPLORER_URL=https://explorer-studio.genlayer.com
NEXT_PUBLIC_CONTRACT_ADDRESS=0xA85005663e9368791Bc3Bdaf311138Eb4558C565
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MOCK_MODE=false     # true = seeded demo data, no chain needed
# deploy only, never client-side:
BACKEND_PRIVATE_KEY=0x...
```

`MOCK_MODE=true` serves seeded oaths so the UI runs without a wallet or chain.

## Testing

```bash
# contract (from oathly/)
python -m pytest tests/ -v

# web (from oathly/web/)
npm run test -- --run
npm run build
```

## Deployment

- **Contract:** `node web/scripts/deploy-oathly.mjs` with `BACKEND_PRIVATE_KEY` in `oathly/.env` (gitignored). See `docs/DEPLOY.md`.
- **Frontend:** Vercel project `gen-oathly` (root `web/`), production env carries the `NEXT_PUBLIC_*` values above.

## Known limitations

- Goals must be verifiable from public, bot-fetchable pages. X / Instagram / TikTok block automated fetching and are rejected in v1.
- A recipient controlled by the owner (second wallet) can't be prevented on-chain; `recipient != owner` is enforced and confirmed in the UI.
- LLM verdicts can vary; this is a prototype, not a legal contract.
- StudioNet uses dev funds with simulated balances — no real money.

---

Built on [GenLayer](https://genlayer.com) — the adjudication layer for subjective, real-world questions.
