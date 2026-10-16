# Deploy

## Contract → StudioNet (LIVE)

- Address: `0xA85005663e9368791Bc3Bdaf311138Eb4558C565`
- Deploy tx: `0x94a7a196ceb77094cde30cd376760bb09bb3374d96de8b8dc4d14a3ff523647a`
- First oath: `oath-1` ACTIVE, 0.001 GEN stake, tx `0xa8cc2391a21987c1aa2aa426f6601f1071d9836e8a23ff0b30e798c3dfc8a9f5` (verified via `get_pledge`)
- Network: chain 61999, RPC https://studio.genlayer.com/api, explorer https://explorer-studio.genlayer.com

```bash
cd oathly
pip install genlayer-test
python -m pytest tests/ -v   # 6 passed
node web/scripts/deploy-oathly.mjs   # needs BACKEND_PRIVATE_KEY in oathly/.env (never committed)
```

`scripts/deploy.mjs` reads `contracts/oathly_pledge.py`, deploys via genlayer-js studionet, waits ACCEPTED, prints address. Put it in `web/.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS` and set `NEXT_PUBLIC_MOCK_MODE=false` for live on-chain testing (verified: wall + profile reads return live data).

Network: chain 61999, RPC https://studio.genlayer.com/api, explorer https://explorer-studio.genlayer.com. Fund the deployer via the Studio faucet.

## Frontend → Vercel (LIVE)

- URL: https://gen-oathly.vercel.app (project `gen-oathly`, root `web/`, framework Next.js)
- Env (production): `NEXT_PUBLIC_CHAIN_ID=61999`, `NEXT_PUBLIC_GENLAYER_RPC`, `NEXT_PUBLIC_CONTRACT_ADDRESS=0xA85005663e9368791Bc3Bdaf311138Eb4558C565`, `NEXT_PUBLIC_EXPLORER_URL`, `NEXT_PUBLIC_SITE_URL=https://gen-oathly.vercel.app`, `NEXT_PUBLIC_MOCK_MODE=false`
