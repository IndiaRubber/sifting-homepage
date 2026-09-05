const DEFAULT_SETTINGS = {
  enabled: true,
  focusMode: false,
  keepRecent: 40,
  showHud: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
  await chrome.storage.local.set({
    enabled: saved.enabled,
    focusMode: saved.focusMode,
    keepRecent: saved.keepRecent,
    showHud: saved.showHud
  });
});

function compactCount(value) {
  const count = Math.max(0, Number(value) || 0);
  if (count >= 10000) return `${Math.floor(count / 1000)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(".0", "")}k`;
  return String(count);
}

async function updateBadge(tabId, stats) {
  if (!Number.isInteger(tabId)) return;

  const state = stats?.state || "idle";
  const optimized = Math.max(0, Number(stats?.optimized) || 0);
  const text = state === "error" ? "!" : state === "active" ? compactCount(optimized) : "";
  const color = state === "error" ? "#dc2626" : "#16a34a";
  const title = state === "error"
    ? `ChatFlow Local error: ${stats?.error || "Unknown error"}`
    : state === "active"
      ? `ChatFlow Local: ${optimized} optimized or unloaded`
      : "ChatFlow Local: idle";

  await Promise.all([
    chrome.action.setBadgeText({ tabId, text }),
    chrome.action.setBadgeBackgroundColor({ tabId, color }),
    chrome.action.setTitle({ tabId, title })
  ]);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "chatflow-stats") return;
  updateBadge(sender.tab?.id, message.stats).catch(() => {});
});
