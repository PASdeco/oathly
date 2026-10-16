# Oathly architecture

## States

ACTIVE → AWAITING_VERDICT → KEPT | BROKEN → SETTLED, plus UNCLEAR_HOLD (one 48h grace to add proof) and CANCELLED (cooling-off 1h after creation).

## Verdict flow

`request_verdict` runs `gl.vm.run_nondet_unsafe(leader, validator)`:
1. Fetch each proof URL live via `gl.nondet.web.get` (GitHub API JSON for ship_code).
2. Single LLM call with strict JSON `{outcome: MET|NOT_MET|UNCLEAR, checks, evidence, reason}`. Fetched content treated as untrusted data; instructions inside ignored.
3. Validator independently re-runs `_evaluate` and requires same outcome (UNCLEAR tolerated once), non-empty evidence for MET.
4. UNCLEAR first time → UNCLEAR_HOLD + hold_until; second run resolves MET/NOT_MET (UNCLEAR counts as NOT_MET).
5. Deadline integrity: prompt requires dated evidence ≤ deadline; undated content rejected.

## Appeal economics

One appeal per oath. Owner appeals BROKEN, recipient appeals KEPT, bond 0.001 GEN (`MIN_STAKE_WEI`). Re-run verdict; bond returned to appellant if ruling flips, else to contract owner (treasury). Appeal window 48h after verdict.

## Trust assumptions

- Validators honestly re-fetch + re-judge.
- GitHub API / RSS feeds are available and timestamped.
- LLM judging can vary; tolerance is outcome-only, not free-text equality.
- Recipient self-dealing (owner's second wallet) cannot be prevented on-chain; blocked only for recipient == owner + UI confirmation.
- Escrow is native GEN via payable + `_Payout.emit_transfer`; on Studio balances are simulated (no ghost contracts).
