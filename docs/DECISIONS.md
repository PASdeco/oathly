# Decisions

- Followed current GenLayer docs over blueprint where they differ: browser wallet pattern `createClient({chain: studionet, account, provider}) + connect("studionet") + estimateTransactionFeesForWrite + writeContract + waitForFinalization + isSuccessful`.
- Contract storage: single JSON blob `pledge_store` + `pledge_ids_json` instead of TreeMap-per-pledge, to keep GenVM subset simple and lint-clean (no `for`/`sorted`/`lambda`, `while` loops only).
- Escrow: native GEN payable + external-message `_Payout.emit_transfer` per value-transfers doc; Studio simulates balances.
- Frontend wallet: viem EIP-1193 `window.ethereum` directly (no wagmi) to match Roast's proven minimal path; WalletConnect-compatible providers supported via same EIP-1193 interface.
- Mock mode when contract address unset, per blueprint §10.
