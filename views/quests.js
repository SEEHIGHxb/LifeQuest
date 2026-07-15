// views/quests.js - the Goals tab: active and completed goals with progress
// bars and milestones. Moved verbatim from the old monolithic ui.js.

import { t, tp } from "../i18n.js";
import { escapeHtml, aspectLabel } from "./helpers.js";

// 4. RENDER THE MISSIONS TAB
export function renderQuests(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const active = state.goals.filter(g => !g.completed);
  const completed = state.goals.filter(g => g.completed);

  const progressBar = (goal) => {
    const pct = Math.round((goal.currentValue / goal.targetValue) * 100);
    return `
      <div class="xp-bar-container" style="height: 6px; margin-top: 8px;" role="progressbar" aria-label="${escapeHtml(t(goal.title))}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="xp-bar-fill" style="width: ${pct}%;"></div>
      </div>
      <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-secondary);">${tp("{current} / {target} logged", { current: goal.currentValue, target: goal.targetValue })}</span>`;
  };

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- ACTIVE MISSIONS -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Active Goals")}</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            ${t("Goals progress automatically as you log matching routines. Daily goals reset each day, weekly goals each week.")}
          </p>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            ${active.length === 0 ?
              `<p style="font-style: italic; color: var(--color-text-secondary);">${t("All goals completed. New cycles begin tomorrow.")}</p>` :
              active.map(goal => `
                <div style="border: 1px solid var(--color-card-border); border-radius: 4px; padding: 15px; background: #faf9f6;">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="holo-badge">${escapeHtml(t(goal.type.toUpperCase()))}</span>
                    <strong style="font-size: 1.05rem;">${escapeHtml(t(goal.title))}</strong>
                  </div>
                  <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 4px 0 4px 0;">${escapeHtml(t(goal.description))}</p>
                  <span class="text-gold" style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">${tp("Aspect: {aspect} • +{xp} points", { aspect: aspectLabel(goal.aspect).toUpperCase(), xp: goal.xpReward })}</span>
                  ${progressBar(goal)}
                  ${goal.milestones ? `
                    <ul style="list-style: none; margin-top: 8px; font-size: 0.8rem; color: var(--color-text-secondary);">
                      ${goal.milestones.map(m => `<li>${m.completed ? "✅" : "⬜"} ${escapeHtml(t(m.text))}</li>`).join("")}
                    </ul>` : ""}
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>

      <!-- COMPLETED LOG -->
      <div>
        <div class="card">
          <h3 class="card-header">${t("Completed Goals")}</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${completed.length === 0 ?
              `<p style="font-style: italic; color: var(--color-text-secondary);">${t("No completed goals in this cycle yet.")}</p>` :
              completed.map(goal => `
                <div style="border: 1.5px solid var(--color-nectar); border-radius: 4px; padding: 12px; background: rgba(52,199,89,0.06); display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <span style="font-weight: bold; color: var(--color-nectar);">${escapeHtml(t(goal.title))}</span>
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary);">${tp("Completed: +{xp} points", { xp: goal.xpReward })}</p>
                  </div>
                  <div style="font-size: 1.2rem; color: var(--color-nectar);">✔</div>
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>
    </div>
  `;
}
