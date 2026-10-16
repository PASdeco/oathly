/** Turn anything a wallet/SDK throws into a human-readable message. */

export function extractErrorMessage(err: unknown): string {
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const candidates = [
      o.message,
      o.shortMessage,
      o.details,
      o.reason,
      o.revert_reason,
      o.revertReason,
      o.cause,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
      if (c instanceof Error && c.message) return c.message;
    }
    // viem-style nested cause
    if (o.cause && typeof o.cause === "object") {
      const nested = extractErrorMessage(o.cause);
      if (nested !== "Transaction failed.") return nested;
    }
    try {
      const s = JSON.stringify(o);
      if (s && s !== "{}" && s.length > 2) return s.slice(0, 300);
    } catch {
      /* fall through */
    }
  }
  return "Transaction failed.";
}

export function isUserRejection(err: unknown): boolean {
  const msg = extractErrorMessage(err).toLowerCase();
  return (
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("rejected the request") ||
    msg.includes("action_rejected")
  );
}
