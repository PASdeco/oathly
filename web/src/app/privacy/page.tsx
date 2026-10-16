export default function Privacy() {
  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="font-serif-oath text-5xl">Privacy</h1>
      <p className="mt-6" style={{ color: "var(--ink-muted)" }}>
        Oaths, check-ins and proof URLs are public on-chain. We store your theme choice and last-used wallet locally. No tracking by default; optional privacy-friendly analytics only via env config.
      </p>
    </div>
  );
}
