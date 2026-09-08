# 17 — Hosting and deploy

**What to build:** The game is public at a URL with no account: the site deploys from CI on every push to main with per-pull-request previews, and world data is published to R2 under a versioned immutable path by a separate command, flipping atomically when the manifest updates.

**Blocked by:** 12, 16

**Status:** ready-for-agent

Spec: ../../bali-moto/spec.md

- [ ] Cloudflare Pages project for the Vite build with GitHub Actions deploy on push to main and preview deploys per pull request
- [ ] R2 bucket behind a custom domain serving world data with CORS for the site origin only; files pre-compressed with Brotli and served immutable for a year under a path versioned by pipeline version and extract date; manifest at a fixed path with a ~1 minute cache
- [ ] Publish command uploads only new or changed world files by hash and then the manifest; a ride in progress keeps its version
- [ ] Runtime reads the world data origin from configuration so dev serves local output and production serves R2
- [ ] Cost and bandwidth expectations recorded; old world versions deleted by hand after a week
