import { describe, it, expect } from "vitest";
import {
  dateInputToUnix,
  formatDeadline,
  parseDateParam,
  unixToDateInput,
} from "@/lib/dates";

describe("date helpers", () => {
  it("round-trips unix to date input", () => {
    expect(unixToDateInput(dateInputToUnix("2026-11-01"))).toBe("2026-11-01");
  });
  it("deadline lands at end of chosen day", () => {
    const unix = dateInputToUnix("2026-11-01");
    expect(new Date(unix * 1000).toISOString()).toContain("2026-11-01T23:59:59");
  });
  it("parses unix and ISO params from the landing builder", () => {
    expect(parseDateParam("1792556947")).toBe(
      unixToDateInput(1792556947)
    );
    expect(parseDateParam("2026-12-25")).toBe("2026-12-25");
    expect(parseDateParam("not a date")).toBe("");
    expect(parseDateParam(null)).toBe("");
  });
  it("formats a human deadline", () => {
    expect(formatDeadline(dateInputToUnix("2026-11-01"))).toContain("2026");
  });
});
