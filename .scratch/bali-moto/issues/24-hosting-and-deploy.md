# Grilling: hosting and deploy

Type: grilling
Status: resolved
Blocked by: 
Map: ../map.md

## Question

Where does the game live, and how does a build reach it?

Decide the static host and CDN for the site and its ~400 MB of chunk data (Cloudflare Pages plus R2, Netlify, GitHub Pages plus a bucket, or similar), whether chunk data lives beside the site or on a separate origin, Brotli and cache-header policy (immutable chunk files under a versioned path), the deploy workflow (Vite build of the site in CI, publish world data only when the pipeline output changes), and cost expectations for bandwidth. The pipeline output format and size budget are decided.

## Answer

**Host**: the Vite-built static site on Cloudflare Pages; world data in a Cloudflare R2 bucket served through a custom domain (for example `world.<game-domain>`), chosen for zero egress fees since every player pulls tens of megabytes. Both free at hobby scale. The site and the data are separate origins, so the bucket sends permissive CORS headers for the site origin only.

**Caching**: world data lives under `/world/<pipeline-version>-<extract-date>/…`; every chunk and global file is pre-compressed with Brotli by the publish step and served with a one-year immutable cache header. Only `manifest.json` at a fixed path has a short cache (about a minute), so a new build flips atomically when the manifest points at the new version directory; a ride in progress keeps loading from the version it started on. Old version directories are deleted by hand after a week.

**Deploy**: GitHub Actions runs the Vite build and deploys the site to Pages on every push to main, with preview deploys per pull request. World data is published by `npm run world:publish` from a machine that has run the pipeline; it uploads only new or changed files (by hash) to R2 and then the manifest. Code and data release independently, and the runtime tolerates any manifest version whose format version it understands.

**Visibility**: public URL from the first deploy, no gate, no accounts.

**Cost expectation**: Pages free tier; R2 storage about 0.5 GB and reads within the free tier for hobby traffic; egress free. Revisit if traffic exceeds a few thousand rides a month.
