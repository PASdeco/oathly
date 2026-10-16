"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { OathCard } from "@/components/OathCard";
import { fetchWall } from "@/lib/genlayer";

const FILTERS = ["ALL", "ACTIVE", "KEPT", "BROKEN"] as const;

export default function WallPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["wall", filter],
    queryFn: () => fetchWall(filter === "ACTIVE" ? "IN_PROGRESS" : filter, 0),
  });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16">
      <h1 className="font-serif-oath text-[clamp(36px,5vw,56px)]">The wall</h1>
      <p style={{ color: "var(--ink-muted)" }}>
        Every oath is public. Oathly prototype on GenLayer StudioNet. No real funds.
      </p>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter oaths">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className="btn-pill border-2"
            style={{
              borderColor: "var(--border)",
              background: filter === f ? "var(--primary)" : "transparent",
              color: filter === f ? "#fff" : "var(--ink)",
            }}
          >
            {f === "ALL" ? "All" : f === "ACTIVE" ? "In progress" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {isLoading && <p className="mt-10" aria-live="polite">Loading oaths…</p>}
      {isError && <p className="mt-10" role="alert">Could not load the wall. Try again.</p>}
      {data && data.pledges.length === 0 && (
        <p className="mt-10">No oaths yet. Be the first to mean it.</p>
      )}
      <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
        {(data?.pledges ?? []).map((p, i) => (
          <OathCard key={p.pledge_id} pledge={p} index={i} />
        ))}
      </div>
    </div>
  );
}
