import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oathly.vercel.app";
  return [
    { url: base + "/", lastModified: new Date() },
    { url: base + "/oaths", lastModified: new Date() },
    { url: base + "/how-it-works", lastModified: new Date() },
    { url: base + "/faq", lastModified: new Date() },
  ];
}
