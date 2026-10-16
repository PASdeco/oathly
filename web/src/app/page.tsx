import Link from "next/link";
import { OathSentenceBuilder } from "@/components/OathSentenceBuilder";
import { OathCard } from "@/components/OathCard";
import { MOCK_OATHS } from "@/lib/mock";

export default function Landing() {
  return (
    <div>
      <section style={{ background: "var(--hero-bg)", color: "var(--hero-ink)" }}>
        <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-14">
          <div
            className="font-mono-oath mb-5 text-[13px] uppercase tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            Commitment contracts
          </div>
          <h1 className="font-serif-oath max-w-[900px] text-[clamp(50px,8.5vw,112px)] leading-[0.98]">
            Say it. Stake it. Keep it.
          </h1>
          <p className="mt-7 max-w-[560px] text-xl" style={{ color: "#DCE0FF" }}>
            Put money behind a public goal. Prove you did it and you get it
            back. Miss, and it goes to someone you chose.
          </p>
          <div className="mt-12">
            <OathSentenceBuilder />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-24" id="how">
        <h2 className="font-serif-oath max-w-[700px] text-[clamp(36px,5vw,56px)] leading-tight">
          Three moves. No excuses.
        </h2>
        <div className="mt-14 grid gap-12 md:grid-cols-3">
          {[
            { n: "1", bg: "#2B3BFF", fg: "#fff", t: "Make the oath", d: "State a goal that can be checked online, a deadline, a stake and who gets it if you slip." },
            { n: "2", bg: "var(--accent)", fg: "var(--accent-ink)", t: "Do the thing", d: "Post your public proof as you go: a repo, a page, a published link. Check in whenever you like." },
            { n: "3", bg: "#0F1235", fg: "#fff", t: "Validators decide", d: "At the deadline they read your proof. Kept means a full refund. Broken means your stake is paid out." },
          ].map((s) => (
            <div key={s.n}>
              <div
                className="font-serif-oath flex h-[72px] w-[72px] items-center justify-center rounded-full text-[32px]"
                style={{ background: s.bg, color: s.fg }}
              >
                {s.n}
              </div>
              <h3 className="mt-5 text-2xl font-bold">{s.t}</h3>
              <p style={{ color: "var(--ink-muted)" }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-28" id="wall">
        <h2 className="font-serif-oath text-[clamp(36px,5vw,56px)]">The oath wall</h2>
        <p className="mb-12" style={{ color: "var(--ink-muted)" }}>
          Every oath is public. Sample cards shown.
        </p>
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-4">
          {MOCK_OATHS.map((p, i) => (
            <OathCard key={p.pledge_id} pledge={p} index={i} />
          ))}
        </div>
        <div className="mt-10">
          <Link href="/oaths" className="btn-pill" style={{ background: "var(--primary)", color: "#fff" }}>
            Browse the wall
          </Link>
        </div>
      </section>

      <section style={{ background: "var(--band-bg)", color: "#fff" }}>
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-24 md:grid-cols-2">
          <h2 className="font-serif-oath text-[clamp(36px,5vw,60px)] leading-tight">
            Choose who gets it if you slip.
          </h2>
          <div>
            <p className="mb-6 text-lg" style={{ color: "#C4C8F0" }}>
              A friend who&apos;ll enjoy it. A cause you care about. A rival
              you&apos;d hate to fund. The stake only stings if you pick well.
            </p>
            <div className="flex flex-wrap gap-3">
              {["A friend", "A charity", "A rival"].map((c) => (
                <span
                  key={c}
                  className="rounded-full border-2 px-5 py-2.5 font-bold"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-28 text-center" id="faq">
        <h2 className="font-serif-oath text-[clamp(40px,6vw,76px)]">Ready to mean it?</h2>
        <div className="mt-8">
          <Link
            href="/oaths/new"
            className="btn-pill"
            style={{ background: "var(--primary)", color: "#fff", minHeight: 56, padding: "18px 40px", fontSize: 18 }}
          >
            Make your first oath
          </Link>
        </div>
      </section>
    </div>
  );
}
