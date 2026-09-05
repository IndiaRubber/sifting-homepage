# The persistent dream signal

This pass preserves the reality-layer design and adds one shared message with different local expressions. It is local, uncommitted, and not pushed.

## Files changed in this pass

- `index.html`: one instance in each of the five layers; replaces the old duplicate static footer phrase.
- `archive/index.html`: one restrained instance beneath the existing hero actions.
- `extensions/index.html`: one quiet line above the catalog introduction.
- `assets/dream-signal.js`: shared character-state engine, visibility and motion handling, pointer/Archive response, local thread integration.
- `assets/dream-signal.css`: typography, placement, decorative spans, and small-screen/reduced-motion rules.
- `DREAM_SIGNAL.md`: implementation and review notes.

The binary game and ChatFlow extension popup were inspected and deliberately excluded because they are functional interfaces. Their scripts and controls were not changed.

## Shared architecture

Each `data-dream-signal` element contains the canonical phrase in the source HTML. JavaScript creates one stable semantic span and one decorative `aria-hidden` visual span. The visual span holds five word groups and fifteen persistent character spans. Screen readers receive “THIS IS NOT A DREAM”; there is no live-region rewriting.

The engine reads `data-dream-mode`. Each letter has its own deadline, recovery time, current glyph, target strength, offsets, opacity, stretch, and random phase. Mutations are scheduled independently, and their surrounding transforms ease over roughly 0.9–1.3 seconds. Word spacing and letter boxes remain stable. The engine does not rebuild a sentence every frame or use a synchronized normal/glitch cycle.

Each letter box now owns two persistent, overlapping decorative glyph spans: current and incoming. A substitution crossfades those layers with restrained opposing drift and sub-1.2px blur, then promotes the incoming glyph without replacing the character cell. Recovery to the canonical letter uses the same path. Mode timing ranges are configuration data: Signal 340–450ms, Minerva 460–620ms, Quiet 550–760ms, Unstable 280–390ms, Residual 720–920ms, and Archive 420–560ms. A character cannot start another substitution while its two-layer transition is active.

## Local personalities

| View | Mode | Maximum affected letters | Treatment |
| --- | --- | ---: | --- |
| Home | signal | 3 | Clear, large introduction above the existing heading |
| Minerva Down | minerva | 2 | Spectral line beside the book, gently stretched across a local filament |
| Author | quiet | 1 | Small copper-toned aside below the quotation |
| Projects | unstable | 3 | Register margin; freer independent drift and substitutions |
| Open channel | residual | 2 | Isolated, slow line; new changes wait for 6.5 seconds of inactivity |
| Archive | archive | 2 | Restrained recovered text beneath the actions |
| Extensions | quiet | 1 | Low-key editorial line; no effects on tool controls |

Home waits about 2.4–7.8 seconds between a character's mutation opportunities; Projects about 2.6–7.2 seconds, Author/Extensions 6.5–18 seconds, and Contact 8.5–17 seconds after its idle gate. Recovery lifetimes overlap independently. Limits also count letters that are still fading back toward normal, so a new mutation cannot bypass the readability cap.

## Pointer and Minerva relationship

Pointer proximity within 100 pixels produces a response that eases in over about 1.1 seconds. It can modestly shorten individual waits and increase chromatic separation. The text never follows the pointer. Hovering or focusing the Recovered Archive link uses the same bounded attention channel; leaving or blurring releases it.

The old procedural Minerva renderer exists in the repository but is not loaded by the current design. It has not been re-enabled. Instead, the Minerva instance drives a local thread beside the cover: corruption gently increases its opacity and moves it by less than 1.4 pixels, with an additional 1.8–2.3 second lag. It relaxes as the phrase reconstructs. A bubbling `dream:signal` event is available for future renderer integrations; no whole-screen effect is attached.

## Accessibility and performance

- System reduced motion and the existing Still the world control restore the original phrase and stop the engine.
- On small screens, words can wrap as groups and the type scales down. Coarse pointers receive reduced movement and no proximity reaction; blur is disabled on narrow screens.
- One requestAnimationFrame loop is capped at approximately 24 updates/second and runs only while an instance is visible and motion is enabled.
- Inert layers, offscreen instances, and hidden documents pause. Restoring a tab resumes its local clocks without catching up missed mutations.
- Bounds are measured outside the animation loop, on visibility/layout/scroll changes. Scroll measurements are throttled.
- Character nodes are allocated once. Glyph text changes only when a substitution or recovery actually happens.
- No libraries, external network requests, frameworks, or new page-wide animation layers were added.

## Refinement and validation

After timed visual review, Projects was reduced from four affected characters to three, with lower drift, stretch, blur, and chromatic separation. Quiet modes were narrowed to O/0, R/Я, and A/∆; exclamation substitutions were removed. A little spacing was added below the Archive phrase.

Timed browser observations cover all five root layers plus Archive and Extensions, including several readable mutation states, idle changes, keyboard/return navigation, pointer proximity, and Archive focus. Responsive layout and the existing Still control are checked separately.

Observation windows: Home 26 seconds, Minerva 75, Author 30, Projects 56, Contact 61, Archive 98, Extensions 108. The refined Projects behavior received another 64-second review, including a verified freeze and resume via Still the world. Narrow-screen checks used a 390-pixel viewport; the Minerva phrase was kept inside its cover container to avoid introducing lateral overflow.

The glyph-morph refinement received a separate live audit at every placement. Signal produced ten corruption and ten recovery crossfades in 20 seconds; the remaining locations each completed both directions within their local observation window. Recorded pairs included O→0→O, A→∆→A, A→Λ→A, and recovery from Я, Ð, ₥, Ø, 3, and other configured alternates. Across those samples there were no blank frames, lingering incoming glyphs, cell-width changes, or sentence-width changes. A narrow headless-browser capture confirmed the new nested glyph cells remain contained at the mobile breakpoint.

The deterministic engine harness exercises both crossfade directions in every mode, corruption caps, canonical semantics, idle gating, hidden/restored lifecycle, inactive-layer pausing, persistent character and glyph spans, reduced-motion startup, and resuming motion. A forced-reduced-motion Edge run additionally confirmed all five root instances paused, canonical, and free of active morphs. The in-app browser does not expose a hidden-tab toggle, so the hidden-document lifecycle remains covered by the deterministic harness rather than claimed as a native tab test.
