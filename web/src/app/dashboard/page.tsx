"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/components/WalletProvider";
import { fetchByOwner, fetchByRecipient } from "@/lib/genlayer";
import { OathCard } from "@/components/OathCard";

export default function DashboardPage() {
  const { address } = useWallet();
  const [tab, setTab] = useState<"mine" | "holding">("mine");

  const mineQuery = useQuery({
    queryKey: ["dashboard-mine", address],
    queryFn: () => fetchByOwner(address as string),
    enabled: Boolean(address),
  });
  const holdingQuery = useQuery({
    queryKey: ["dashboard-holding", address],
    queryFn: () => fetchByRecipient(address as string),
    enabled: Boolean(address),
  });

  if (!address)
    return <p className="p-10">Connect your wallet to see your dashboard.</p>;

  const mine = mineQuery.data ?? [];
  const holding = holdingQuery.data ?? [];
  const kept = mine.filter((p) => p.verdict === "KEPT").length;
  const rate = mine.length === 0 ? 0 : Math.round((kept / mine.length) * 100);
  const shown = tab === "mine" ? mine : holding;
  const loading = mineQuery.isLoading || holdingQuery.isLoading;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16">
      <h1 className="font-serif-oath text-[clamp(36px,5vw,56px)]">Dashboard</h1>
      <p style={{ color: "var(--ink-muted)" }}>
        {mine.length} oaths · {kept} kept · {rate}% keep-rate ·{" "}
        {holding.length} holding as recipient
      </p>
      <div
        className="mt-8 flex gap-2"
        role="tablist"
        aria-label="Dashboard tabs"
      >
        {(["mine", "holding"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="btn-pill border-2"
            style={{
              borderColor: "var(--border)",
              background: tab === t ? "var(--primary)" : "transparent",
              color: tab === t ? "#fff" : "var(--ink)",
            }}
          >
            {t === "mine" ? "My oaths" : "Oaths I'm holding"}
          </button>
        ))}
      </div>
      {loading && (
        <p className="mt-8" aria-live="polite">
          Loading from StudioNet…
        </p>
      )}
      {(mineQuery.isError || holdingQuery.isError) && (
        <p className="mt-8" role="alert">
          Chain read failed (StudioNet may be slow). Try again.
        </p>
      )}
      <div className="mt-6 grid gap-7 md:grid-cols-3">
        {shown.map((p, i) => (
          <OathCard key={p.pledge_id} pledge={p} index={i} />
        ))}
      </div>
      {!loading && shown.length === 0 && (
        <p className="mt-6">
          {tab === "mine"
            ? "No oaths yet — make your first oath."
            : "Nobody named you as recipient yet."}
        </p>
      )}
    </div>
  );
}
