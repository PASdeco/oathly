import { z } from "zod";

export const createOathSchema = z.object({
  goal: z.string().min(4).max(140),
  criteria: z.string().min(10).max(500),
  template: z.enum(["ship_code", "publish_posts", "public_page", "custom"]),
  proof_sources: z.array(z.string().url().max(500)).min(1).max(3),
  deadline: z.number().int().positive(),
  recipient: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Must be a 0x address"),
  stakeGen: z.number().positive().min(0.001),
});

export type CreateOathInput = z.infer<typeof createOathSchema>;

export function isSupportedPlatform(url: string): boolean {
  const low = url.toLowerCase();
  if (/(twitter\.com|x\.com|instagram\.com|tiktok\.com)/.test(low)) return false;
  if (/(bit\.ly|t\.co|tinyurl|goo\.gl|ow\.ly|is\.gd)/.test(low)) return false;
  return /^https?:\/\//.test(url);
}
