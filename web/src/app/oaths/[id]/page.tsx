"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchPledge,
  fetchPolicy,
  callPledgeMethod,
  explorerTxUrl,
} from "@/lib/genlayer";
import { extractErrorMessage } from "@/lib/errors";
import { useWallet } from "@/components/WalletProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { stakeToGen } from "@/lib/types";

function fmtDelta(sec: number): string {
  if (sec <= 0) return "now";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function OathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [appealUrl, setAppealUrl] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["oath", id],
    queryFn: () => fetchPledge(id),
  });
  const { data: policy } = useQuery({
    queryKey: ["policy"],
    queryFn: () => fetchPolicy(),
    staleTime: 10 * 60 * 1000,
  });

  async function call(method: string, methodArgs: unknown[], value?: bigint) {
    setMsg(null);
    if (!address) {
      setMsg("Connect your wallet first.");
      return;
    }
    try {
      setMsg("Signing → submitted → awaiting consensus. Validators can take a few minutes.");
      const eth = (window as unknown as { ethereum?: unknown }).ethereum;
      const { txId } = await callPledgeMethod({
        from: address,
        provider: eth,
        method,
        methodArgs,
        value,
      });
      setMsg("Finalized. " + explorerTxUrl(txId));
      refetch();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(method + " failed:", e);
      setMsg(extractErrorMessage(e));
    }
  }

  if (isLoading) return <p className="p-10" aria-live="polite">Loading oath…</p>;
  if (isError || !data) return <p className="p-10" role="alert">Oath not found.</p>;

  const p = data;
  const nowSec = Date.now() / 1000;
  const isOwner = address?.toLowerCase() === p.owner.toLowerCase();
  const isRecipient = address?.toLowerCase() === p.recipient.toLowerCase();
  const bondWei = BigInt(policy?.bond_wei ?? 10 ** 15);
  const deadlineReached = nowSec >= p.deadline;
  const holdActive = p.status === "UNCLEAR_HOLD" && nowSec <= p.hold_until;
  const holdExpired = p.status === "UNCLEAR_HOLD" && nowSec > p.hold_until;
  const appealOpen =
    (p.status === "KEPT" || p.status === "BROKEN") &&
    !p.appeal_used &&
    nowSec <= p.appeal_deadline;
  const canAppeal =
    appealOpen && ((p.status === "KEPT" && isRecipient) || (p.status === "BROKEN" && isOwner));
  const canSettle =
    (p.status === "KEPT" || p.status === "BROKEN") &&
    !p.settled &&
    (p.appeal_used || nowSec > p.appeal_deadline);
  const windowStillOpen =
    (p.status === "KEPT" || p.status === "BROKEN") &&
    !p.settled &&
    !p.appeal_used &&
    nowSec <= p.appeal_deadline;
  const canRequest =
    (p.status === "ACTIVE" && deadlineReached) || (p.status === "UNCLEAR_HOLD" && holdExpired);
  const coolingOpen =
    p.status === "ACTIVE" &&
    nowSec <= p.created_at + (policy?.cooling_seconds ?? 3600);

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16">
      <StatusBadge status={p.status} />
      <h1 className="font-serif-oath mt-4 text-[clamp(30px,4.5vw,52px)] leading-tight">
        I will {p.goal}. If I don&apos;t, {stakeToGen(p.stake_wei)} GEN goes to {p.recipient.slice(0, 10)}….
      </h1>
      <p className="mt-4" style={{ color: "var(--ink-muted)" }}>
        {p.status === "ACTIVE" && `${fmtDelta(p.deadline - nowSec)} until deadline · `}
        Stake {stakeToGen(p.stake_wei)} GEN · Recipient {p.recipient}
      </p>
      {p.status === "UNCLEAR_HOLD" && (
        <p className="mt-2 font-bold" style={{ color: "var(--ink)" }}>
          Verdict unclear ({p.hold_class || "unverifiable"}): {holdActive
            ? `add proof within ${fmtDelta(p.hold_until - nowSec)} or the second run decides.`
            : "grace period over — request the final verdict."}
        </p>
      )}
      <div className="mt-6">
        <h2 className="font-bold">Success rule</h2>
        <p>{p.criteria}</p>
        <h2 className="mt-4 font-bold">Proof sources</h2>
        <ul className="list-disc pl-6">
          {p.proof_sources.map((u) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" className="underline">
                {u}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {p.verdict && (
        <div className="card-oath mt-8 border-2 p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="font-bold">Verdict: {p.verdict}</h2>
          <p>{p.verdict_reason}</p>
          {p.evidence.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              {p.evidence.map((e) => (
                <li key={e.url} className="font-mono-oath break-all">
                  {e.url} · {e.ok ? `HTTP ${e.status}` : "unreachable"}
                  {e.fp ? ` · fp ${e.fp}` : ""}
                  {e.dates.length > 0 ? ` · ${e.dates.join(", ")}` : " · no authoritative date"}
                </li>
              ))}
            </ul>
          )}
          {p.verdict === "INCONCLUSIVE" && (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              Sources stayed unverifiable after the grace period, so the stake refunds to the owner.
            </p>
          )}
        </div>
      )}

      {p.appeal && (
        <div className="card-oath mt-6 border-2 p-6" style={{ borderColor: "var(--border)", background: "var(--sticker-yellow)" }}>
          <h2 className="font-bold">Appeal {p.appeal.flipped ? "flipped the ruling" : p.appeal.rerun_outcome === "UNCLEAR" ? "stayed inconclusive" : "upheld the ruling"}</h2>
          <p>
            <span className="font-bold">{p.appeal.by}</span>: {p.appeal.reason}
          </p>
          {p.first_review && (
            <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              Original ruling: {p.first_review.verdict} — {p.first_review.reason}
            </p>
          )}
          {p.appeal.evidence.length > 0 && (
            <ul className="mt-2 list-disc pl-6 text-sm">
              {p.appeal.evidence.map((u) => (
                <li key={u} className="break-all">{u}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(p.payout.state !== "NONE" || p.bond.state !== "NONE") && (
        <div className="card-oath mt-6 border-2 p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="font-bold">Money</h2>
          {p.payout.state !== "NONE" && (
            <p className="mt-1 text-sm">
              Stake: {stakeToGen(p.payout.amount_wei)} GEN to {p.payout.to.slice(0, 10)}… (
              {p.payout.kind.replace(/_/g, " ")} · {p.payout.state.toLowerCase()})
            </p>
          )}
          {p.bond.state !== "NONE" && (
            <p className="mt-1 text-sm">
              Appeal bond: {stakeToGen(p.bond.amount_wei)} GEN to {p.bond.to.slice(0, 10)}… (
              {p.bond.state.toLowerCase()})
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-bold">Check-ins ({p.checkins.length})</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {p.checkins.map((c, i) => (
            <li key={i} className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <p>{c.note}</p>
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                  {c.url}
                </a>
              )}
            </li>
          ))}
          {p.checkins.length === 0 && <li>No check-ins yet.</li>}
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {isOwner && p.status === "ACTIVE" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              call("add_checkin", [p.pledge_id, note, url]);
            }}
            className="flex flex-col gap-2"
          >
            <h3 className="font-bold">Add check-in</h3>
            <input aria-label="Check-in note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Progress note" className="rounded-xl border-2 p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            <input aria-label="Check-in URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https:// (optional)" className="rounded-xl border-2 p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            <button className="btn-pill" style={{ background: "var(--primary)", color: "#fff" }} type="submit">
              Post check-in
            </button>
          </form>
        )}

        {isOwner && holdActive && (
          <button className="btn-pill border-2" style={{ borderColor: "var(--border)" }} onClick={() => call("submit_extra_proof", [p.pledge_id, url])}>
            Submit extra proof ({fmtDelta(p.hold_until - nowSec)} left)
          </button>
        )}

        {canRequest && (
          <button className="btn-pill border-2" style={{ borderColor: "var(--border)" }} onClick={() => call("request_verdict", [p.pledge_id])}>
            {p.status === "UNCLEAR_HOLD" ? "Request final verdict" : "Request verdict"}
          </button>
        )}

        {canAppeal && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              call(
                "appeal",
                [p.pledge_id, appealReason, appealUrl ? [appealUrl] : []],
                bondWei
              );
            }}
            className="flex flex-col gap-2"
          >
            <h3 className="font-bold">Appeal the {p.status} ruling</h3>
            <input aria-label="Appeal reason" value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Why the ruling is wrong (min 10 chars)" className="rounded-xl border-2 p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            <input aria-label="Appeal evidence URL" value={appealUrl} onChange={(e) => setAppealUrl(e.target.value)} placeholder="https:// new evidence (optional)" className="rounded-xl border-2 p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            <button className="btn-pill" style={{ background: "var(--accent)", color: "var(--accent-ink)" }} type="submit">
              Appeal with {stakeToGen(Number(bondWei))} GEN bond ({fmtDelta(p.appeal_deadline - nowSec)} left)
            </button>
          </form>
        )}

        {canSettle && (
          <button className="btn-pill" style={{ background: "var(--accent)", color: "var(--accent-ink)" }} onClick={() => call("settle", [p.pledge_id])}>
            Settle
          </button>
        )}
        {windowStillOpen && (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Appeal window open for {fmtDelta(p.appeal_deadline - nowSec)} — settlement unlocks after.
          </p>
        )}

        {p.payout.state === "UNCLAIMED" && (
          <button className="btn-pill" style={{ background: "var(--primary)", color: "#fff" }} onClick={() => call("claim_payout", [p.pledge_id])}>
            Claim stake payout ({stakeToGen(p.payout.amount_wei)} GEN → {p.payout.to.slice(0, 10)}…)
          </button>
        )}
        {p.bond.state === "UNCLAIMED" && (
          <button className="btn-pill" style={{ background: "var(--primary)", color: "#fff" }} onClick={() => call("claim_bond", [p.pledge_id])}>
            Claim appeal bond ({stakeToGen(p.bond.amount_wei)} GEN → {p.bond.to.slice(0, 10)}…)
          </button>
        )}

        {isOwner && coolingOpen && (
          <button className="btn-pill border-2" style={{ borderColor: "var(--border)" }} onClick={() => call("cancel_pledge", [p.pledge_id])}>
            Cancel oath and refund ({fmtDelta(p.created_at + (policy?.cooling_seconds ?? 3600) - nowSec)} cooling-off left)
          </button>
        )}

        {policy && (
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Appeal bond {stakeToGen(policy.bond_wei)} GEN · grace {Math.round(policy.grace_seconds / 60)} min ·
            appeal window {Math.round(policy.appeal_window_seconds / 60)} min · treasury {policy.treasury.slice(0, 10)}…
          </p>
        )}
        {msg && (
          <p aria-live="polite" className="text-sm font-bold">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
