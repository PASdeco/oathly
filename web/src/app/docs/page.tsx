export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="font-serif-oath text-5xl">Docs</h1>
      <p className="mt-6">Contract: <code className="font-mono-oath text-sm">contracts/oathly_pledge.py</code> (OathlyPledge). States: ACTIVE → AWAITING_VERDICT → KEPT | BROKEN → SETTLED, plus UNCLEAR_HOLD, INCONCLUSIVE and CANCELLED.</p>
      <ul className="mt-4 list-disc pl-6">
        <li>create_pledge (payable) → add_checkin → request_verdict → settle → claim_payout</li>
        <li>Deadline is enforced on-chain for request_verdict, appeal and settle — no caller can trigger a verdict early.</li>
        <li>UNCLEAR → grace period → submit_extra_proof → request_verdict once more. Two accessible &quot;missing&quot; rounds are required for BROKEN; persistent unverifiable sources settle INCONCLUSIVE and refund the owner.</li>
        <li>appeal (one per oath, exact 0.001 GEN bond, optional new evidence) → claim_bond</li>
        <li>get_policy exposes bond, windows, limits and the treasury address; validator rules require every source to be reachable for NOT_MET and an authoritative pre-deadline date for MET.</li>
      </ul>
      <p className="mt-4" style={{ color: "var(--ink-muted)" }}>
        Full spec in the repo: docs/ARCHITECTURE.md. Network: StudioNet chain 61999, RPC https://studio.genlayer.com/api.
      </p>
    </div>
  );
}
