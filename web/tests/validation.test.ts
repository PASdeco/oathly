import { describe, it, expect } from "vitest";
import { isSupportedPlatform } from "@/lib/validation";

describe("platform guard", () => {
  it("rejects X / IG / TikTok", () => {
    expect(isSupportedPlatform("https://x.com/user")).toBe(false);
    expect(isSupportedPlatform("https://instagram.com/p/x")).toBe(false);
    expect(isSupportedPlatform("https://tiktok.com/@x")).toBe(false);
  });
  it("rejects shorteners", () => {
    expect(isSupportedPlatform("https://bit.ly/abc")).toBe(false);
  });
  it("accepts github api + rss", () => {
    expect(
      isSupportedPlatform("https://api.github.com/repos/a/b/releases")
    ).toBe(true);
    expect(isSupportedPlatform("https://example.com/feed.xml")).toBe(true);
  });
});
