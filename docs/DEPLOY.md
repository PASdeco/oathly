# Deploy

## Contract → StudioNet (LIVE, v2 after reviewer fixes)

- Address: `0x005507b55792272b14aF9C9A79a0F71136438E47`
- Deploy tx: `0xcbb198766cd78ad1b5272d3d12da2b92a78cecec38fdd6a865f55dbae9bd8439`
- Constructor: `grace_seconds=600`, `appeal_window_seconds=900` (short windows for the demo; defaults 172800, bounds 60..604800)
- Verified policy via `get_policy`: bond 0.001 GEN, min stake 0.001 GEN, min lead 300s, cooling 3600s, treasury `0xd0b8aeedf195499773415323cae517e5b8369f94`
- Previous rejected build (superseded): `0xA85005663e9368791Bc3Bdaf311138Eb4558C565`, deploy tx `0x94a7a196ceb77094cde30cd376760bb09bb3374d96de8b8dc4d14a3ff523647a`
- Network: chain 61999, RPC https://studio.genlayer.com/api, explorer https://explorer-studio.genlayer.com

```bash
cd oathly
pip install genlayer-test
$env:PYTHONIOENCODING='utf-8'; genvm-lint.exe check contracts/oathly_pledge.py   # 16 methods (7 view, 9 write)
python -m pytest tests/ -q          # 41 passed
node web/scripts/deploy-oathly.mjs  # BACKEND_PRIVATE_KEY in oathly/.env (never committed)
```

The deploy script reads `contracts/oathly_pledge.py`, passes the constructor args, deploys via genlayer-js studionet, waits ACCEPTED, prints the address and the on-chain policy. Set the resulting address as `NEXT_PUBLIC_CONTRACT_ADDRESS` in `web/.env.local` and Vercel production env, keep `NEXT_PUBLIC_MOCK_MODE=false`.

## Frontend → Vercel (LIVE)

- URL: https://gen-oathly.vercel.app (project `gen-oathly`, root `web/`, framework Next.js)
- Env (production): `NEXT_PUBLIC_CHAIN_ID=61999`, `NEXT_PUBLIC_GENLAYER_RPC`, `NEXT_PUBLIC_CONTRACT_ADDRESS=0x005507b55792272b14aF9C9A79a0F71136438E47`, `NEXT_PUBLIC_EXPLORER_URL`, `NEXT_PUBLIC_SITE_URL=https://gen-oathly.vercel.app`, `NEXT_PUBLIC_MOCK_MODE=false`

## Verification evidence

- Verdict/enforcement tests: `tests/test_oathly_pledge.py` — 41 direct-mode tests covering premature verdict rejection for owner/recipient/stranger, validator outcome mismatch, retrieval-failure-never-NOT_MET, repeated-unverifiable → INCONCLUSIVE refund, check-in adjudication, appeals with exact bond and new evidence, claim-only settlement, duplicate settlement/claim guards, insufficient-balance retry, pagination/cursor.
- Web: `npm run test` (7 passed) + `npm run build` (TypeScript check + 14 routes) in `web/`.
