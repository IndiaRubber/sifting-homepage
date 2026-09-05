(() => {
  "use strict";

  if (window.__chatflowLocalLoaded) return;
  window.__chatflowLocalLoaded = true;

  const DEFAULTS = {
    enabled: true,
    focusMode: false,
    keepRecent: 40,
    showHud: true
  };

  let settings = { ...DEFAULTS };
  let runtimeStats = {
    state: "idle",
    total: 0,
    retained: 0,
    optimized: 0,
    lastPassAt: null,
    error: null
  };
  let observer;
  let applyQueued = false;
  let panelOpen = false;
  let ui = null;
  let hud = null;

  function getTurns() {
    const articles = Array.from(
      document.querySelectorAll('main article[data-testid^="conversation-turn-"]')
    );
    if (articles.length) return articles;

    const seen = new Set();
    return Array.from(document.querySelectorAll("main [data-message-author-role]"))
      .map((node) => node.closest("article") || node)
      .filter((node) => {
        if (seen.has(node)) return false;
        seen.add(node);
        return true;
      });
  }

  function normalizeKeepRecent(value) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? Math.min(250, Math.max(5, number)) : 40;
  }

  function applyOptimization() {
    applyQueued = false;
    try {
      const turns = getTurns();
      const keepRecent = normalizeKeepRecent(settings.keepRecent);
      const optimized = settings.enabled && settings.focusMode
        ? Math.max(0, turns.length - keepRecent)
        : 0;

      document.documentElement.classList.toggle("chatflow-local-enabled", settings.enabled);
      document.documentElement.classList.toggle(
        "chatflow-local-focus",
        settings.enabled && settings.focusMode
      );

      turns.forEach((turn, index) => {
        turn.classList.add("chatflow-local-turn");
        turn.classList.toggle(
          "chatflow-local-collapsed",
          settings.enabled && settings.focusMode && index < optimized
        );
      });

      runtimeStats = {
        state: settings.enabled && turns.length > 0 ? "active" : "idle",
        total: turns.length,
        retained: turns.length - optimized,
        optimized,
        lastPassAt: Date.now(),
        error: null
      };
      updateUi(turns.length, optimized);
      updateHud();
      reportStats();
    } catch (error) {
      runtimeStats = {
        ...runtimeStats,
        state: "error",
        lastPassAt: Date.now(),
        error: error instanceof Error ? error.message : String(error)
      };
      updateHud();
      reportStats();
      console.warn("ChatFlow Local optimization failed:", error);
    }
  }

  function queueApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(applyOptimization);
  }

  function cleanTitle() {
    const heading = document.querySelector("main h1");
    const raw = heading?.textContent?.trim() || document.title || "ChatGPT conversation";
    return raw
      .replace(/\s*[|–—-]\s*ChatGPT\s*$/i, "")
      .replace(/^ChatGPT\s*[|–—-]\s*/i, "")
      .trim() || "ChatGPT conversation";
  }

  function roleFor(turn, index) {
    const roleNode = turn.matches?.("[data-message-author-role]")
      ? turn
      : turn.querySelector?.("[data-message-author-role]");
    const role = roleNode?.getAttribute("data-message-author-role")?.toLowerCase();
    if (role === "user") return "user";
    if (role === "assistant") return "assistant";

    const label = turn.getAttribute?.("aria-label") || "";
    if (/you said|user/i.test(label)) return "user";
    if (/chatgpt|assistant/i.test(label)) return "assistant";
    return index % 2 === 0 ? "user" : "assistant";
  }

  function messageRoot(turn) {
    return (
      turn.querySelector?.("[data-message-author-role] .markdown") ||
      turn.querySelector?.("[data-message-author-role]") ||
      turn.querySelector?.(".markdown") ||
      turn
    );
  }

  function textFromNode(root) {
    const clone = root.cloneNode(true);
    clone
      .querySelectorAll(
        "button, svg, textarea, form, nav, [contenteditable='true'], [aria-hidden='true'], .sr-only"
      )
      .forEach((node) => node.remove());
    return (clone.innerText || clone.textContent || "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function inlineMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    if (["button", "svg", "textarea", "form", "nav", "style", "script"].includes(tag)) {
      return "";
    }

    const inner = Array.from(node.childNodes).map(inlineMarkdown).join("");
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${inner.trim()}**`;
    if (tag === "em" || tag === "i") return `*${inner.trim()}*`;
    if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") {
      return `\`${inner.replace(/`/g, "\\`")}\``;
    }
    if (tag === "a") {
      const href = node.getAttribute("href");
      return href ? `[${inner.trim() || href}](${href})` : inner;
    }
    return inner;
  }

  function blockMarkdown(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    if (["button", "svg", "textarea", "form", "nav", "style", "script"].includes(tag)) {
      return "";
    }
    if (tag === "pre") {
      const code = node.textContent?.replace(/^\n|\n$/g, "") || "";
      const language = node.querySelector("code")?.className.match(/language-([\w-]+)/)?.[1] || "";
      return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    }
    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      return `\n\n${"#".repeat(level)} ${inlineMarkdown(node).trim()}\n\n`;
    }
    if (tag === "p") return `\n\n${inlineMarkdown(node).trim()}\n\n`;
    if (tag === "blockquote") {
      const quote = Array.from(node.childNodes).map((child) => blockMarkdown(child, depth)).join("");
      return `\n\n${quote.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
    }
    if (tag === "ul" || tag === "ol") {
      return `\n${Array.from(node.children)
        .filter((child) => child.tagName.toLowerCase() === "li")
        .map((child, index) => {
          const marker = tag === "ol" ? `${index + 1}.` : "-";
          const content = Array.from(child.childNodes)
            .map((part) => blockMarkdown(part, depth + 1))
            .join("")
            .replace(/\n{2,}/g, "\n")
            .trim();
          return `${"  ".repeat(depth)}${marker} ${content}`;
        })
        .join("\n")}\n`;
    }
    if (tag === "hr") return "\n\n---\n\n";
    if (tag === "br") return "\n";
    if (["strong", "b", "em", "i", "code", "a"].includes(tag)) return inlineMarkdown(node);
    return Array.from(node.childNodes).map((child) => blockMarkdown(child, depth)).join("");
  }

  function markdownFromNode(root) {
    return blockMarkdown(root)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function collectConversation() {
    const title = cleanTitle();
    const messages = getTurns()
      .map((turn, index) => {
        const root = messageRoot(turn);
        const text = textFromNode(root);
        return {
          index: index + 1,
          role: roleFor(turn, index),
          text,
          markdown: markdownFromNode(root) || text
        };
      })
      .filter((message) => message.text);

    return {
      title,
      source: location.href,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages
    };
  }

  function safeFilename(title) {
    return (
      title
        .normalize("NFKD")
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 90) || "ChatGPT conversation"
    );
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportMarkdown(data) {
    const body = data.messages
      .map((message) => `## ${message.role === "user" ? "You" : "ChatGPT"}\n\n${message.markdown}`)
      .join("\n\n---\n\n");
    const content = `# ${data.title}\n\nSource: ${data.source}\nExported: ${data.exportedAt}\n\n${body}\n`;
    download(`${safeFilename(data.title)}.md`, content, "text/markdown");
  }

  function exportText(data) {
    const body = data.messages
      .map((message) => `${message.role === "user" ? "YOU" : "CHATGPT"}\n${message.text}`)
      .join("\n\n----------------------------------------\n\n");
    download(
      `${safeFilename(data.title)}.txt`,
      `${data.title}\n${data.source}\nExported: ${data.exportedAt}\n\n${body}\n`,
      "text/plain"
    );
  }

  function exportJson(data) {
    download(
      `${safeFilename(data.title)}.json`,
      JSON.stringify(data, null, 2),
      "application/json"
    );
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function exportPdf(data) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Allow pop-ups for ChatGPT, then try the PDF export again.");
    }
    printWindow.opener = null;

    const messages = data.messages.map((message) => `
      <section class="message ${message.role}">
        <h2>${message.role === "user" ? "You" : "ChatGPT"}</h2>
        <div>${escapeHtml(message.text).replace(/\n/g, "<br>")}</div>
      </section>`).join("");

    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${escapeHtml(data.title)}</title>
      <style>
        @page { margin: 18mm; }
        body { color: #171717; font: 14px/1.55 system-ui, sans-serif; margin: 0 auto; max-width: 820px; }
        header { border-bottom: 2px solid #171717; margin-bottom: 24px; padding-bottom: 12px; }
        h1 { font-size: 24px; line-height: 1.2; margin: 0 0 8px; }
        header p { color: #666; font-size: 11px; margin: 2px 0; overflow-wrap: anywhere; }
        .message { break-inside: avoid-page; border-left: 4px solid #ddd; margin: 0 0 20px; padding: 2px 0 2px 16px; }
        .message.user { border-color: #16a34a; }
        .message.assistant { border-color: #2563eb; }
        h2 { font-size: 12px; letter-spacing: .08em; margin: 0 0 8px; text-transform: uppercase; }
        .message div { overflow-wrap: anywhere; white-space: normal; }
        @media print { body { max-width: none; } }
      </style></head><body>
      <header><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.source)}</p><p>Exported ${escapeHtml(data.exportedAt)}</p></header>
      ${messages}
      <script>addEventListener("load", () => setTimeout(() => print(), 250));<\/script>
      </body></html>`);
    printWindow.document.close();
  }

  function runExport(format) {
    const data = collectConversation();
    if (!data.messages.length) throw new Error("No conversation messages were found on this page.");
    if (format === "md") exportMarkdown(data);
    else if (format === "txt") exportText(data);
    else if (format === "json") exportJson(data);
    else if (format === "pdf") exportPdf(data);
    else throw new Error(`Unsupported export format: ${format}`);
    return data.messageCount;
  }

  async function saveSettings(patch) {
    settings = {
      ...settings,
      ...patch,
      keepRecent: normalizeKeepRecent(patch.keepRecent ?? settings.keepRecent)
    };
    await chrome.storage.local.set(settings);
    queueApply();
  }

  function reportStats() {
    chrome.runtime.sendMessage({
      type: "chatflow-stats",
      stats: { ...runtimeStats }
    }).catch(() => {});
  }

  function elapsedLabel(timestamp) {
    if (!timestamp) return "waiting";
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 2) return "now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  function createHud() {
    const host = document.createElement("div");
    host.id = "chatflow-local-hud-host";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { color-scheme: dark; }
        * { box-sizing: border-box; }
        button {
          backdrop-filter: blur(12px);
          background: color-mix(in srgb, #171717 88%, transparent);
          border: 1px solid #ffffff1f;
          border-radius: 10px;
          box-shadow: 0 5px 18px #0003;
          color: #d4d4d4;
          cursor: pointer;
          font: 11px/1.25 ui-monospace, SFMono-Regular, Consolas, monospace;
          min-width: 154px;
          padding: 7px 9px;
          text-align: left;
        }
        button:hover { background: color-mix(in srgb, #242424 92%, transparent); border-color: #ffffff38; }
        button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
        .summary { align-items: center; display: flex; gap: 6px; white-space: nowrap; }
        .dot { background: #737373; border-radius: 50%; height: 7px; width: 7px; }
        button[data-state="active"] .dot { background: #22c55e; box-shadow: 0 0 7px #22c55e99; }
        button[data-state="error"] .dot { background: #ef4444; box-shadow: 0 0 7px #ef444499; }
        .state { color: #fafafa; font-weight: 700; }
        .summary-stat { color: #a3a3a3; margin-left: auto; }
        .chevron { color: #737373; font: 9px system-ui, sans-serif; margin-left: 2px; }
        .details { border-top: 1px solid #ffffff17; display: grid; gap: 5px; margin-top: 7px; padding-top: 7px; }
        .details[hidden] { display: none; }
        .row { display: flex; gap: 12px; justify-content: space-between; }
        .label { color: #8a8a8a; }
        .value { color: #e5e5e5; font-variant-numeric: tabular-nums; }
        .error { color: #fca5a5; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .error[hidden] { display: none; }
        @media (prefers-reduced-transparency: reduce) { button { backdrop-filter: none; background: #171717; } }
      </style>
      <button type="button" data-state="idle" aria-expanded="false" aria-label="ChatFlow Local runtime status">
        <span class="summary">
          <span class="dot" aria-hidden="true"></span>
          <span class="state">Idle</span>
          <span class="summary-stat">0 optimized</span>
          <span class="chevron" aria-hidden="true">▼</span>
        </span>
        <span class="details" hidden>
          <span class="row"><span class="label">Total detected</span><span class="value total">0</span></span>
          <span class="row"><span class="label">Retained / rendered</span><span class="value retained">0</span></span>
          <span class="row"><span class="label">Optimized / unloaded</span><span class="value optimized">0</span></span>
          <span class="row"><span class="label">Last pass</span><span class="value elapsed">waiting</span></span>
          <span class="error" hidden></span>
        </span>
      </button>`;

    document.documentElement.appendChild(host);
    const button = shadow.querySelector("button");
    const details = shadow.querySelector(".details");
    const chevron = shadow.querySelector(".chevron");

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(expanded));
      details.hidden = !expanded;
      chevron.textContent = expanded ? "▲" : "▼";
    });

    hud = {
      host,
      button,
      state: shadow.querySelector(".state"),
      summaryStat: shadow.querySelector(".summary-stat"),
      total: shadow.querySelector(".total"),
      retained: shadow.querySelector(".retained"),
      optimized: shadow.querySelector(".optimized"),
      elapsed: shadow.querySelector(".elapsed"),
      error: shadow.querySelector(".error")
    };
    updateHud();
    window.setInterval(updateHud, 1000);
  }

  function updateHud() {
    if (!hud) return;
    hud.host.style.display = settings.showHud ? "block" : "none";

    const stateLabel = runtimeStats.state[0].toUpperCase() + runtimeStats.state.slice(1);
    hud.button.dataset.state = runtimeStats.state;
    hud.state.textContent = stateLabel;
    hud.summaryStat.textContent = runtimeStats.state === "error"
      ? "optimization error"
      : `${runtimeStats.optimized} optimized`;
    hud.total.textContent = runtimeStats.total;
    hud.retained.textContent = runtimeStats.retained;
    hud.optimized.textContent = runtimeStats.optimized;
    hud.elapsed.textContent = elapsedLabel(runtimeStats.lastPassAt);
    hud.error.textContent = runtimeStats.error || "";
    hud.error.hidden = !runtimeStats.error;
    hud.button.title = runtimeStats.error || `Last optimization pass: ${elapsedLabel(runtimeStats.lastPassAt)}`;
  }

  function createUi() {
    const host = document.createElement("div");
    host.id = "chatflow-local-host";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { color-scheme: light dark; }
        * { box-sizing: border-box; }
        .wrap { align-items: flex-end; display: flex; flex-direction: column; font: 13px/1.35 system-ui, sans-serif; gap: 8px; }
        .launcher { align-items: center; background: #16a34a; border: 0; border-radius: 999px; box-shadow: 0 6px 24px #0004; color: #fff; cursor: pointer; display: flex; font-size: 18px; height: 44px; justify-content: center; width: 44px; }
        .launcher:hover { background: #15803d; }
        .launcher:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid #60a5fa; outline-offset: 2px; }
        .panel { background: #171717; border: 1px solid #ffffff24; border-radius: 14px; box-shadow: 0 16px 48px #0006; color: #f5f5f5; padding: 14px; width: 278px; }
        .hidden { display: none; }
        .title { align-items: center; display: flex; justify-content: space-between; margin-bottom: 3px; }
        h2 { font-size: 15px; margin: 0; }
        .free { background: #14532d; border-radius: 999px; color: #bbf7d0; font-size: 10px; font-weight: 700; padding: 3px 7px; }
        .subtle { color: #aaa; font-size: 11px; margin: 0 0 12px; }
        label.row { align-items: center; display: flex; justify-content: space-between; margin: 9px 0; }
        input[type="checkbox"] { accent-color: #22c55e; height: 17px; width: 17px; }
        input[type="number"] { background: #292929; border: 1px solid #555; border-radius: 6px; color: #fff; padding: 4px 6px; width: 62px; }
        .status { background: #242424; border-radius: 8px; color: #bbb; margin: 10px 0; padding: 8px; }
        .exports { display: grid; gap: 6px; grid-template-columns: repeat(4, 1fr); }
        button.export, button.show { background: #303030; border: 1px solid #505050; border-radius: 8px; color: #f5f5f5; cursor: pointer; padding: 7px 5px; }
        button.export:hover, button.show:hover { background: #404040; }
        button.show { margin-bottom: 10px; width: 100%; }
        .toast { color: #86efac; font-size: 11px; min-height: 15px; padding-top: 6px; }
      </style>
      <div class="wrap">
        <div class="panel hidden" role="dialog" aria-label="ChatFlow Local controls">
          <div class="title"><h2>ChatFlow Local</h2><span class="free">FREE · UNLIMITED</span></div>
          <p class="subtle">Everything stays in this browser.</p>
          <label class="row"><span>Performance CSS</span><input data-setting="enabled" type="checkbox"></label>
          <label class="row"><span>Hide older turns</span><input data-setting="focusMode" type="checkbox"></label>
          <label class="row"><span>Keep latest turns</span><input data-setting="keepRecent" type="number" min="5" max="250" step="5"></label>
          <label class="row"><span>Show status HUD</span><input data-setting="showHud" type="checkbox"></label>
          <div class="status">Scanning this conversation…</div>
          <button class="show hidden" type="button">Show all messages</button>
          <div class="exports">
            <button class="export" data-format="pdf" type="button">PDF</button>
            <button class="export" data-format="md" type="button">MD</button>
            <button class="export" data-format="txt" type="button">TXT</button>
            <button class="export" data-format="json" type="button">JSON</button>
          </div>
          <div class="toast" role="status"></div>
        </div>
        <button class="launcher" type="button" aria-label="Open ChatFlow Local" aria-expanded="false">⚡</button>
      </div>`;

    document.documentElement.appendChild(host);

    const panel = shadow.querySelector(".panel");
    const launcher = shadow.querySelector(".launcher");
    const toast = shadow.querySelector(".toast");

    launcher.addEventListener("click", () => {
      panelOpen = !panelOpen;
      panel.classList.toggle("hidden", !panelOpen);
      launcher.setAttribute("aria-expanded", String(panelOpen));
    });

    shadow.querySelectorAll("[data-setting]").forEach((input) => {
      input.addEventListener("change", async () => {
        const key = input.dataset.setting;
        const value = input.type === "checkbox" ? input.checked : input.value;
        await saveSettings({ [key]: value });
      });
    });

    shadow.querySelector(".show").addEventListener("click", async () => {
      await saveSettings({ focusMode: false });
    });

    shadow.querySelectorAll("[data-format]").forEach((button) => {
      button.addEventListener("click", () => {
        try {
          const count = runExport(button.dataset.format);
          toast.textContent = `Prepared ${count} messages.`;
        } catch (error) {
          toast.textContent = error.message;
        }
      });
    });

    ui = {
      shadow,
      status: shadow.querySelector(".status"),
      show: shadow.querySelector(".show")
    };
  }

  function updateUi(total, hidden) {
    if (!ui) return;
    ui.shadow.querySelector('[data-setting="enabled"]').checked = settings.enabled;
    ui.shadow.querySelector('[data-setting="focusMode"]').checked = settings.focusMode;
    ui.shadow.querySelector('[data-setting="keepRecent"]').value = settings.keepRecent;
    ui.shadow.querySelector('[data-setting="showHud"]').checked = settings.showHud;
    ui.status.textContent = hidden
      ? `${total} messages · ${hidden} older turns hidden`
      : `${total} messages · all visible`;
    ui.show.classList.toggle("hidden", hidden === 0);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "chatflow-local") return false;

    (async () => {
      try {
        if (message.action === "getStatus") {
          sendResponse({
            ok: true,
            title: cleanTitle(),
            messageCount: runtimeStats.total,
            hidden: runtimeStats.optimized,
            settings,
            stats: { ...runtimeStats }
          });
          return;
        }
        if (message.action === "setSettings") {
          await saveSettings(message.settings || {});
          sendResponse({ ok: true, settings });
          return;
        }
        if (message.action === "export") {
          const count = runExport(message.format);
          sendResponse({ ok: true, count });
          return;
        }
        sendResponse({ ok: false, error: "Unknown command." });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  });

  async function init() {
    settings = await chrome.storage.local.get(DEFAULTS);
    settings.keepRecent = normalizeKeepRecent(settings.keepRecent);
    createUi();
    createHud();
    applyOptimization();

    observer = new MutationObserver(queueApply);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  init().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    chrome.runtime.sendMessage({
      type: "chatflow-stats",
      stats: { ...runtimeStats, state: "error", error: message, lastPassAt: Date.now() }
    }).catch(() => {});
    console.warn("ChatFlow Local could not start:", error);
  });
})();
