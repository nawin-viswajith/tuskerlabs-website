# TuskerLabs website

The TuskerLabs parent site — Trunk is the first product page under it, with
room for future apps alongside it. Static site, no build step. Pages:

- `index.html`: TuskerLabs (the company)
- `trunk/index.html`: Trunk (the product)
- `trunk/playground.html`: Playground deep-dive, with an interactive agent-canvas demo

Shared design system lives in `css/styles.css`, mirroring the Trunk app's
`theme/colors.ts` / `fonts.ts` tokens exactly (same accent palettes,
spacing scale, flat/sharp-edged aesthetic, Urbanist + Iceland fonts).
`trunk/style.css` extends it with page-specific layout only.

## Preview locally

Any static file server works, e.g.:

```bash
npx serve .
```

Or just open `index.html` directly in a browser.

## Deployment

Hosted on Render as a static site (see `render.yaml`). Connect this repo in
the Render dashboard — no build command needed, publish path is the repo
root.

## Notes

- The "Download Trunk" / "Download latest APK" links point at
  `trunk-android`'s `releases/latest/download/Trunk-latest-optimised-arm64.apk`
  - a stable URL that always resolves to whichever release is newest, so this
  page never needs a version-number edit again. For this to keep working,
  **every future trunk-android release must also upload an asset literally
  named `Trunk-latest-optimised-arm64.apk`** (a renamed copy of that
  release's arm64 build) alongside its version-specific filename - if a
  release skips this, the link 404s until the next one that includes it.
- The accent-palette picker on the Trunk page (`trunk/palette-demo.js`) uses
  the exact same `ACCENT_PRESETS` values as the app's `theme/colors.ts`. Keep
  them in sync if the app's palette ever changes. It only *previews* a
  palette on that page; it never persists a choice, since the site-wide
  dark/light toggle (main.js) is the single source of truth for accent
  color across every other page.
- This repo is intentionally separate from `trunk-android` (the app) so the
  TuskerLabs site can host future apps' pages too, not just Trunk's.
