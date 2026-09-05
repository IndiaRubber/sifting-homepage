# exSifting — layers of reality

A framework-free author landing page for `www.exsifting.com`.

## Test locally

From this directory, run:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`. Pull the illuminated seam left, or tap it, to expose the next reality. Use the bottom depth markers or **Layers** menu to jump. The up arrow brings the previous layer back.

The new design lives on local branch `design/reality-layers`. This redesign is uncommitted and has not been pushed. Its starting point is the previously approved soundtrack commit `57c5d2b`.

**Reading mode** shows every layer as an ordinary scrolling document. **Still the world** pauses the parallax and audio-driven motion. System reduced-motion preferences are respected. The soundtrack starts only when you press play; seek and mute remain available across layers.

## Included

- `index.html` — five reality layers and persistent navigation/audio
- `assets/reality.css` — responsive surfaces, dimensional seam, and reading mode
- `assets/reality.js` — drag, rebound, forward/reverse peel, keyboard, and direct navigation
- `style.css` — retained styling from the previous design
- `archive/index.html` — preserved in-universe homepage
- `archive/style.css` — original portal styling

## Review locally

This version is awaiting design approval. No deployment settings were changed.

No framework, package install, or build command is required.


## Included artwork

The root homepage now uses optimized WebP artwork from `assets/`:

- `hero-soul-thread.webp` — hero and contact-band atmosphere
- `section-ether.webp` — featured-book section background
- `section-branches.webp` — author section background
- `minerva-down-cover.webp` — actual book cover in the Minerva layer

## Spatial prototype additions

- `assets/minerva-down-soundtrack.mp3` — supplied Minerva Down soundtrack
- `assets/minerva-audio.js` — playback, seek/mute controls, spectrum, and audio-reactive state
- `assets/minerva-system.js` — retained previous canvas implementation, not loaded by the new homepage
- The Minerva cover is now a pointer-reactive 3D object with a reduced-motion fallback

The CSS includes dark overlays so headings and buttons remain readable.
