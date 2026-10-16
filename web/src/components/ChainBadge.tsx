"use client";

import { CONTRACT_ADDRESS, MOCK_MODE, shortContract } from "@/lib/config";

export function ChainBadge() {
  return (
    <span
      className="font-mono-oath inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
      style={{ borderColor: "var(--border)" }}
      title={
        MOCK_MODE
          ? "Demo data — set a contract address to go live"
          : "Live contract: " + CONTRACT_ADDRESS
      }
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: MOCK_MODE ? "var(--accent)" : "#22c55e" }}
      />
      {MOCK_MODE ? "Mock mode" : "StudioNet live · " + shortContract()}
    </span>
  );
}
