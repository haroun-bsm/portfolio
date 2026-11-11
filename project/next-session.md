# Session summary — Haroun portfolio, live (2026-11-11)

## Live

**https://haroun-ben-salem.pages.dev/** — Cloudflare Pages project `haroun-ben-salem`.

Live Lighthouse (mobile, `review/lh-live2.json`): **95** performance, **100**
accessibility, **100** best practices, **100** SEO — LCP 2.0s, TBT 160ms, CLS 0.
Site checker: **"Nothing to fix."** Live console/network: clean, phone overflow 0px,
motion boots on first scroll.

## Final architecture

- **One CSS bundle:** `site/assets/site.min.css` (fonts + scene + fx + style + cine,
  minified, 45.7 KiB). Source CSS stays in `site/`; the page links only the bundle.
  (An old `assets/fonts/fonts.css` link was the last deploy bug — it 404'd render-blocking;
  removed before the final deploy, live perf went 74 → 95.)
- **JS:** `site/assets/site.min.js` (nav + motion loader) is eager. It loads
  `site/assets/boot.min.js` (scene + plex + fx + cine, 37.6 KiB) on the first real
  interaction (`pointermove/touchstart/scroll/…`) or after 12s. This keeps first paint
  free of WebGL boots and the 17k-page layout, while desktop users get motion on their
  first pointer move and touch users on their first swipe.
- **Phones** remove the depth canvas in an inline head script before the engine loads
  (composed still + mast/subject/bands still move). Desktop keeps the full WebGL depth.
- **Reduced motion** is set to `k-static` immediately by the same inline script.
- **Fonts subset** to used glyphs: Anton 7.3 KiB, Fraunces 47.8 KiB, Plex Mono 6.4 KiB each.
- Mobile hero images downsized (field 620w, depth 420w, subject 420w); desktop field 1920w.
- Ribbon B contrast fixed (`#8697AF`, opacity 1) — a11y 100.

## Verified

- `node .10k/tools/check.mjs site review` → **Nothing to fix.** No console errors.
- `node scripts/verify-live.mjs` → canonical/OG/Twitter/JSON-LD confirmed on the live URL,
  no console or network errors, hero boots on scroll, 0px overflow.
- `node scripts/hero-check.mjs` → phone horizontal overflow **0 px**.
- Lighthouse: `review/lh-live2.json` (95 / 100 / 100 / 100) and `review/lh-final.json`
  (93 / 100 / 100 / 100 local).

## Rebuild

```
node scripts/build-site.mjs
```

Outputs `site/assets/site.min.css`, `site.min.js`, `boot.min.js`. Then rebuild `dist/`
(only `index.html`, `assets/`, `_headers`, `robots.txt`) and deploy.

## Deploy — Cloudflare Pages

Wrangler OAuth login is stored. From the repo root:

```
npx wrangler pages deploy --project-name haroun-ben-salem --branch main --commit-dirty=true
```

`wrangler.jsonc` sets `pages_build_output_dir: dist`. `project/haroun-pages.zip` is the
dashboard drag-and-drop fallback (Workers & Pages → Create → Pages → Upload assets).

## Housekeeping

- Source assets and build script are in the repo; `dist/`, `project/*.zip` and `review/`
  are local only.
- Engine files (`scene.js`, `fx.js`, `plex.js`, `scene.css`, `fx.css`) are unedited.
- Cloudflare `_headers` caches `/assets/*` immutably and adds nosniff/referrer policy.
