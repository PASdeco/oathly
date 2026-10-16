"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchPledge, callPledgeMethod, explorerTxUrl } from "@/lib/genlayer";
import { extractErrorMessage } from "@/lib/errors";
import { useWallet } from "@/components/WalletProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { stakeToGen } from "@/lib/types";

export default function OathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["oath", id],
    queryFn: () => fetchPledge(id),
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
  const isOwner = address?.toLowerCase() === p.owner.toLowerCase();
  const countdown = Math.max(0, Math.ceil((p.deadline - Date.now() / 1000) / 86400));

  return (
    <div className="mx-auto max-w-[900px] px-6 py-16">
      <StatusBadge status={p.status} />
      <h1 className="font-serif-oath mt-4 text-[clamp(30px,4.5vw,52px)] leading-tight">
        I will {p.goal}. If I don&apos;t, {stakeToGen(p.stake_wei)} GEN goes to {p.recipient.slice(0, 10)}….
      </h1>
      <p className="mt-4" style={{ color: "var(--ink-muted)" }}>
        {countdown} days left · Stake {stakeToGen(p.stake_wei)} GEN · Recipient {p.recipient}
      </p>
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
            <ul className="mt-2 list-disc pl-6 text-sm">
              {p.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
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
        {(p.status === "ACTIVE" || p.status === "UNCLEAR_HOLD") && (
          <button className="btn-pill border-2" style={{ borderColor: "var(--border)" }} onClick={() => call("request_verdict", [p.pledge_id])}>
            Request verdict
          </button>
        )}
        {isOwner && p.status === "UNCLEAR_HOLD" && (
          <button className="btn-pill border-2" style={{ borderColor: "var(--border)" }} onClick={() => call("submit_extra_proof", [p.pledge_id, url])}>
            Submit extra proof
          </button>
        )}
        {(p.status === "KEPT" || p.status === "BROKEN") && !p.appeal_used && (
          <button className="btn-pill border-2" style={{ borderColor: "var(--border)" }} onClick={() => call("appeal", [p.pledge_id], BigInt(10 ** 15))}>
            Appeal (0.001 GEN bond)
          </button>
        )}
        {(p.status === "KEPT" || p.status === "BROKEN") && !p.settled && (
          <button className="btn-pill" style={{ background: "var(--accent)", color: "var(--accent-ink)" }} onClick={() => call("settle", [p.pledge_id])}>
            Settle
          </button>
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
