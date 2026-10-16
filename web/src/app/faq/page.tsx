const FAQS = [
  { q: "What is Oathly?", a: "A commitment-contract app. You stake GEN on a public goal. Prove it and get refunded; miss and your chosen recipient gets the stake." },
  { q: "Why GenLayer?", a: "Judging 'did they actually do it?' from public web pages is subjective and needs live web access, which ordinary oracles cannot do." },
  { q: "What goals work?", a: "Ship code (GitHub API), publish N posts (RSS/Atom), public page shows X, or custom with up to 3 proof URLs. X / Instagram / TikTok are not supported in v1." },
  { q: "What if validators are unsure?", a: "UNCLEAR triggers one grace period (~48h) to add proof, then one re-run. A second UNCLEAR counts as NOT_MET." },
  { q: "Can I appeal?", a: "Once per oath: owner appeals BROKEN, recipient appeals KEPT, with a 0.001 GEN bond returned if the ruling flips." },
  { q: "Is this real money?", a: "No. Oathly runs on GenLayer StudioNet, a development environment with no real funds." },
];

export default function Faq() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="font-serif-oath text-[clamp(36px,5vw,56px)]">FAQ</h1>
      <div className="mt-8 flex flex-col gap-4">
        {FAQS.map((f) => (
          <details key={f.q} className="card-oath border-2 p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <summary className="cursor-pointer font-bold">{f.q}</summary>
            <p className="mt-2" style={{ color: "var(--ink-muted)" }}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
