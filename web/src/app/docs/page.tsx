export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="font-serif-oath text-5xl">Docs</h1>
      <p className="mt-6">Contract: <code className="font-mono-oath text-sm">contracts/oathly_pledge.py</code> (OathlyPledge). States: ACTIVE → AWAITING_VERDICT → KEPT | BROKEN → SETTLED, plus UNCLEAR_HOLD and CANCELLED.</p>
      <ul className="mt-4 list-disc pl-6">
        <li>create_pledge (payable) → add_checkin → request_verdict → settle</li>
        <li>UNCLEAR → 48h grace → submit_extra_proof → request_verdict once more</li>
        <li>appeal (one per oath, 0.001 GEN bond) → settle</li>
      </ul>
      <p className="mt-4" style={{ color: "var(--ink-muted)" }}>
        Full spec in the repo: docs/ARCHITECTURE.md. Network: StudioNet chain 61999, RPC https://studio.genlayer.com/api.
      </p>
    </div>
  );
}
