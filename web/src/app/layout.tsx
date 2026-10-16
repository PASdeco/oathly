import type { Metadata } from "next";
import { Young_Serif, Figtree, DM_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { NetworkBanner } from "@/components/NetworkBanner";

const youngSerif = Young_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-young-serif",
  display: "swap",
});

const figtree = Figtree({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gen-oathly.vercel.app"
  ),
  title: "Oathly — Say it. Stake it. Keep it.",
  description:
    "Put money behind a public goal. Prove you did it and you get it back. Miss, and it goes to someone you chose. Prototype on GenLayer StudioNet.",
  openGraph: {
    title: "Oathly — Say it. Stake it. Keep it.",
    description:
      "Commitment contracts on GenLayer. Stake GEN on a public goal, prove it, get refunded.",
    images: ["/brand/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Oathly — Say it. Stake it. Keep it.",
    description: "Commitment contracts on GenLayer StudioNet. No real funds.",
    images: ["/brand/og.png"],
  },
};

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("oathly-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${youngSerif.variable} ${figtree.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/brand/favicon.svg"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/brand/favicon-dark.svg"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <NetworkBanner />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
