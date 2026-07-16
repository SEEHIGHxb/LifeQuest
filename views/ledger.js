// views/ledger.js - the Activity Log tab: preset/custom routine grid and the
// custom-routine creator. Moved verbatim from the old monolithic ui.js.

import { stateManager } from "../state.js";
import { t } from "../i18n.js";
import { ACTION_PRESETS } from "./actions.js";
import { ASPECT_LABELS, actionCard, bindActionCards } from "./helpers.js";

// 3. RENDER THE ACTION LEDGER
export function renderLedger(containerId, state, onLogAction, onRoutineChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const customActions = state.customActions || [];

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- ACTIONS LIST -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Log Routine")}</h3>
          <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            ${t("Select a routine below to record it. Your aspect scores update automatically (max 5 logs per routine per day).")}
          </p>
          <div class="action-grid">
            ${ACTION_PRESETS.map(a => actionCard(a, false)).join("")}
            ${customActions.map(a => actionCard(a, true)).join("")}
          </div>
        </div>
      </div>

      <!-- CUSTOM ROUTINE CREATOR -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Register New Routine")}</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            ${t("Registered routines appear in the routine grid and can be logged like presets.")}
          </p>
          <form id="custom-action-form">
            <div class="form-group">
              <label for="custom-title">${t("Routine Name")}</label>
              <input type="text" id="custom-title" class="form-control" placeholder="${t("E.g., Practice Meditating")}" maxlength="60" required>
            </div>

            <div class="form-group">
              <label for="custom-aspect">${t("Target Aspect")}</label>
              <select id="custom-aspect" class="form-control">
                ${Object.entries(ASPECT_LABELS).map(([key, label]) => `<option value="${key}">${t(label)}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label for="custom-points">${t("Aspect Sync Impact (+1 to +15)")}</label>
              <input type="number" id="custom-points" class="form-control" value="5" min="1" max="15" required>
            </div>

            <div class="form-group">
              <label for="custom-xp">${t("Points Reward (+5 to +50)")}</label>
              <input type="number" id="custom-xp" class="form-control" value="15" min="5" max="50" required>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">${t("Register Routine")}</button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Bind logging clicks (presets + custom routines).
  bindActionCards(container, [...ACTION_PRESETS, ...customActions], onLogAction);

  // Bind remove buttons for custom routines
  container.querySelectorAll(".action-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      stateManager.removeCustomAction(btn.getAttribute("data-remove-id"));
      onRoutineChange();
    });
  });

  // Handle custom routine registration
  document.getElementById("custom-action-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("custom-title").value;
    const aspect = document.getElementById("custom-aspect").value;
    const pts = parseInt(document.getElementById("custom-points").value);
    const xp = parseInt(document.getElementById("custom-xp").value);

    stateManager.addCustomAction(title, aspect, pts, xp);
    onRoutineChange();
  });
}
