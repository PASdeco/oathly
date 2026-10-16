"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchByOwner, fetchProfile } from "@/lib/genlayer";
import { OathCard } from "@/components/OathCard";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const profileQuery = useQuery({
    queryKey: ["profile", address],
    queryFn: () => fetchProfile(address),
  });
  const oathsQuery = useQuery({
    queryKey: ["profile-oaths", address],
    queryFn: () => fetchByOwner(address),
  });

  const stats = profileQuery.data;
  const oaths = oathsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16">
      <p
        className="font-mono-oath text-sm"
        style={{ color: "var(--ink-muted)" }}
      >
        PUBLIC PROFILE
      </p>
      <h1 className="font-serif-oath break-all text-[clamp(28px,4vw,48px)]">
        {address}
      </h1>
      {stats ? (
        <p style={{ color: "var(--ink-muted)" }}>
          {stats.kept} kept · {stats.broken} broken · {stats.active} active ·{" "}
          {oaths.length} total
        </p>
      ) : (
        <p aria-live="polite">Loading profile…</p>
      )}
      {oathsQuery.isError && (
        <p role="alert">Chain read failed. Try again.</p>
      )}
      <div className="mt-8 grid gap-7 md:grid-cols-3">
        {oaths.map((p, i) => (
          <OathCard key={p.pledge_id} pledge={p} index={i} />
        ))}
      </div>
      {!oathsQuery.isLoading && oaths.length === 0 && (
        <p className="mt-6">No public oaths for this address.</p>
      )}
    </div>
  );
}
