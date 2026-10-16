"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToStudioNet: () => Promise<void>;
}

const Ctx = createContext<WalletState>({
  address: null,
  chainId: null,
  connecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  switchToStudioNet: async () => {},
});

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = "0xF21F";
export const STUDIONET_RPC = "https://studio.genlayer.com/api";
export const STUDIONET_EXPLORER = "https://explorer-studio.genlayer.com";

type EthProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...a: unknown[]) => void) => void;
};

function getProvider(): EthProvider | undefined {
  return (window as unknown as { ethereum?: EthProvider }).ethereum;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const eth = getProvider();
    if (!eth) return;
    try {
      const accounts = (await eth.request({
        method: "eth_accounts",
      })) as string[];
      setAddress(accounts?.[0] ?? null);
      const chainHex = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(chainHex, 16));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const last = localStorage.getItem("oathly-wallet");
      if (last) setAddress(last);
    } catch {}
    refresh();
    const eth = getProvider();
    if (!eth?.on) return;
    const onAccounts = (accs: unknown) =>
      setAddress((accs as string[])?.[0] ?? null);
    const onChain = (hex: unknown) =>
      setChainId(parseInt(String(hex), 16));
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const eth = getProvider();
      if (!eth) {
        setError("No wallet installed. Install MetaMask to continue.");
        window.open(
          "https://metamask.io/download/",
          "_blank",
          "noopener,noreferrer"
        );
        return;
      }
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const addr = accounts?.[0] ?? null;
      const chainHex = (await eth.request({ method: "eth_chainId" })) as string;
      setAddress(addr);
      setChainId(parseInt(chainHex, 16));
      if (addr) {
        try {
          localStorage.setItem("oathly-wallet", addr);
        } catch {}
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Wallet connection was rejected."
      );
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchToStudioNet = useCallback(async () => {
    setError(null);
    const eth = getProvider();
    if (!eth) {
      setError("No wallet installed.");
      return;
    }
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET_CHAIN_HEX }],
      });
    } catch (e) {
      const err = e as { code?: number; message?: string };
      if (err?.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: STUDIONET_CHAIN_HEX,
              chainName: "GenLayer StudioNet",
              rpcUrls: [STUDIONET_RPC],
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
              blockExplorerUrls: [STUDIONET_EXPLORER],
            },
          ],
        });
      } else {
        setError(err?.message ?? "Network switch was rejected.");
        return;
      }
    }
    refresh();
  }, [refresh]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    try {
      localStorage.removeItem("oathly-wallet");
    } catch {}
  }, []);

  return (
    <Ctx.Provider
      value={{
        address,
        chainId,
        connecting,
        error,
        connect,
        disconnect,
        switchToStudioNet,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() {
  return useContext(Ctx);
}
