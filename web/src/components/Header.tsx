"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWallet } from "@/components/WalletProvider";

function shortAddr(a: string) {
  return a.slice(0, 6) + "…" + a.slice(-4);
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { address, connecting, connect, disconnect, error } = useWallet();

  const walletButton = address ? (
    <span className="flex items-center gap-2">
      <span className="font-mono-oath text-sm" title={address}>
        {shortAddr(address)}
      </span>
      <button
        onClick={disconnect}
        className="btn-pill"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        Disconnect
      </button>
    </span>
  ) : (
    <button
      onClick={connect}
      disabled={connecting}
      className="btn-pill"
      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
    >
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );

  return (
    <div style={{ background: "var(--hero-bg)", color: "var(--hero-ink)" }}>
      <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-6 py-5">
        <Link
          href="/"
          aria-label="Oathly home"
          className="flex shrink-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="font-serif-oath flex items-center gap-2 text-[28px]">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <circle
                cx="15"
                cy="15"
                r="13"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
              />
              <path
                d="M9 15.5 L13.5 20 L21.5 10.5"
                fill="none"
                stroke="#FFE45C"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Oathly
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <nav
            className="hidden items-center gap-6 text-[15px] font-bold md:flex"
            aria-label="Primary"
          >
            <Link href="/how-it-works">How it works</Link>
            <Link href="/oaths">Oath wall</Link>
            <Link href="/faq">FAQ</Link>
          </nav>
          <ThemeToggle />
          <span className="hidden md:flex">{walletButton}</span>
          <button
            className="btn-pill mobile-only border"
            style={{ borderColor: "rgba(255,255,255,0.4)" }}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {open && (
        <nav
          className="mobile-nav flex-col gap-4 px-6 pb-6 font-bold"
          aria-label="Mobile"
        >
          <Link href="/how-it-works" onClick={() => setOpen(false)}>
            How it works
          </Link>
          <Link href="/oaths" onClick={() => setOpen(false)}>
            Oath wall
          </Link>
          <Link href="/faq" onClick={() => setOpen(false)}>
            FAQ
          </Link>
          <span className="flex items-center gap-3">{walletButton}</span>
          {error && (
            <span role="alert" className="text-sm font-normal">
              {error}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
