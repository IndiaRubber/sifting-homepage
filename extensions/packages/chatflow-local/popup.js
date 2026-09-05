const controls = document.querySelector("#controls");
const empty = document.querySelector("#empty");
const status = document.querySelector("#status");
const conversation = document.querySelector("#conversation");
const enabled = document.querySelector("#enabled");
const focusMode = document.querySelector("#focusMode");
const keepRecent = document.querySelector("#keepRecent");
const showHud = document.querySelector("#showHud");

let activeTabId;

function send(message) {
  return chrome.tabs.sendMessage(activeTabId, { type: "chatflow-local", ...message });
}

function showError(message) {
  status.textContent = message;
  status.style.color = "#fca5a5";
}

async function updateSettings(patch) {
  try {
    const response = await send({ action: "setSettings", settings: patch });
    if (!response?.ok) throw new Error(response?.error || "Could not update settings.");
    status.textContent = "Saved locally.";
    status.style.color = "#86efac";
  } catch (error) {
    showError(error.message);
  }
}

enabled.addEventListener("change", () => updateSettings({ enabled: enabled.checked }));
focusMode.addEventListener("change", () => updateSettings({ focusMode: focusMode.checked }));
keepRecent.addEventListener("change", () => updateSettings({ keepRecent: keepRecent.value }));
showHud.addEventListener("change", () => updateSettings({ showHud: showHud.checked }));

document.querySelectorAll("[data-format]").forEach((button) => {
  button.addEventListener("click", async () => {
    status.textContent = "Preparing export…";
    try {
      const response = await send({ action: "export", format: button.dataset.format });
      if (!response?.ok) throw new Error(response?.error || "Export failed.");
      status.textContent = `Prepared ${response.count} messages.`;
      status.style.color = "#86efac";
    } catch (error) {
      showError(error.message);
    }
  });
});

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id;
  const supported = /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab?.url || "");
  if (!activeTabId || !supported) {
    empty.hidden = false;
    return;
  }

  try {
    const response = await send({ action: "getStatus" });
    if (!response?.ok) throw new Error(response?.error || "ChatFlow Local is not ready.");
    controls.hidden = false;
    enabled.checked = response.settings.enabled;
    focusMode.checked = response.settings.focusMode;
    keepRecent.value = response.settings.keepRecent;
    showHud.checked = response.settings.showHud;
    conversation.textContent = `${response.title} · ${response.messageCount} messages${response.hidden ? ` · ${response.hidden} hidden` : ""}`;
  } catch (_error) {
    empty.hidden = false;
    showError("Reload the ChatGPT tab once after installing the extension.");
  }
})();
