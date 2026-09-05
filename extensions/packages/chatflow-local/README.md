# ChatFlow Local — Speed & Export

A free, local-only Chromium extension for long ChatGPT conversations.

## What it does

- Applies browser-native CSS containment to reduce layout and paint work in long chats.
- Optionally hides older turns while keeping the latest 5–250 turns visible.
- Shows an optional compact runtime HUD with state, detected, retained, optimized, and last-pass statistics.
- Mirrors the optimized count in the extension toolbar badge and shows `!` when optimization errors.
- Exports the currently open conversation to Markdown, TXT, JSON, or a print-ready PDF.
- Runs entirely in the page and browser. There is no account, server, analytics, daily quota, payment prompt, or upgrade flow.

## Install in Chrome, Edge, Brave, or another Chromium browser

1. Open the browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `chatflow-local` folder.
5. Reload any already-open ChatGPT tab once.

Use the toolbar icon or the green lightning button on a ChatGPT conversation page.

## Runtime statistics

The HUD appears near the upper-right of ChatGPT and can be disabled from either control panel. Click it to expand or collapse the details. Its counts come from the same completed optimization pass that applies the existing page classes:

- **Total detected**: conversation turns found by the current page scan.
- **Retained / rendered**: detected turns left in the page layout.
- **Optimized / unloaded**: older turns hidden from layout by focus mode.
- **Last pass**: elapsed time since the optimization logic last completed.

The extension does not claim to measure Chromium's private offscreen-rendering decisions; only deterministic results from the existing optimization logic are reported.

## PDF export

PDF opens the browser's print dialog with a clean conversation layout. Choose **Save as PDF**. If nothing opens, allow pop-ups for `chatgpt.com` and try again.

## Privacy and permissions

- `activeTab`: lets the popup talk to the ChatGPT tab you opened it from.
- `storage`: saves performance and HUD preferences locally.
- Site access is limited to `chatgpt.com` and the legacy `chat.openai.com` domain.

Exports may contain sensitive information from the current conversation. Review files before sharing them.

## Notes

ChatGPT's page structure can change. The extractor uses multiple conservative selectors, but future site changes may require an update. This extension is an independent project and is not affiliated with or endorsed by OpenAI.
