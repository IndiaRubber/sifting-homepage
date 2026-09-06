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

## Observer / CODEX

In `/#about`, linger over **notice** in the Observer quote for 3.2 seconds. The word gradually thickens, shudders, and opens onto CODEX. Leaving reverses the sequence; a complete reveal has a 700ms grace period before a 1.5-second reseal. Keyboard focus also initiates discovery. A touch tap keeps it open until another tap outside the word; the first tap never navigates. Escape dismisses it. Reduced motion and **Still the world** use a brief, stationary reveal.

`/observer/codex/` is a static directory route, absent from normal navigation and marked `noindex`. It contains only the 28 supplied initial terms. There is intentionally no Observer definition. The disclaimer and the Firmament classification note are preserved verbatim.

- `assets/observer-notice.css` and `.js`: isolated inline fissure and departure transition, with no idle animation loop.
- `assets/observer-codex.css` and `.js`: archive styling, search, A–Z navigation, disclosures, and hash links such as `/observer/codex/#firmament`.
- `content/minerva-codex.json`: authoritative terms and definitions. Keep IDs stable to preserve links. Definitions may be strings or arrays for numbered senses; `note` is optional.
- `observer/codex/template.html`: page shell used by the generator.
- `observer/codex/index.html`: generated, committed HTML. Native `<details>` entries remain readable without JavaScript; search controls appear only when JavaScript is available.

After editing glossary data or the template, regenerate and verify:

```powershell
node scripts/build-codex.mjs
node scripts/build-codex.mjs --check
```

Sorting uses the displayed term, ignoring case and punctuation (so **The Crisis** is under T). Search matches terms and definitions, opens matching entries, and restores the previous disclosure state when cleared. The mobile alphabet scrolls horizontally.

### Browser checks

The site still has no runtime dependencies, package manifest, lint command, or typecheck command. For development tests, make Playwright available locally and install its Chromium browser:

```powershell
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npx playwright test
```

The test configuration starts the documented Python server, or reuses it on port 4173. To use an existing Chromium executable instead of Playwright's downloaded browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The formerly hard-coded Linux browser and binary-game file paths now use portable test configuration.

`tests/observer-codex.spec.js` covers delayed reveal, reversal, keyboard discovery, touch scrolling and two-tap navigation, reduced motion, direct URLs, source content, filtering, disclosures, no-JavaScript reading, mobile widths, and 200% zoom. The existing binary-game test remains included.
