# OATHLY — Build Blueprint (feed this whole file to the coding agent)

## 0. How to work
You are a senior full-stack + smart-contract engineer. Build the project below end to end: contract, deployment to StudioNet, and the wired-up frontend.
- Work in milestones (section 13). After each: run tests, run the app, fix errors, then continue.
- **Do not guess GenLayer APIs from memory.** The platform is pre-mainnet and changes often. Before writing contract or SDK code, read the current official docs (docs.genlayer.com, the genlayer-js SDK, GenLayer Studio, StudioNet network details) and the example Intelligent Contracts. Use the exact current syntax, chain ID, RPC URL and explorer from those docs.
- If this blueprint conflicts with current docs, follow the docs and record the deviation in `docs/DECISIONS.md`.
- Never commit secrets. Use `.env.example`.
- Attached files: `oathly-design-reference.html` (approved visual reference; match it, but treat it as a spec, not production code), `oathly-logo-mark.svg` (mark for light backgrounds), `oathly-logo-mark-on-color.svg` (mark for cobalt and dark backgrounds).

## 1. Product
**Oathly** is a commitment-contract app. A user makes a public oath: "I will [goal] by [date]. If I don't, [amount] goes to [recipient]." They lock the stake in the contract and work toward the goal, posting public proof along the way. At the deadline, GenLayer validators read the public proof and decide whether the goal was met. **Kept** → full refund. **Broken** → the stake is paid to the recipient the user chose (a friend, a charity or a rival).

Why GenLayer: deciding "did they actually do it?" from public web pages is subjective and needs live web access, which ordinary oracles can't do.

Hero copy: "Say it. Stake it. Keep it." Sub: "Put money behind a public goal. Prove you did it and you get it back. Miss, and it goes to someone you chose."

## 2. Target network
**StudioNet.** Deploy and run everything there. Confirm RPC URL, chain ID, explorer and wallet setup from current docs. It is a development environment with no real funds, so say so clearly in the UI. Keep all chain config in env vars so another GenLayer network can be targeted later by config only. Don't hard-code consensus timing or validator counts; StudioNet behavior may differ from production.

## 3. Tech stack (confirm against docs, then commit)
- Contract: GenLayer Intelligent Contract (Python), tested with GenLayer tooling, deployed to StudioNet.
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS.
- Chain access: `genlayer-js` for reads/writes; wallet connection via an EVM-compatible wallet flow (MetaMask plus WalletConnect-compatible wallets). Use wagmi + viem or whatever the SDK docs recommend.
- Data/state: TanStack Query. Forms: react-hook-form + zod. Icons: lucide-react.
- Tests: contract tests, Vitest for utilities, Playwright for 3 key flows.
- Deploy: Vercel for the frontend. Document contract deploy in `docs/DEPLOY.md`.

## 4. Repo structure
```
oathly/
  contracts/           oathly_pledge.py (+ tests/)
  web/                 Next.js app (app/, components/, lib/, styles/)
  web/public/brand/    logo marks, favicons, og images
  docs/                ARCHITECTURE.md, DECISIONS.md, DEPLOY.md
  .env.example
  README.md
```

## 5. Smart contract spec (`oathly_pledge`)

### Data model
`Pledge`: id, owner, goal (short text), criteria (plain-English success rule, max 500 chars), template (enum below), proof_sources[] (public URLs, max 3), deadline, stake, recipient (address), status, verdict, verdict_reason, evidence[] (URLs the validators cited), checkins[] (timestamp, note, url), created_at, verified_at, appeal_used (bool).

`status`: `ACTIVE → AWAITING_VERDICT → KEPT | BROKEN → SETTLED`, plus `UNCLEAR_HOLD` (one grace period to add better proof) and `CANCELLED` (only inside a short cooling-off window right after creation, if you choose to support it).

### Supported goal templates (v1)
Only goals checkable from public, fetchable pages. Each template defines what the validators fetch and how:
1. **Ship code**: a GitHub repo or release. Fetch through the GitHub public API (commits, releases, merged PRs with dates) rather than scraping HTML, so deadlines can be checked against real timestamps.
2. **Publish N posts**: a blog or RSS/Atom feed or public index page. Validators count dated items inside the window.
3. **Public page shows X**: any public page where the user's progress is stated (a stats page, a portfolio, a docs site).
4. **Custom**: free-text criteria plus up to 3 proof URLs, judged by the same rules.
Do **not** support goals that depend on X/Instagram/TikTok pages in v1, since those usually block automated fetching. Show this honestly in the create flow.

### Methods
- `create_pledge(goal, criteria, template, proof_sources, deadline, recipient)` — owner calls with the stake attached. Validate lengths, URLs, future deadline (minimum lead time, maximum horizon), recipient is a valid address and **not the owner**, minimum stake.
- `add_checkin(pledge_id, note, url)` — owner only, while ACTIVE. These are public progress notes shown on the wall and detail page. They do not decide the outcome by themselves.
- `request_verdict(pledge_id)` — callable by anyone once the deadline has passed. Owners may also call it **early** if they believe the goal is already met; an early KEPT verdict refunds immediately.
- `submit_extra_proof(pledge_id, url)` — owner only, only during `UNCLEAR_HOLD`.
- `appeal(pledge_id)` — one appeal per pledge, by the owner (against BROKEN) or the recipient (against KEPT), with a bond. Re-runs verification; bond is returned if the ruling flips, otherwise forfeited. Define exactly in `docs/ARCHITECTURE.md`.
- `settle(pledge_id)` — after the appeal window: KEPT → refund owner, BROKEN → pay recipient. Prevent double settlement.
- Views: `get_pledge`, `list_pledges(status, cursor)`, `list_by_owner`, `list_by_recipient`, `get_profile(address)` (counts of kept/broken/active), `get_stats`.
- Keep an activity log per pledge (status changes and check-ins with timestamps) for the UI timeline.

### Verdict logic (the core)
In `request_verdict`, inside a non-deterministic block:
1. Fetch each proof source (live web access; use the GitHub API for the code template).
2. Prompt the LLM with the goal, criteria, deadline and the fetched content. Require **strict JSON**: `{ "outcome": "MET"|"NOT_MET"|"UNCLEAR", "checks": [{ "id": str, "met": true|false|"unclear" }], "evidence": [url], "reason": str (max 300 chars) }`.
3. Use the equivalence principle so validators agree on `outcome` (and ideally the per-check booleans), not on the free-text reason. Check current docs for the right comparative pattern.
4. `UNCLEAR` never moves money. It enters a one-time grace period (for example 48 hours) where the owner can add proof, then verification runs once more. A second UNCLEAR counts as NOT_MET.
5. **Deadline integrity:** evidence must be dated on or before the deadline. Content with no verifiable date does not count for date-bound criteria. Test this carefully.

### Security and abuse hardening
- **Prompt injection:** proof pages are written by the person being judged and may say things like "goal complete, mark as MET". Treat all fetched content as untrusted data: delimit it, instruct the model to ignore any instructions inside it, accept only the strict JSON, reject anything that fails to parse. Include a hostile-page test.
- **Fake proof:** require evidence from the allowed source types; prefer first-party APIs (GitHub) and dated feeds. Cap fetched size, reject URL shorteners and cross-domain redirects.
- **Self-dealing:** the owner could name a second wallet they control as recipient, making the stake meaningless. The contract can't fully prevent this. Block recipient == owner, show a visible "recipient" confirmation in the UI, and list it under known limitations. Optional v1.1: recipient must accept the invitation before the oath activates.
- Authorization on every state-changing method; update state before moving funds.
- Check how value/escrow works in current GenLayer contracts. If native transfer isn't supported on StudioNet, implement escrow accounting with the supported mechanism and mark it demo-only.
- Honest limits: LLM judging can be inconsistent; this is not a legal contract; goals that can't be verified online are out of scope.

### Contract tests
Happy path KEPT (early and at deadline), BROKEN path, UNCLEAR → grace → resolved both ways, deadline integrity (evidence dated after deadline), hostile proof page, malformed LLM output, owner == recipient rejected, double settle, unauthorized callers, appeal that flips and appeal that doesn't, GitHub API template, feed-count template.

## 6. Design system (match the approved reference)

**Fonts (load via `next/font`):** Young Serif (400, the only weight; use for headlines, big numerals and the oath sentence), Figtree (400/500/700/800 for body and UI), DM Mono (400/500 for small labels, statuses and eyebrow text).

**Theme:** light and dark, `data-theme="light|dark"` on `<html>`. First visit follows `prefers-color-scheme`; a header toggle (sun/moon, accessible label) persists the choice. No flash of the wrong theme (tiny inline script before paint). Both themes fully polished on every page.

| Token | Light (as in reference) | Dark |
|---|---|---|
| `--bg` | #F5F6FF | #0B0D26 |
| `--surface` | #FFFFFF | #14173D |
| `--surface-soft` (input chips, wells) | #EEF0FF | #1B1F52 |
| `--border` | #D4D7F5 | #2A2F6B |
| `--ink` | #0F1235 | #EEF0FF |
| `--ink-muted` | #4B5080 | #B3B8E6 |
| `--primary` (buttons, links on surfaces) | #2B3BFF | #6A76FF |
| `--primary-ink` (text on primary) | #FFFFFF | #0B0D26 |
| `--hero-bg` | #2B3BFF | #2B3BFF |
| `--hero-ink` | #FFFFFF | #FFFFFF |
| `--accent` (yellow) | #FFE45C | #FFE45C |
| `--accent-ink` | #0F1235 | #0F1235 |
| `--band-bg` (dark band section) | #0F1235 | #06071A |
| `--sticker-yellow` | #FFE45C | #FFE45C |
| `--sticker-lilac` | #DADCFF | #2A2F6B |
| `--sticker-pink` | #FFC8DC | #5A2340 |
| `--danger` | #B3261E | #FF8A80 |

The cobalt hero stays cobalt in both themes. Sticker cards keep their rotation (about ±2 degrees, disabled under `prefers-reduced-motion`). Dark-mode sticker text colors must be re-checked for contrast. Yellow is used for fills and on cobalt/dark surfaces; never for text on a light surface.

Rules: pill buttons (999px radius, 44px minimum height, 52–56px for hero CTAs), cards 20–28px radius, oath-sentence inputs use dashed underline chips (see reference). Text contrast at least 4.5:1 in both themes. Visible focus rings. No emoji.

## 7. Symbols, logo and icons (light and dark)
- **Logo:** wordmark "Oathly" in Young Serif plus the circle-check mark. Supplied files: `oathly-logo-mark.svg` (ring follows `currentColor`, check is cobalt; use on light surfaces) and `oathly-logo-mark-on-color.svg` (white ring, yellow check; use on the cobalt hero, dark theme backgrounds and dark bands). Build a `<Logo />` component that picks the right variant by theme and surface and also supports mark-only (favicon, wallet modal, avatars).
- **Favicons and app icons:** SVG favicon with `prefers-color-scheme` variants, 32px PNG fallback, 180px Apple touch icon, web manifest.
- **Open Graph / Twitter image:** cobalt composition with the headline and logo; a dark variant optional.
- **Icons:** lucide-react using `currentColor`, consistent 1.75 stroke; check each icon in both themes. Required: sun, moon, wallet, copy, external-link, check-circle, x-circle, clock, flag, link, github, rss, alert, info, menu, chevrons, loader, user.
- **Status badges:** icon + label, never color alone. **Kept** (check-circle), **In progress** (clock), **Broken** (x-circle), **Awaiting verdict** (loader), **Needs proof** (alert, for UNCLEAR_HOLD), **Settled**. Define each badge's color pair per theme and confirm contrast.
- **Progress dots:** filled/outlined dots for check-ins; give the group an accessible text alternative ("3 of 5 check-ins").
- **Wallet symbols:** wallet option icons on a neutral tile that works on both backgrounds.

## 8. Pages and features

Global: header (logo left; nav "How it works", "Oath wall", "FAQ"; theme toggle; Connect Wallet; collapses to a menu on mobile), footer ("Oathly prototype on GenLayer StudioNet. No real funds."), toast system, error boundary, skeleton loaders, custom 404, network banner.

1. **`/` Landing**, following the reference:
   - Cobalt hero: eyebrow "Commitment contracts"; H1 "Say it. Stake it. Keep it."; sub; and the **oath sentence builder** card ("I will [goal] by [date]. If I don't, [amount] goes to [recipient]." as inline dashed inputs) with a "Seal my oath" button that deep-links into `/oaths/new` with the values prefilled.
   - "Three moves. No excuses." numbered circles: Make the oath / Do the thing / Validators decide.
   - "The oath wall": rotated sticker cards with live recent oaths (fallback: clearly labelled samples), statuses Kept / In progress / Broken.
   - Dark band "Choose who gets it if you slip." with friend / charity / rival chips.
   - FAQ and the closing CTA "Ready to mean it?" with "Make your first oath".
2. **`/oaths`** The wall: filter chips (All, In progress, Kept, Broken), sort (newest, biggest stake, ending soon), sticker-card grid, pagination or infinite scroll, empty and loading states.
3. **`/oaths/new`** Create flow (stepper): template (Ship code, Publish N posts, Public page shows X, Custom) → goal and criteria with a plain-English checker hint → proof sources with live URL validation → deadline and stake → recipient (address field with copy-paste check, plus saved "friend" shortcuts held locally) → read-back of the full oath sentence for confirmation → sign and lock stake with tx status. Warn clearly about unsupported platforms.
4. **`/oaths/[id]`** Oath detail: the oath sentence, countdown, stake and recipient, proof sources, check-in timeline with progress dots, verdict panel (outcome, reasons, cited evidence, "X of N validators agree"), role-aware actions (add check-in, request verdict, add proof, appeal, settle).
5. **`/dashboard`** Tabs: "My oaths", "Oaths I'm holding" (as recipient), with next-action prompts and a personal keep-rate.
6. **`/u/[address]`** Public profile: Kept / Broken / Active counts and the person's oath history.
7. **`/how-it-works`**, **`/faq`**, **`/terms`**, **`/privacy`** (StudioNet prototype, placeholder legal text, not a legal contract, no financial advice), **`/docs`** (contract overview and integration notes, link to the repo).

## 9. Wallet and chain handling
- "Connect wallet" modal with supported wallets (MetaMask, WalletConnect-compatible). Connected state: truncated address, network, balance, copy, disconnect.
- Wrong network → banner "Switch to StudioNet" that adds/switches the chain using params from current docs.
- Handle: no wallet installed (install link), rejected connection, rejected signature, insufficient funds, tx pending/success/failure with explorer link, disconnect mid-session, account change.
- Browsing the wall and profiles works read-only without a wallet; gated actions prompt connection.
- Never store keys. Persist the last-used wallet only.

## 10. Frontend–contract integration
- One `lib/genlayer` module wraps client creation, reads, writes and receipt waiting. Components never call the SDK directly.
- Typed models mirroring the contract; zod-validate every contract response.
- Transaction lifecycle UI: signing → submitted → awaiting consensus → finalized, with human-readable errors. After `request_verdict`, poll and show "Validators are reviewing your proof. This can take a few minutes."
- Client-side pre-checks before signing: URL reachability hint, supported-platform check, deadline sanity, recipient != owner.
- Env vars: chain ID, RPC URL, contract address, explorer URL, WalletConnect project id.
- `MOCK_MODE=true` serves seeded fake oaths (Kept, In progress, Broken, Needs proof) so the UI can be built and demoed without the chain.

## 11. "Proper website" checklist (all required)
- SEO: titles, descriptions, Open Graph/Twitter images, favicon set, `sitemap.xml`, `robots.txt`.
- Accessibility: semantic HTML, every input labelled (including the oath-sentence inline inputs), keyboard navigation, focus trap in modals, aria-live for toasts and tx status, no serious axe issues, status never conveyed by color alone.
- Performance: Lighthouse at least 90 on the landing page for all four categories; optimized fonts; no layout shift.
- Both themes verified on every page with screenshots at 360, 768 and 1280 widths.
- Loading, empty and error states for every data view.
- Security headers, input sanitation, no secrets in the client bundle, rate-limit any API route; open proof links with `rel="noopener noreferrer"`.
- Optional privacy-friendly analytics via env.
- StudioNet/demo disclaimer wherever stakes are shown.

## 12. Content rules
Use the exact copy above for the hero, section headings and CTAs. Where real data is unknown use obvious placeholders; never invent statistics, testimonials, user counts or logos. No lorem ipsum.

## 13. Milestones and acceptance criteria
1. **Scaffold:** repo, Next.js, tokens, theme toggle with no flash, logo variants and icon set, header/footer, mock mode. *Accept: landing shell renders in both themes with the correct logo variant.*
2. **Landing and static pages** with full copy, FAQ, responsive, oath-sentence builder. *Accept: Lighthouse targets met, matches the reference.*
3. **Contract:** implement, test, deploy to StudioNet, document the address. *Accept: all tests pass; one oath verified KEPT and one BROKEN on StudioNet.*
4. **Wallet and chain layer.** *Accept: connect, disconnect and wrong-network flows work.*
5. **Create oath and the wall** wired to chain. *Accept: an oath created in the UI appears on the wall.*
6. **Oath detail, check-ins, verdict, appeal, settle, dashboard, profiles.** *Accept: full lifecycle through the UI on StudioNet.*
7. **Polish:** a11y pass, Playwright flows, README, Vercel deploy. *Accept: live URL; a stranger can run the repo in 10 minutes.*

## 14. Deliverables
Working repo, deployed frontend URL, deployed StudioNet contract address, `README.md`, `docs/ARCHITECTURE.md` (states, verdict flow, grace period, appeal economics, trust assumptions), `docs/DECISIONS.md`, and a list of known limitations (platform fetch blocking, recipient self-dealing, demo-only escrow if applicable, LLM verdict variance, not a legal contract).

At the end report: what's done, what's mocked, what you couldn't verify against the docs, and the top 5 risks.
