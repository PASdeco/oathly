import Link from "next/link";
import { ChainBadge } from "@/components/ChainBadge";

export function Footer() {
  return (
    <footer
      className="mt-16 border-t px-6 py-8 text-center text-sm"
      style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
    >
      <p>
        <ChainBadge />
      </p>
      <p className="mt-3">Oathly prototype on GenLayer StudioNet. No real funds.</p>
      <p className="mt-2 flex flex-wrap justify-center gap-4">
        <Link href="/how-it-works">How it works</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/docs">Docs</Link>
      </p>
    </footer>
  );
}
