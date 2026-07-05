// app.js - LifeQuest Core Coordinator

import { stateManager } from "./state.js";
import {
  renderOnboarding,
  renderDashboard,
  renderLedger,
  renderQuests,
  renderLeaderboard,
  renderAspectPage,
  renderCheckin,
  getLumiTip
} from "./ui.js?v=20";
import { ASPECT_KEYS, ASPECT_META } from "./aspects.js";
import { t, tp, getLang, setLang } from "./i18n.js";

const TOAST_DURATION_MS = 1600;
const REWARD_DURATION_MS = 1900;
const TYPEWRITER_SPEED_MS = 15;
const TABS = ["dashboard", "ledger", "quests", "leaderboard"];
const DEFAULT_TAB = "dashboard";

let lumiTypewriterInterval = null;

// --- ROUTING (hash-based so GitHub Pages and the back button both work) ---

// Parses "#/dashboard" -> {type:"tab", tab} and "#/aspect/<key>" ->
// {type:"aspect", key}; anything unknown falls back to the dashboard.
function routeFromHash() {
  const path = window.location.hash.replace(/^#\/?/, "");
  const aspectMatch = path.match(/^aspect\/([a-zA-Z]+)$/);
  if (aspectMatch && ASPECT_KEYS.includes(aspectMatch[1])) {
    return { type: "aspect", key: aspectMatch[1] };
  }
  if (path === "checkin") {
    return { type: "checkin" };
  }
  return { type: "tab", tab: TABS.includes(path) ? path : DEFAULT_TAB };
}

function navigateTo(tab) {
  const target = `#/${tab}`;
  if (window.location.hash === target) {
    renderActiveTab(); // same-tab click: just refresh
  } else {
    window.location.hash = target; // hashchange listener renders
  }
}

// Translate the static header/nav chrome that lives in index.html.
function applyChromeTranslations() {
  document.documentElement.lang = getLang();
  document.title = t("Life Balance Index — Personal Wellbeing Assessment");
  const brandSub = document.querySelector("header .brand p");
  if (brandSub) brandSub.textContent = t("Personal Wellbeing Assessment");
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText("btn-export-data", t("Export"));
  setText("btn-import-data", t("Import"));
  setText("btn-reset-data", t("Reset Data"));
  setText("tab-dashboard", t("Overview"));
  setText("tab-ledger", t("Activity Log"));
  setText("tab-quests", t("Goals"));
  setText("tab-leaderboard", t("Peer Comparison"));
  // The toggle shows the language you would switch TO.
  setText("btn-lang", getLang() === "th" ? "EN" : "ไทย");
}

function setupLanguageToggle() {
  const btn = document.getElementById("btn-lang");
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener("click", () => {
    setLang(getLang() === "th" ? "en" : "th");
    initializeApp(); // re-render everything in the new language
  });
}

function initializeApp() {
  const state = stateManager.state;
  applyChromeTranslations();
  setupLanguageToggle();

  if (!state.onboarded) {
    // Show Onboarding Survey
    document.getElementById("nav-container").classList.add("d-none");
    document.getElementById("main-view").innerHTML = `<div id="onboarding-mount"></div>`;
    document.getElementById("assistant-mount").classList.add("d-none");

    renderOnboarding("onboarding-mount", () => {
      initializeApp();
    });
  } else {
    document.getElementById("nav-container").classList.remove("d-none");
    document.getElementById("assistant-mount").classList.remove("d-none");
    setupNavigation();
    setupAssistant();
    setupBackupControls();
    renderActiveTab();
  }
}

function setupNavigation() {
  TABS.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) {
      // Remove old listeners by cloning node (clean re-binding)
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", () => navigateTo(tab));
    }
  });

  // Bind Reset button
  const resetBtn = document.getElementById("btn-reset-data");
  if (resetBtn) {
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    newResetBtn.addEventListener("click", () => {
      if (confirm(t("Are you sure you want to erase all records and your baseline assessment? This cannot be undone."))) {
        stateManager.resetState();
        window.location.hash = "";
        initializeApp();
      }
    });
  }
}

function renderActiveTab() {
  const state = stateManager.state;
  const route = routeFromHash();
  const activeTab = route.type === "tab" ? route.tab : null;

  // Reflect route in tab buttons (none active on aspect pages)
  TABS.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) {
      btn.classList.toggle("active", tab === activeTab);
      btn.setAttribute("aria-selected", tab === activeTab ? "true" : "false");
    }
  });

  if (route.type === "aspect") {
    renderAspectPage("main-view", state, route.key, handleLogAction, renderActiveTab);
  } else if (route.type === "checkin") {
    renderCheckin("main-view", state, handleCheckinComplete);
  } else if (activeTab === "dashboard") {
    renderDashboard("main-view", state);
  } else if (activeTab === "ledger") {
    renderLedger("main-view", state, handleLogAction, renderActiveTab);
  } else if (activeTab === "quests") {
    renderQuests("main-view", state);
  } else if (activeTab === "leaderboard") {
    renderLeaderboard("main-view", state, renderActiveTab);
  }

  updateAssistantBubble();
}

function handleCheckinComplete(shifts) {
  if (shifts) {
    const parts = Object.entries(shifts)
      .map(([key, v]) => `${t(ASPECT_META[key]?.label || key)} ${v >= 0 ? "+" : ""}${v}`);
    showToast(tp("Re-assessment complete: {parts} (+40 points)", { parts: parts.join(", ") }));
  } else {
    showToast(t("Re-assessment needs a baseline — complete the initial assessment first."), "warning");
  }
  window.location.hash = "#/dashboard";
}

function handleLogAction(id, title, impacts, xp, quantity = null) {
  const result = stateManager.logAction(id, title, impacts, xp, quantity);
  if (result.ok) {
    const detail = quantity ? ` (${quantity.value} ${t(quantity.unit)})` : "";
    showReward(xp, impacts, detail);
    renderActiveTab();
  } else {
    showToast(result.reason, "warning");
  }
}

// --- BACKUP EXPORT / IMPORT ---

function setupBackupControls() {
  const exportBtn = document.getElementById("btn-export-data");
  if (exportBtn) {
    const newExportBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
    newExportBtn.addEventListener("click", () => {
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([stateManager.exportState()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lifequest_backup_${stamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(t("Data exported."));
    });
  }

  const importBtn = document.getElementById("btn-import-data");
  const fileInput = document.getElementById("import-file-input");
  if (importBtn && fileInput) {
    const newImportBtn = importBtn.cloneNode(true);
    importBtn.parentNode.replaceChild(newImportBtn, importBtn);
    newImportBtn.addEventListener("click", () => {
      if (confirm(t("Importing a backup replaces ALL current data. Continue?"))) {
        fileInput.value = "";
        fileInput.click();
      }
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        stateManager.importState(await file.text());
        showToast(t("Data imported successfully."));
        initializeApp();
      } catch (err) {
        console.error("Import failed:", err);
        showToast(tp("Import failed: {msg}", { msg: err.message }), "warning");
      }
    });
  }
}

// --- FLOATING TEXT FEEDBACK ---
function showToast(text, variant = "success") {
  const popup = document.createElement("div");
  popup.textContent = text;
  popup.style.position = "fixed";
  popup.style.bottom = "80px";
  popup.style.right = "80px";
  popup.style.maxWidth = "320px";
  popup.style.background = variant === "warning" ? "var(--color-crimson)" : "var(--color-navy)";
  popup.style.color = "#fff";
  popup.style.padding = "8px 16px";
  popup.style.borderRadius = "20px";
  popup.style.fontFamily = "var(--font-mono)";
  popup.style.fontSize = "0.85rem";
  popup.style.zIndex = "1100";
  popup.style.pointerEvents = "none";
  popup.style.boxShadow = "0 4px 10px rgba(31, 45, 68, 0.3)";

  document.body.appendChild(popup);

  popup.animate([
    { transform: "translateY(0) scale(0.9)", opacity: 1 },
    { transform: "translateY(-60px) scale(1)", opacity: 0 }
  ], {
    duration: TOAST_DURATION_MS,
    easing: "ease-out"
  });

  setTimeout(() => popup.remove(), TOAST_DURATION_MS);
}

// Rewarding confirmation when a routine is logged: a card pops in with the
// points earned and the aspects that improved, then rises and fades. Built
// with textContent (no innerHTML) since it renders live user/session values.
function showReward(xp, impacts, detail = "") {
  const gains = Object.entries(impacts)
    .filter(([, change]) => change > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([aspect, change]) => `${t(ASPECT_META[aspect]?.label || aspect)} +${change}`);

  const card = document.createElement("div");
  card.className = "reward-pop";
  card.setAttribute("role", "status");
  card.setAttribute("aria-live", "polite");

  const check = document.createElement("span");
  check.className = "reward-check";
  check.setAttribute("aria-hidden", "true");
  check.textContent = "✓";
  card.appendChild(check);

  const body = document.createElement("span");
  body.className = "reward-body";

  const xpLine = document.createElement("span");
  xpLine.className = "reward-xp";
  xpLine.textContent = `+${xp} ${t("points")}${detail}`;
  body.appendChild(xpLine);

  if (gains.length) {
    const gainLine = document.createElement("span");
    gainLine.className = "reward-gains";
    gainLine.textContent = gains.join("  ·  ");
    body.appendChild(gainLine);
  }

  card.appendChild(body);
  document.body.appendChild(card);
  setTimeout(() => card.remove(), REWARD_DURATION_MS);
}

// --- ASSISTANT MANAGEMENT ---
function setupAssistant() {
  const avatar = document.getElementById("assistant-lumi-avatar");
  if (avatar) {
    const newAvatar = avatar.cloneNode(true);
    avatar.parentNode.replaceChild(newAvatar, avatar);

    newAvatar.addEventListener("click", () => {
      triggerLumiMessage(t("Here to help. Focus on logging your routines today to build momentum."));
    });
  }
}

function updateAssistantBubble() {
  const state = stateManager.state;
  if (!state.onboarded) return;

  triggerLumiMessage(getLumiTip(state.aspects));
}

function triggerLumiMessage(message) {
  const bubble = document.getElementById("assistant-speech-bubble");
  if (!bubble) return;

  if (lumiTypewriterInterval) {
    clearInterval(lumiTypewriterInterval);
  }
  bubble.textContent = "";

  let idx = 0;
  lumiTypewriterInterval = setInterval(() => {
    if (idx < message.length) {
      bubble.textContent += message.charAt(idx);
      idx++;
    } else {
      clearInterval(lumiTypewriterInterval);
      lumiTypewriterInterval = null;
    }
  }, TYPEWRITER_SPEED_MS);
}

// --- EVENT LISTENERS (LEVEL UP MODAL) ---
window.addEventListener("lifequest_levelup", (e) => {
  const data = e.detail;

  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  overlay.innerHTML = `
    <div class="popup-card">
      <div style="font-size: 3rem; margin-bottom: 10px;">🏆</div>
      <h2 class="popup-title" style="font-family: var(--font-serif); font-weight: bold;">${t("Level Up")}</h2>
      <p style="font-size: 1.1rem; margin-bottom: 15px;">${t("Your overall progress level has increased.")}</p>
      <div style="background: var(--color-astral-glow); border: 1.5px solid var(--color-astral-dark); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <span style="font-family: var(--font-mono); font-size: 1.4rem; font-weight: bold; color: var(--color-navy);">${tp("LEVEL {n}", { n: data.level })}</span>
        <br>
        <span class="text-gold" style="font-family: var(--font-serif); font-weight: 600; font-size: 1.1rem;">${tp("Rank: {rank}", { rank: t(data.rank) })}</span>
      </div>
      <button class="btn btn-primary btn-close-levelup" style="width: 120px;">${t("Continue")}</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector(".btn-close-levelup").addEventListener("click", () => {
    overlay.remove();
  });
});

window.addEventListener("lifequest_quest_completed", (e) => {
  const data = e.detail;
  showToast(tp('Goal completed: "{title}" (+{xp} points)', { title: t(data.title), xp: data.xp }));
});

window.addEventListener("lifequest_commitment_completed", (e) => {
  const data = e.detail;
  showToast(tp("Weekly commitment met — +{bonus} bonus points.", { bonus: data.bonus }));
});

// Re-render when the route changes (back/forward buttons, tab clicks)
window.addEventListener("hashchange", () => {
  if (stateManager.state.onboarded) {
    renderActiveTab();
  }
});

// PWA: offline support via the network-first service worker.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.error("Service worker registration failed:", err);
    });
  });
}

// Start the App
window.addEventListener("DOMContentLoaded", initializeApp);
export { initializeApp };
