# House Money

A practice casino with play money: blackjack, baccarat, roulette and craps.

You buy in with a bankroll in whole thousands, play any of the four tables with chips from 1K to 1M, and cash out to a receipt. The receipt has your net result, a per-game breakdown, the full session log and an integrity check of the ledger. Nothing is stored anywhere. Refreshing or closing the page ends the session, and the page warns you before that happens.

It's a statically exported Next.js app (App Router, React 19, TypeScript, CSS Modules), with no server and no runtime dependencies beyond Next and React. `reference/index.html` is the original single-file version and serves as the behaviour spec. The rebuild matches it except for the [intentional differences](#differences-from-the-reference) listed below.

## Getting started

You need Node.js 20.9 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Before you run the Playwright tests for the first time, install the browser:

```bash
npx playwright install chromium
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` | Static export to `out/`. The fonts are downloaded at build time, so this needs internet access. |
| `npm run preview` | Serves `out/` with `serve`, the way a static host would. |
| `npm run lint` | ESLint, including the layer and security rules in `eslint.config.mjs`. |
| `npm run typecheck` | `next typegen`, then `tsc --noEmit`. |
| `npm test` | Unit and component tests (Vitest). |
| `npm run test:e2e` | Builds, serves `out/`, then runs the Playwright suite at desktop (1360×860) and phone (390×844) sizes. |
| `npm run test:visual` | Plays the same scripted session in `reference/index.html` and in the app, with the same random seed and a frozen clock. It writes matching screenshots to `test-results/visual/<desktop\|phone>/` for side-by-side review. It needs internet access, because the reference loads its fonts from Google. |

Playwright clears `test-results/` at the start of every run, so run `test:visual` last if you want to keep its screenshots.

## Deploying to Cloudflare Pages

1. Create a Pages project connected to this repository.
2. Use these build settings:
   - Framework preset: **None**, or **Next.js (Static HTML Export)**.
   - Build command: `npx next build`
   - Build output directory: `out`
   - Environment variable: `NODE_VERSION` = `22`. Any version from 20.9 up works, but older build images default to an older Node.
3. Deploy.

You don't need any redirects:
- Every route is a prerendered HTML file: `/`, `/play`, `/play/<game>`, `/receipt`.
- Pages serves `play/blackjack.html` at `/play/blackjack`.
- Unknown paths get `404.html`.

`public/_headers` is copied into `out/`, and Pages applies it. It stops other sites from framing the casino, sets `nosniff` and a no-referrer policy, and caches the hashed files under `/_next/static/` for a year.

Opening a game or receipt URL directly starts a fresh page with no session, so you land back at the cashier. That's expected.

Any other static host works the same way: upload `out/`.

## Limits

Everything runs in the browser, so the protections make cheating hard but can't make it impossible.

**What the app does:**
- **Ledger.** All money lives in a ledger with private fields and frozen entries. Each entry is sealed with an HMAC-SHA-256 chain, using a key the page can't export. At cash-out the whole chain is replayed: sequence, arithmetic and seals.
- **Rules.** Engines and the ledger check every action. Re-enabling a disabled button in the inspector doesn't let anyone bet more than their cash or act out of turn.
- **Built-ins.** The random number generator, shuffle, ledger and seal code use built-ins (`crypto`, `JSON`, `Object.freeze`, `TextEncoder` and so on) captured when the app loads.
- **The page.** Edits to the header numbers or the session log in the inspector snap back straight away. The receipt is built from the ledger, never from the page.
- **Exposure.** Nothing is exposed on `window`, and nothing is written to storage.

**What it can't stop:**
- Someone pausing the code in the debugger and changing values.
- Someone serving themselves a modified copy of the JavaScript.
- A script or extension that runs before the app and replaces built-ins first. Unlike the reference, the app doesn't freeze global prototypes, because that breaks the React and Next.js runtime.
- The seal shows the log wasn't edited after it was written in this page. It can't prove anything to anyone else, because the key never leaves the page and disappears with it.

**The upgrade path** is a server-side dealer and ledger. For example, a Cloudflare Worker (with a Durable Object per session) would shuffle, deal, validate every action, keep the ledger, and sign the receipt with a key the browser never sees. The browser would then only display what the server decides.

## Differences from the reference

These differences are intentional:

- **Separate URLs.** Each screen has its own URL: `/`, `/play/<game>` and `/receipt`. Back and forward move between games, but they can't leave a game that's locked mid-round; you stay put and see the lock message. Unknown URLs show a short "There's no table here." page.
- **No sideways scroll on phones.** The reference scrolls sideways in several places on phones:
  - At 390px the buy-in card was wider than the screen.
  - The game tabs ran off the edge, cutting off Craps.
  - Ten-digit balances widened the header.
  - At 320px the baccarat hands pushed the table out.

  In the app every screen fits from 320px up. The tabs share the row, the header numbers wrap, and below 360px the tab text and the baccarat hands tighten slightly.
- **Touch screens.** Buttons don't trigger double-tap zoom, and hover tints only appear with a mouse or trackpad. The buy-in and receipt pages size to the visible screen on phones.
- **Leaving a game.** When unplayed chips go back to cash, the game's message goes back to its opening prompt. In craps, while a point is on, it says "No bets down." instead.
- **Buy-in double submit.** Submitting the buy-in a second time while the session is opening does nothing.
- **Reduced motion.** The setting is read live, so changing it mid-session takes effect on the next deal, spin or roll.
- **Fonts.** They're self-hosted with `next/font`. Courier Prime renders with very slightly different anti-aliasing from the copy the reference loads from Google Fonts. The layout is identical.
- **Prototypes.** Global prototypes aren't frozen (see [Limits](#limits)).

## Project layout

```
src/
  app/          routes only: buy-in, /play layout and /play/[game], receipt, 404
  components/   shared building blocks: ui, table, cards, dice, casino shell, log, buy-in, receipt
  games/        one folder per game: types, rules, engine, ui/ (plus registry.ts and registry.ui.tsx)
  session/      the session singleton and the React hooks and guards that read it
  lib/          pure TypeScript: ledger, money, cards, random, receipt, timing, security
  hooks/        generic React hooks (DOM guard, deal-animation watermark)
e2e/            Playwright specs
reference/      the original single-file app (behaviour spec; never imported)
docs/           the build brief
```

`CLAUDE.md` has the architecture rules, how to add a game, and the code conventions.
