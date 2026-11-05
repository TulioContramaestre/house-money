# Deploying to Cloudflare

The site runs as a Cloudflare Worker that only serves static assets. `wrangler.jsonc` points it at `out/` and sends unknown paths to `404.html`. Keep it that way: without the config, or with a `main` entry, `wrangler deploy` tries to set up a server build (OpenNext), which fails on a static export.

1. Push this repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create application → Import a repository** and pick it.
3. Use these settings:
   - Project name: `house-money`. It must match `name` in `wrangler.jsonc`.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (the default)
   - Non-production branch deploy command: `npx wrangler versions upload` (the default)
   - Build variable: `NODE_VERSION` = `22`
4. Deploy. Every push to the production branch builds and deploys again.

**Custom domain.** Add it in the dashboard under the Worker's **Settings → Domains & Routes → Add → Custom domain**. `wrangler.jsonc` has no routes, so deploys leave the domain alone. The `workers.dev` URL stays on, because every deploy reapplies the config. To turn it off, add `"workers_dev": false` to `wrangler.jsonc` rather than switching it off in the dashboard.

**Deploying by hand.** Run `npx wrangler login` once, then `npm run deploy`. Run both from a Windows shell such as Git Bash, not WSL.

You don't need any redirects:
- Every route is a prerendered HTML file: `/`, `/play`, `/play/<game>`, `/receipt`.
- Cloudflare serves `play/blackjack.html` at `/play/blackjack`.
- Unknown paths get `404.html`.
- Requests are served straight from the uploaded files, so no Worker code runs.

`public/_headers` is copied into `out/`, and Cloudflare applies it. It stops other sites from framing the casino, sets `nosniff` and a no-referrer policy, and caches the hashed files under `/_next/static/` for a year.

Opening a game or receipt URL directly starts a fresh page with no session, so you land back at the cashier. That's expected.

Any other static host works the same way: upload `out/`.
