/** Date helpers: the contract speaks unix seconds; humans get a calendar. */

export function unixToDateInput(unix: number): string {
  const d = new Date(unix * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateInputToUnix(dateStr: string): number {
  // End of the chosen day, UTC — the oath is due "by" that date.
  return Math.floor(Date.parse(dateStr + "T23:59:59Z") / 1000);
}

export function formatDeadline(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function todayInput(): string {
  return unixToDateInput(Math.floor(Date.now() / 1000));
}

/** Accepts a unix timestamp, an ISO date, or anything Date.parse handles. */
export function parseDateParam(raw: string | null): string {
  if (!raw) return "";
  if (/^\d{9,10}$/.test(raw.trim())) {
    return unixToDateInput(Number(raw.trim()));
  }
  const ms = Date.parse(raw);
  if (!Number.isNaN(ms)) return unixToDateInput(Math.floor(ms / 1000));
  return "";
}
