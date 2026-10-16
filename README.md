# Oathly — Say it. Stake it. Keep it.

Commitment contracts on GenLayer StudioNet. Stake GEN on a public goal, prove it, get refunded. Miss and your chosen recipient gets it.

## Quick start (10 min)

```bash
cd oathly/web
npm install
cp ../.env.example .env.local
npm run dev
```

Mock mode is ON when `NEXT_PUBLIC_CONTRACT_ADDRESS` is unset — the wall, detail and dashboard render seeded oaths.

## Structure

```
oathly/
  contracts/oathly_pledge.py
  web/  Next.js App Router + TS + Tailwind
  docs/ ARCHITECTURE.md DECISIONS.md DEPLOY.md
```

## Contract

See `docs/ARCHITECTURE.md` and `docs/DEPLOY.md`. StudioNet chain 61999, RPC https://studio.genlayer.com/api.

## Known limitations

- X/Instagram/TikTok blocked in v1 (fetch blocking).
- Recipient self-dealing possible (recipient != owner enforced, UI confirms).
- LLM verdict variance; not a legal contract.
- StudioNet demo funds only.
