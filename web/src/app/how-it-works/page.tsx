export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="font-serif-oath text-[clamp(36px,5vw,56px)]">How it works</h1>
      <ol className="mt-8 flex flex-col gap-6 text-lg">
        <li><strong>1. Make the oath.</strong> State a goal checkable online, a deadline, a stake in GEN, and the recipient who gets it if you slip.</li>
        <li><strong>2. Do the thing.</strong> Post public proof as you go. Check-ins are public and count as adjudication sources alongside your proof URLs.</li>
        <li><strong>3. Validators decide.</strong> After the deadline, GenLayer validators fetch your proof pages live and an LLM judges MET / NOT_MET / UNCLEAR under strict JSON. Every validator independently recomputes the outcome and must agree exactly, including on the dated evidence used.</li>
        <li><strong>4. Unclear? One grace period.</strong> If the outcome is UNCLEAR you get a grace window to add extra proof URLs. If a second run still finds every source reachable and nothing shipped, it counts as NOT_MET. If sources stay unreachable or undated, the oath settles INCONCLUSIVE and your stake returns to you — retrieval failures can never silently become a failure finding.</li>
        <li><strong>5. Appeals.</strong> Once per oath, with a 0.001 GEN bond and optional new evidence: the owner appeals BROKEN, the recipient appeals KEPT. The bond returns if the ruling flips or stays inconclusive, and goes to the contract owner (treasury) only when a decisive re-run upholds the original ruling.</li>
      </ol>
      <p className="mt-8" style={{ color: "var(--ink-muted)" }}>
        Kept → full refund. Broken → stake paid to your chosen recipient. Payouts are claims: whoever triggers the claim, the GEN always goes to the entitled address, and a payout can never be paid twice. This is a StudioNet prototype with no real funds — not a legal contract.
      </p>
    </div>
  );
}
