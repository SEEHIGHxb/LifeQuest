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
  renderDeepAssessment,
  getLumiTip,
  openDialog
} from "./ui.js?v=22";
import { ASPECT_KEYS, ASPECT_META } from "./aspects.js";
import { t, tp, getLang, setLang } from "./i18n.js";
import { APP_VERSION } from "./version.js";

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
  if (path === "deep") {
    return { type: "deep" };
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
  const brandTitle = document.querySelector("header .brand h1");
  if (brandTitle) brandTitle.textContent = t("Life Balance Index");
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
  setText("footer-privacy", t("Privacy & Data"));
  setText("footer-source", t("Source code & license"));
  setText("footer-version", tp("Version {v}", { v: APP_VERSION }));
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
  maybeOfferRecovery();

  if (!state.onboarded) {
    // Show Onboarding Survey
    document.getElementById("nav-container").classList.add("d-none");
    document.getElementById("main-view").innerHTML = `<div id="onboarding-mount"></div>`;
    document.getElementById("assistant-mount").classList.add("d-none");

    renderOnboarding("onboarding-mount", () => {
      // Now that there is data worth keeping, ask the browser not to evict it.
      // Fire-and-forget: the grant is silent where supported and absent where
      // it isn't (Safari), so nothing in the UI waits on or reacts to it.
      stateManager.requestPersistentStorage();
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
  TABS.forEach((tab, index) => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) {
      // Remove old listeners by cloning node (clean re-binding)
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", () => navigateTo(tab));
      // Roving-tabindex arrow-key navigation (WCAG tablist pattern, finding #12)
      newBtn.addEventListener("keydown", (e) => handleTabKeydown(e, index));
    }
  });

  // Bind Reset button
  const resetBtn = document.getElementById("btn-reset-data");
  if (resetBtn) {
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    newResetBtn.addEventListener("click", confirmReset);
  }
}

// Reset is the only irreversible action in the app, and localStorage is the
// only copy of the data — there is no server to restore from. A bare confirm()
// made "erase everything" a single OK away, with the backup option living in a
// different button the user had to know to press first. This offers the export
// inside the same decision, and makes erasing the deliberate choice.
function confirmReset() {
  const { overlay, close } = openDialog({
    label: t("Erase all data"),
    html: `
    <div class="popup-card">
      <h2 class="popup-title" style="font-family: var(--font-serif); font-weight: bold;">${t("Erase all data?")}</h2>
      <p style="font-size: 0.95rem; margin-bottom: 8px;">${t("This deletes every logged routine, your goals, and your baseline assessment.")}</p>
      <p style="font-size: 0.95rem; margin-bottom: 20px;"><strong>${t("It cannot be undone, and this browser holds the only copy.")}</strong></p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn-primary btn-reset-export">${t("Download a backup, then erase")}</button>
        <button class="btn btn-danger btn-reset-confirm">${t("Erase without a backup")}</button>
        <button class="btn btn-reset-cancel">${t("Cancel")}</button>
      </div>
    </div>
  `
  });

  const wipe = () => {
    stateManager.resetState();
    window.location.hash = "";
    close();
    initializeApp();
  };

  overlay.querySelector(".btn-reset-export").addEventListener("click", () => {
    downloadBackup();
    wipe();
  });
  overlay.querySelector(".btn-reset-confirm").addEventListener("click", wipe);
  overlay.querySelector(".btn-reset-cancel").addEventListener("click", close);
}

// Roving-tabindex arrow-key handler for the tablist (finding #12): Left/Right
// wrap around, Home/End jump to the ends, and moving focus also activates.
function handleTabKeydown(e, index) {
  const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
  let target = null;
  if (delta) target = (index + delta + TABS.length) % TABS.length;
  else if (e.key === "Home") target = 0;
  else if (e.key === "End") target = TABS.length - 1;
  else return;
  e.preventDefault();
  const btn = document.getElementById(`tab-${TABS[target]}`);
  if (btn) {
    btn.focus();
    navigateTo(TABS[target]);
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
      const isActive = tab === activeTab;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      // Roving tabindex: the selected tab (or the first tab on non-tab routes)
      // is the single tab stop (finding #12).
      btn.tabIndex = tab === (activeTab || TABS[0]) ? 0 : -1;
    }
  });

  if (route.type === "aspect") {
    renderAspectPage("main-view", state, route.key, handleLogAction, renderActiveTab);
  } else if (route.type === "checkin") {
    renderCheckin("main-view", state, handleCheckinComplete);
  } else if (route.type === "deep") {
    renderDeepAssessment("main-view", state, handleDeepComplete);
  } else if (activeTab === "dashboard") {
    renderDashboard("main-view", state, downloadBackup);
  } else if (activeTab === "ledger") {
    renderLedger("main-view", state, handleLogAction, renderActiveTab);
  } else if (activeTab === "quests") {
    renderQuests("main-view", state);
  } else if (activeTab === "leaderboard") {
    renderLeaderboard("main-view", state, renderActiveTab);
  }

  announceRoute(route);
  updateAssistantBubble();
}

// Announce the current view to screen readers on navigation (finding #12).
function announceRoute(route) {
  const el = document.getElementById("route-announcer");
  if (!el) return;
  const tabNames = { dashboard: "Overview", ledger: "Activity Log", quests: "Goals", leaderboard: "Peer Comparison" };
  let label;
  if (route.type === "aspect") label = t(ASPECT_META[route.key]?.label || route.key);
  else if (route.type === "checkin") label = t("Re-assessment");
  else if (route.type === "deep") label = t("In-depth assessment");
  else label = t(tabNames[route.tab] || "Overview");
  el.textContent = tp("{view} view", { view: label });
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

function handleDeepComplete(aspect, result) {
  if (result && result.score !== undefined) {
    showToast(tp("{aspect} verified in depth — score now {score} (+60 points)", {
      aspect: t(ASPECT_META[aspect]?.label || aspect),
      score: result.score
    }));
  } else {
    showToast(t("In-depth assessment needs a baseline — complete the initial assessment first."), "warning");
  }
  renderActiveTab(); // stay on #/deep so the saved section shows as verified
}

function handleLogAction(id, title, impacts, xp, quantity = null) {
  const result = stateManager.logAction(id, title, impacts, xp, quantity);
  if (result.ok) {
    // Only celebrate a write that actually persisted. When storage rejected it,
    // the lifequest_storage_error listener below warns the user instead.
    if (result.persisted !== false) {
      const detail = quantity ? ` (${quantity.value} ${t(quantity.unit)})` : "";
      showReward(xp, impacts, detail);
    }
    renderActiveTab();
  } else {
    showToast(result.reason, "warning");
  }
}

// --- BACKUP EXPORT / IMPORT ---

// Shared by the header Export button and the dashboard's backup nudge, so both
// stamp lastExportAt (exportState does it) and the nudge clears on either path.
function downloadBackup() {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([stateManager.exportState()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lifequest_backup_${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(t("Data exported."));
  renderActiveTab();
}

function setupBackupControls() {
  const exportBtn = document.getElementById("btn-export-data");
  if (exportBtn) {
    const newExportBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
    newExportBtn.addEventListener("click", downloadBackup);
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

// --- UNREADABLE-SAVE RECOVERY OFFER ---
// When a previous save couldn't be read after an update, state.loadState() kept
// it (in RECOVERY_KEY) instead of letting the next write overwrite it. Offer a
// one-time, non-destructive download so the user can rescue that data. Built
// with textContent + element.style (no innerHTML) so nothing here is a sink.
let recoveryOffered = false;
function maybeOfferRecovery() {
  if (recoveryOffered || !stateManager.hasRecoverableSave()) return;
  recoveryOffered = true; // don't re-show on every re-render this session

  const raw = stateManager.getRecoverableSave();
  if (!raw) return;

  const banner = document.createElement("div");
  banner.className = "recovery-banner";
  banner.setAttribute("role", "alert");
  banner.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:1200;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;padding:12px 16px;background:var(--color-navy,#24344d);color:#fff;font-size:0.85rem;box-shadow:0 -2px 12px rgba(0,0,0,0.25);";

  const msg = document.createElement("span");
  msg.textContent = t("We found earlier data we couldn't open after an update. Download it before it's replaced.");
  banner.appendChild(msg);

  const download = document.createElement("button");
  download.type = "button";
  download.className = "btn btn-primary";
  download.style.cssText = "font-size:0.8rem;padding:4px 12px;";
  download.textContent = t("Download old data");
  download.addEventListener("click", () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lifequest_recovered_${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    stateManager.clearRecoverableSave(); // rescued — stop offering it
    banner.remove();
    showToast(t("Old data downloaded."));
  });
  banner.appendChild(download);

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "btn";
  dismiss.style.cssText = "font-size:0.8rem;padding:4px 12px;";
  dismiss.textContent = t("Dismiss");
  // Dismiss only hides the banner for this session; the data is intentionally
  // kept (not cleared) so it can't be lost by an accidental click.
  dismiss.addEventListener("click", () => banner.remove());
  banner.appendChild(dismiss);

  document.body.appendChild(banner);
}

// --- FLOATING TEXT FEEDBACK ---
function showToast(text, variant = "success") {
  const popup = document.createElement("div");
  popup.textContent = text;
  // Announce to screen readers even though the toast is pointer-events:none
  // and short-lived (finding #12).
  popup.setAttribute("role", "status");
  popup.setAttribute("aria-live", variant === "warning" ? "assertive" : "polite");
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

    const activate = () => triggerLumiMessage(t("Here to help. Focus on logging your routines today to build momentum."), { announce: true });
    newAvatar.addEventListener("click", activate);
    // Keyboard activation for the role="button" avatar (finding #12).
    newAvatar.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  }
}

function updateAssistantBubble() {
  const state = stateManager.state;
  if (!state.onboarded) return;

  triggerLumiMessage(getLumiTip(state.aspects));
}

// The typewriter is purely visual. Screen readers hear the message only when
// `announce` is set (explicit avatar activation) — the full text lands in the
// hidden live region at once, never character by character (review finding).
function triggerLumiMessage(message, { announce = false } = {}) {
  const bubble = document.getElementById("assistant-speech-bubble");
  if (!bubble) return;

  if (announce) {
    const sr = document.getElementById("assistant-sr");
    if (sr) sr.textContent = message;
  }

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
// openDialog supplies the WCAG dialog behavior (role/aria-modal, focus trap,
// Escape, focus restore) that this overlay used to lack (review finding).
window.addEventListener("lifequest_levelup", (e) => {
  const data = e.detail;

  const { overlay, close } = openDialog({
    label: t("Level Up"),
    html: `
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
  `
  });

  overlay.querySelector(".btn-close-levelup").addEventListener("click", close);
});

window.addEventListener("lifequest_quest_completed", (e) => {
  const data = e.detail;
  showToast(tp('Goal completed: "{title}" (+{xp} points)', { title: t(data.title), xp: data.xp }));
});

window.addEventListener("lifequest_commitment_completed", (e) => {
  const data = e.detail;
  showToast(tp("Weekly commitment met — +{bonus} bonus points.", { bonus: data.bonus }));
});

// A save was rejected (storage full, or Safari Private Mode). Surface it once
// so progress isn't silently lost; debounced so rapid writes don't flood toasts.
let storageErrorToastShown = false;
window.addEventListener("lifequest_storage_error", () => {
  if (storageErrorToastShown) return;
  storageErrorToastShown = true;
  showToast(t("Your device wouldn't save that change — storage may be full or you're in private mode. Export a backup to avoid losing progress."), "warning");
  setTimeout(() => { storageErrorToastShown = false; }, 8000);
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
