import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Flag,
  HelpCircle,
} from "lucide-react";
import type { PledgeStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: PledgeStatus }) {
  const map: Record<string, { label: string; Icon: typeof Clock; bg: string; fg: string }> = {
    KEPT: { label: "Kept", Icon: CheckCircle2, bg: "var(--ink)", fg: "#fff" },
    ACTIVE: { label: "In progress", Icon: Clock, bg: "var(--sticker-lilac)", fg: "var(--ink)" },
    BROKEN: { label: "Broken", Icon: XCircle, bg: "var(--ink)", fg: "var(--sticker-pink)" },
    AWAITING_VERDICT: { label: "Awaiting verdict", Icon: Loader2, bg: "var(--primary)", fg: "#fff" },
    UNCLEAR_HOLD: { label: "Needs proof", Icon: AlertTriangle, bg: "var(--accent)", fg: "var(--accent-ink)" },
    SETTLED: { label: "Settled", Icon: Flag, bg: "var(--surface-soft)", fg: "var(--ink)" },
    CANCELLED: { label: "Cancelled", Icon: XCircle, bg: "var(--surface-soft)", fg: "var(--ink)" },
    INCONCLUSIVE: { label: "Inconclusive", Icon: HelpCircle, bg: "var(--surface-soft)", fg: "var(--ink)" },
  };
  const item = map[status] ?? map.ACTIVE;
  const { Icon } = item;
  return (
    <span
      className="font-mono-oath inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
      style={{ background: item.bg, color: item.fg }}
    >
      <Icon size={14} aria-hidden="true" />
      {item.label}
    </span>
  );
}
