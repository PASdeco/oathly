"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useWallet } from "@/components/WalletProvider";
import { createPledgeTx, explorerTxUrl } from "@/lib/genlayer";
import { isSupportedPlatform } from "@/lib/validation";
import { extractErrorMessage } from "@/lib/errors";
import { CONTRACT_ADDRESS, MOCK_MODE } from "@/lib/config";
import {
  dateInputToUnix,
  formatDeadline,
  parseDateParam,
  todayInput,
} from "@/lib/dates";
import { Info, Link2, TriangleAlert } from "lucide-react";

type TemplateId = "ship_code" | "publish_posts" | "public_page" | "custom";

const TEMPLATES: {
  id: TemplateId;
  label: string;
  hint: string;
  urlLabel: string;
  urlExample: string;
  urlHelp: string;
  checks: string;
}[] = [
  {
    id: "ship_code",
    label: "Ship code",
    hint: "A GitHub release, merged PRs or commits.",
    urlLabel: "GitHub API URL",
    urlExample: "https://api.github.com/repos/OWNER/REPO/releases",
    urlHelp:
      "Paste the api.github.com URL for your repo's releases or commits — not the github.com page. Validators read real timestamps from the API, so your deadline is checked against actual merge/release dates.",
    checks: "Validators confirm a release or merged work timestamped on or before your deadline.",
  },
  {
    id: "publish_posts",
    label: "Publish N posts",
    hint: "Dated posts on a blog or feed.",
    urlLabel: "Blog RSS / Atom feed URL",
    urlExample: "https://yourblog.com/feed.xml",
    urlHelp:
      "Paste your blog's RSS or Atom feed URL (it usually ends in /feed, /rss.xml or /atom.xml). Validators count dated items inside your oath window.",
    checks: "Validators count dated feed items published inside your oath window.",
  },
  {
    id: "public_page",
    label: "Public page shows X",
    hint: "Any public page stating your progress.",
    urlLabel: "Public page URL",
    urlExample: "https://example.com/portfolio",
    urlHelp:
      "Paste the exact public page that shows your progress — a stats page, portfolio, or docs site. It must state the result in words a stranger can verify.",
    checks: "Validators read the page and check it states the promised result with a verifiable date.",
  },
  {
    id: "custom",
    label: "Custom",
    hint: "Anything else provable online (up to 3 URLs).",
    urlLabel: "Proof URLs (up to 3)",
    urlExample: "https://example.com/my-proof",
    urlHelp:
      "Add up to 3 public URLs plus criteria below describing exactly how they prove the goal. The clearer the rule, the fairer the verdict.",
    checks: "Validators apply your criteria text to the pages you link.",
  },
];

function isSocialBlocked(url: string): boolean {
  return /(twitter\.com|x\.com|instagram\.com|tiktok\.com|facebook\.com|linkedin\.com)/i.test(
    url
  );
}

function NewOathInner() {
  const params = useSearchParams();
  const { address } = useWallet();
  const [template, setTemplate] = useState<TemplateId>("ship_code");
  const [goal, setGoal] = useState(params.get("goal") ?? "");
  const [criteria, setCriteria] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);
  const [date, setDate] = useState(
    () => parseDateParam(params.get("date")) || ""
  );
  const [stake, setStake] = useState(params.get("amount") ?? "1");
  const [recipient, setRecipient] = useState(params.get("recipient") ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [txUrl, setTxUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const guide = useMemo(
    () => TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0],
    [template]
  );
  const deadlineUnix = date ? dateInputToUnix(date) : 0;

  function setUrl(i: number, v: string) {
    setUrls((prev) => prev.map((u, k) => (k === i ? v : u)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setTxUrl(null);
    if (MOCK_MODE || !CONTRACT_ADDRESS) {
      setStatus(
        "On-chain contract is not configured in this build (mock mode). Set NEXT_PUBLIC_CONTRACT_ADDRESS and restart the dev server."
      );
      return;
    }
    if (!address) {
      setStatus("Connect your wallet first — the stake is locked on-chain.");
      return;
    }
    const cleanUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (goal.trim().length < 4 || goal.trim().length > 140) {
      setStatus("Goal must be 4–140 characters.");
      return;
    }
    if (criteria.trim().length < 10 || criteria.trim().length > 500) {
      setStatus("Success criteria must be 10–500 characters in plain English.");
      return;
    }
    if (cleanUrls.length < 1 || cleanUrls.length > 3) {
      setStatus("Add 1–3 proof URLs — these are what validators actually fetch.");
      return;
    }
    for (const u of cleanUrls) {
      if (!isSupportedPlatform(u)) {
        setStatus(
          `That URL can't be used: ${u}. X, Instagram, TikTok and short links block automated fetching — see why below.`
        );
        return;
      }
    }
    if (!date || Number.isNaN(deadlineUnix)) {
      setStatus("Pick a deadline from the calendar.");
      return;
    }
    if (deadlineUnix <= Date.now() / 1000 + 3600) {
      setStatus("Deadline must be at least 1 hour in the future.");
      return;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient.trim())) {
      setStatus("Recipient must be a 0x wallet address (40 hex characters).");
      return;
    }
    if (recipient.trim().toLowerCase() === address.toLowerCase()) {
      setStatus("Recipient can't be your own address — that would make the stake meaningless.");
      return;
    }
    const stakeNum = Number(stake);
    if (!Number.isFinite(stakeNum) || stakeNum < 0.001) {
      setStatus("Minimum stake is 0.001 GEN.");
      return;
    }
    const eth = (window as unknown as { ethereum?: unknown }).ethereum as
      | undefined
      | {
          request: (args: { method: string; params?: unknown }) => Promise<unknown>;
        };
    if (!eth) {
      setStatus("No wallet found. Install MetaMask to seal oaths on-chain.");
      return;
    }
    const stakeWei = BigInt(Math.floor(stakeNum * 1e18));
    try {
      const balHex = (await eth.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })) as string;
      const balance = BigInt(balHex);
      if (balance < stakeWei) {
        const have = Number(balance) / 1e18;
        setStatus(
          `Insufficient GEN: your wallet holds ~${have.toFixed(4)} GEN but this oath locks ${stakeNum} GEN (plus a small consensus fee). Fund your wallet from the Studio faucet and try again.`
        );
        return;
      }
    } catch {
      /* balance hint is best-effort; the chain will still enforce it */
    }
    try {
      setBusy(true);
      setStatus("Signing → submitted → awaiting consensus…");
      const { txId } = await createPledgeTx({
        from: address,
        provider: eth,
        goal: goal.trim(),
        criteria: criteria.trim(),
        template,
        proof_sources: cleanUrls,
        deadline: deadlineUnix,
        recipient: recipient.trim(),
        stakeWei,
      });
      setTxUrl(explorerTxUrl(txId));
      setStatus("Oath sealed and finalized on StudioNet. It is now on the wall.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("create_pledge failed:", err);
      setStatus(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = {
    borderColor: "var(--border)",
    background: "var(--surface)",
  };

  return (
    <div className="mx-auto max-w-[800px] px-6 py-16">
      <h1 className="font-serif-oath text-[clamp(36px,5vw,56px)]">
        Make your oath
      </h1>
      <p style={{ color: "var(--ink-muted)" }}>
        You lock GEN in the contract. Validators fetch your proof URLs after
        the deadline — <strong>kept means refunded, broken means paid to your
        recipient</strong>. This is a StudioNet prototype: no real funds.
      </p>

      <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-6">
        <fieldset>
          <legend className="font-bold">
            1 · What kind of goal is it?
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Goal template">
            {TEMPLATES.map((t) => (
              <label
                key={t.id}
                className="card-oath cursor-pointer border-2 p-4"
                style={{
                  ...field,
                  outline: template === t.id ? "3px solid var(--primary)" : "none",
                }}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={template === t.id}
                  onChange={() => setTemplate(t.id)}
                  className="mr-2"
                />
                <strong>{t.label}</strong>
                <span
                  className="block text-sm"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {t.hint}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div
          className="card-oath flex gap-3 border-2 p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
        >
          <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p>
              <strong>{guide.label}: what URL do I paste?</strong>
            </p>
            <p className="mt-1">{guide.urlHelp}</p>
            <p className="font-mono-oath mt-2 break-all text-xs">
              Example: {guide.urlExample}
            </p>
            <p className="mt-2">
              <strong>How you win:</strong> {guide.checks}
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-bold">2 · Your goal (4–140 chars)</span>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="rounded-xl border-2 p-3"
            style={field}
            placeholder="Ship v1 of my portfolio site"
            maxLength={140}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-bold">
            3 · Success rule in plain English (10–500 chars)
          </span>
          <textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            rows={3}
            className="rounded-xl border-2 p-3"
            style={field}
            placeholder="My portfolio shows 5 projects with live links, dated before the deadline"
            maxLength={500}
          />
          <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Write it so a stranger could judge it — validators only see this
            text plus your URLs.
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-bold">4 · {guide.urlLabel}</span>
          {urls.map((u, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  value={u}
                  onChange={(e) => setUrl(i, e.target.value)}
                  className="flex-1 rounded-xl border-2 p-3"
                  style={field}
                  placeholder="https://…"
                  inputMode="url"
                  aria-label={`Proof URL ${i + 1}`}
                />
                {urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setUrls((p) => p.filter((_, k) => k !== i))}
                    className="btn-pill border-2"
                    style={{ borderColor: "var(--border)" }}
                    aria-label={`Remove URL ${i + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
              {u.trim() && isSocialBlocked(u.trim()) && (
                <p className="flex items-start gap-1 text-sm font-bold" role="alert">
                  <TriangleAlert size={16} aria-hidden="true" className="mt-0.5" />
                  X / Instagram / TikTok links don&apos;t work here — they
                  require login and block bots, so validators can&apos;t fetch
                  them. Link a public blog, feed, or GitHub URL instead.
                </p>
              )}
            </div>
          ))}
          {urls.length < 3 && (
            <button
              type="button"
              onClick={() => setUrls((p) => [...p, ""])}
              className="btn-pill self-start border-2"
              style={{ borderColor: "var(--border)" }}
            >
              <Link2 size={16} aria-hidden="true" /> Add another URL ({urls.length}/3)
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="font-bold">5 · Deadline</span>
            <input
              type="date"
              value={date}
              min={todayInput()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border-2 p-3"
              style={{ ...field, minHeight: 50 }}
              aria-describedby="deadline-help"
            />
            <span id="deadline-help" className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Tap to open the calendar. Due end of that day (UTC).
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-bold">6 · Stake (GEN)</span>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="rounded-xl border-2 p-3"
              style={{ ...field, minHeight: 50 }}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-bold">7 · Recipient (0x…)</span>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="rounded-xl border-2 p-3"
              style={{ ...field, minHeight: 50 }}
              placeholder="0x…"
              spellCheck={false}
            />
            <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Friend, charity or rival — who gets the stake if you slip.
            </span>
            {recipient.trim() &&
              !/^0x[0-9a-fA-F]{40}$/.test(recipient.trim()) && (
                <span className="text-sm font-bold" role="alert">
                  That doesn&apos;t look like a wallet address yet — it must
                  start with 0x and be 40 hex characters (0–9, a–f) long.
                </span>
              )}
          </label>
        </div>

        <div
          className="card-oath border-2 p-5"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          aria-live="polite"
        >
          <p className="font-serif-oath text-xl leading-relaxed">
            I will {goal.trim() || "[goal]"} by{" "}
            {date ? formatDeadline(deadlineUnix) : "[date]"}. If I don&apos;t,{" "}
            {stake || "[amount]"} GEN goes to{" "}
            {recipient.trim() ? recipient.trim().slice(0, 10) + "…" : "[recipient]"}.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="btn-pill"
          style={{ background: "var(--primary)", color: "#fff", minHeight: 52 }}
        >
          {busy ? "Sealing on StudioNet…" : "Seal my oath"}
        </button>
        {status && (
          <p aria-live="polite" className="text-sm font-bold">
            {status}{" "}
            {txUrl && (
              <a
                href={txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on-chain transaction
              </a>
            )}
          </p>
        )}
      </form>
    </div>
  );
}

export default function NewOathPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading…</p>}>
      <NewOathInner />
    </Suspense>
  );
}
