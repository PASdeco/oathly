/** Single place the UI reads chain wiring — no more guessing about env. */

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const MOCK_MODE =
  process.env.NEXT_PUBLIC_MOCK_MODE === "true" || !CONTRACT_ADDRESS;

export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ??
  "https://explorer-studio.genlayer.com";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 61999);

export function shortContract(): string {
  if (!CONTRACT_ADDRESS) return "not configured";
  return CONTRACT_ADDRESS.slice(0, 6) + "…" + CONTRACT_ADDRESS.slice(-4);
}
