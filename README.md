# exSifting author landing page — spatial audio prototype

A framework-free author landing page for `www.exsifting.com`.

## Test locally

From this directory, run:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`. Use the **Enter soundtrack** control to start the Minerva Down track; browsers require a user gesture before audio can play.

The prototype work lives on the local branch `feature/minerva-spatial-audio`. Nothing has been pushed to GitHub.

## Included

- `index.html` — new author-first homepage
- `style.css` — responsive editorial styling
- `archive/index.html` — preserved in-universe homepage
- `archive/style.css` — original portal styling

## Deploy

1. Create a backup branch or download the current repository.
2. Copy these files into the repository root.
3. Keep the existing `CNAME` and `wrangler.jsonc` files already in GitHub.
4. Commit and push to `main`.
5. Cloudflare Pages should redeploy automatically.

No framework, package install, or build command is required.


## Included artwork

The root homepage now uses optimized WebP artwork from `assets/`:

- `hero-soul-thread.webp` — hero and contact-band atmosphere
- `section-ether.webp` — featured-book section background
- `section-branches.webp` — author section background
- `minerva-down-cover.webp` — actual book cover displayed in the hero

## Spatial prototype additions

- `assets/minerva-down-soundtrack.mp3` — supplied Minerva Down soundtrack
- `assets/minerva-audio.js` — playback, seek/mute controls, spectrum, and audio-reactive state
- `assets/minerva-system.js` — expanded with a perspective-projected depth field
- The Minerva cover is now a pointer-reactive 3D object with a reduced-motion fallback

The CSS includes dark overlays so headings and buttons remain readable.
