# Next-generation direction

## What the existing site already does well

The source has a distinct editorial voice, strong in-world copy, a coherent five-panel structure, and thoughtful motion fallbacks. The Minerva boot sequence and procedural filament already establish an authored experience rather than a generic portfolio.

## The main opportunity

The previous build described hidden systems, but most interaction still happened on a flat visual plane. The strongest next step is to make the interface itself feel like one of those systems: spatial, reactive, and slightly unstable, while preserving readable text and direct access to the book.

## Implemented in this prototype

1. **Dimensional artifact:** the Minerva cover now has perspective, a visible spine and page block, orbital telemetry, pointer tilt, and audio-responsive depth.
2. **Sound as interface state:** the supplied soundtrack has a persistent, opt-in player with seek, mute, elapsed time, and a compact spectrum. Playback energy modulates the cover, orbit, glow, and environmental depth.
3. **Perspective field:** the global canvas now includes projected depth nodes that move toward the viewer. It remains dependency-free and uses the existing reduced-motion and mobile performance guardrails.
4. **Progressive enhancement:** reading, navigation, and external links still work without audio, Web Audio, or motion.

## Recommended next moves

- Replace the generic five-panel counter with a diegetic map showing where the visitor is inside the Minerva system.
- Turn the project index into spatial “coordinates” that reveal a small live preview on focus or hover, without hiding the direct links.
- Add intentional soundtrack cue points only after the track is mapped to narrative beats; avoid tying important content to audio timing.
- If this direction is approved, consider a lightweight WebGL shader for the Minerva panel only. Keep the rest of the page DOM-based so typography, accessibility, and search indexing stay strong.
- Measure the MP3’s transfer cost in production and consider an additional compressed rendition if mobile visitors are important. Keep playback opt-in.

## Acceptance checks

- Navigate all five panels with the header, arrows, keyboard, wheel, and touch behavior already supported by the site.
- Start and pause the soundtrack from both the hero control and persistent player.
- Seek and mute the track; confirm the player remains usable across panels.
- Move the pointer across the Minerva cover and confirm the depth effect resets on exit.
- Enable reduced motion and confirm orbit animation and pointer tilt stop.
- Verify the mobile layout keeps the book visible while simplifying the global canvas.
