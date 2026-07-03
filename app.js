// app.js - LifeQuest Core Coordinator

import { stateManager } from "./state.js";
import {
  renderOnboarding,
  renderDashboard,
  renderLedger,
  renderQuests,
  renderLeaderboard,
  getLumiTip
} from "./ui.js?v=7";

const TOAST_DURATION_MS = 1600;
const TYPEWRITER_SPEED_MS = 15;

let activeTab = "dashboard";
let lumiTypewriterInterval = null;

function initializeApp() {
  const state = stateManager.state;

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
    renderActiveTab();
  }
}

function setupNavigation() {
  const tabs = ["dashboard", "ledger", "quests", "leaderboard"];
  tabs.forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) {
      // Remove old listeners by cloning node (clean re-binding)
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        newBtn.classList.add("active");
        newBtn.setAttribute("aria-selected", "true");

        activeTab = tab;
        renderActiveTab();
      });
    }
  });

  // Bind Reset button
  const resetBtn = document.getElementById("btn-reset-data");
  if (resetBtn) {
    const newResetBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    newResetBtn.addEventListener("click", () => {
      if (confirm("Lumi Warning: Are you sure you want to wipe all records and baseline synchronization? This cannot be undone.")) {
        stateManager.resetState();
        activeTab = "dashboard";
        initializeApp();
      }
    });
  }
}

function renderActiveTab() {
  const state = stateManager.state;

  if (activeTab === "dashboard") {
    renderDashboard("main-view", state);
  } else if (activeTab === "ledger") {
    renderLedger("main-view", state, handleLogAction, renderActiveTab);
  } else if (activeTab === "quests") {
    renderQuests("main-view", state);
  } else if (activeTab === "leaderboard") {
    renderLeaderboard("main-view", state);
  }

  updateAssistantBubble();
}

function handleLogAction(id, title, impacts, xp) {
  const result = stateManager.logAction(id, title, impacts, xp);
  if (result.ok) {
    showToast(`+${xp} XP logged!`);
    renderActiveTab();
  } else {
    showToast(result.reason, "warning");
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

// --- ASSISTANT MANAGEMENT ---
function setupAssistant() {
  const avatar = document.getElementById("assistant-lumi-avatar");
  if (avatar) {
    const newAvatar = avatar.cloneNode(true);
    avatar.parentNode.replaceChild(newAvatar, avatar);

    newAvatar.addEventListener("click", () => {
      triggerLumiMessage("Yes? Lumi is here to guide your Trailblaze. Focus on your routines today.");
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
      <h2 class="popup-title text-gold" style="font-family: var(--font-serif); font-weight: bold;">TRAILBLAZE LEVEL UP!</h2>
      <p style="font-size: 1.1rem; margin-bottom: 15px;">Your Trailblaze synchronization level has increased.</p>
      <div style="background: var(--color-astral-glow); border: 1.5px solid var(--color-astral-dark); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <span style="font-family: var(--font-mono); font-size: 1.4rem; font-weight: bold; color: var(--color-navy);">LEVEL ${data.level}</span>
        <br>
        <span class="text-gold" style="font-family: var(--font-serif); font-weight: 600; font-size: 1.1rem;">Rank: ${data.rank}</span>
      </div>
      <button class="btn btn-primary btn-close-levelup" style="width: 120px;">Continue</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector(".btn-close-levelup").addEventListener("click", () => {
    overlay.remove();
  });
});

window.addEventListener("lifequest_quest_completed", (e) => {
  const data = e.detail;
  showToast(`Mission Complete: "${data.title}" (+${data.xp} XP)`);
});

// Start the App
window.addEventListener("DOMContentLoaded", initializeApp);
export { initializeApp };
