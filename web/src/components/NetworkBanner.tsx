"use client";

import { useWallet, STUDIONET_CHAIN_ID } from "@/components/WalletProvider";

export function NetworkBanner() {
  const { address, chainId, switchToStudioNet } = useWallet();
  if (!address || chainId === null) return null;
  if (chainId === STUDIONET_CHAIN_ID) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-3 px-6 py-3 text-center text-sm font-bold"
      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
    >
      <span>
        Wrong network — Oathly runs on GenLayer StudioNet. Switch to sign
        oaths on-chain.
      </span>
      <button
        onClick={switchToStudioNet}
        className="btn-pill border-2"
        style={{ borderColor: "currentColor", minHeight: 36, padding: "6px 16px" }}
      >
        Switch to StudioNet
      </button>
    </div>
  );
}
