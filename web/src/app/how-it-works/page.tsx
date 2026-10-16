export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="font-serif-oath text-[clamp(36px,5vw,56px)]">How it works</h1>
      <ol className="mt-8 flex flex-col gap-6 text-lg">
        <li><strong>1. Make the oath.</strong> State a goal checkable online, a deadline, a stake in GEN, and the recipient who gets it if you slip.</li>
        <li><strong>2. Do the thing.</strong> Post public proof as you go. Check-ins are public but do not decide the outcome alone.</li>
        <li><strong>3. Validators decide.</strong> After the deadline, GenLayer validators fetch your proof pages live and an LLM judges MET / NOT_MET / UNCLEAR under strict JSON. UNCLEAR gets one 48-hour grace period; a second UNCLEAR counts as NOT_MET.</li>
      </ol>
      <p className="mt-8" style={{ color: "var(--ink-muted)" }}>
        Kept → full refund. Broken → stake paid to your chosen recipient. One appeal per oath with a 0.001 GEN bond, returned if the ruling flips. This is a StudioNet prototype with no real funds — not a legal contract.
      </p>
    </div>
  );
}
