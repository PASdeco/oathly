import Link from "next/link";
import type { Pledge } from "@/lib/types";
import { stakeToGen } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

const BACKGROUNDS = [
  "var(--sticker-yellow)",
  "var(--surface)",
  "var(--sticker-lilac)",
  "var(--sticker-pink)",
];

export function OathCard({ pledge, index = 0 }: { pledge: Pledge; index?: number }) {
  const bg = BACKGROUNDS[index % BACKGROUNDS.length];
  const tilt = index % 2 === 0 ? "sticker-tilt-l" : "sticker-tilt-r";
  const daysLeft = Math.max(
    0,
    Math.ceil((pledge.deadline - Date.now() / 1000) / 86400)
  );
  return (
    <Link
      href={`/oaths/${pledge.pledge_id}`}
      className={`card-oath block p-6 ${tilt}`}
      style={{ background: bg, color: "var(--ink)" }}
      aria-label={`Oath: ${pledge.goal}`}
    >
      <StatusBadge status={pledge.status} />
      <p className="font-serif-oath mt-4 text-2xl leading-tight">{pledge.goal}</p>
      <div
        className="mt-3 flex gap-1.5"
        role="img"
        aria-label={`${pledge.checkins.length} check-ins`}
      >
        {pledge.checkins.slice(0, 5).map((_, i) => (
          <span
            key={i}
            className="inline-block h-4 w-4 rounded-full"
            style={{ background: "var(--primary)" }}
          />
        ))}
        {pledge.checkins.length === 0 && (
          <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
            No check-ins yet
          </span>
        )}
      </div>
      <div className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
        Stake {stakeToGen(pledge.stake_wei)} GEN
        {pledge.status === "ACTIVE" && ` · ${daysLeft} days left`}
        {pledge.status === "KEPT" && " · returned"}
        {pledge.status === "BROKEN" && " · paid out"}
      </div>
    </Link>
  );
}
