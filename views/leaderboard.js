// views/leaderboard.js - the Peer Comparison tab: comparison codes and the
// rankings table. Moved verbatim from the old monolithic ui.js.

import { stateManager } from "../state.js";
import { encodeCrewCode, decodeCrewCode, crewPoints } from "../crewcode.js";
import { t, tp } from "../i18n.js";
import { escapeHtml } from "./helpers.js";

// Sample profiles that populate the peer-comparison board until real codes are added
const MOCK_COMPETITORS = [
  { name: "Nadia", level: 48, totalPoints: 4850 },
  { name: "Marcus", level: 42, totalPoints: 4280 },
  { name: "Priya", level: 31, totalPoints: 3150 },
  { name: "Kenji", level: 24, totalPoints: 2420 },
  { name: "Sofia", level: 19, totalPoints: 1950 },
  { name: "Liam", level: 12, totalPoints: 1280 }
];

// 5. RENDER LEADERBOARD
export function renderLeaderboard(containerId, state, onRefresh) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const friends = state.friends || [];
  const userEntry = {
    name: tp("{name} (You)", { name: state.profile.name }),
    level: state.profile.level,
    totalPoints: crewPoints(state),
    isUser: true
  };
  const friendEntries = friends.map(f => ({ ...f, isFriend: true }));
  // NPCs pad the board until real crewmates are added.
  const npcEntries = MOCK_COMPETITORS.map(pl => ({ ...pl, isNpc: true }));

  const allPlayers = [...npcEntries, ...friendEntries, userEntry]
    .map(pl => ({ ...pl, rankClass: stateManager.getRankClass(pl.level) }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const myCode = encodeCrewCode(state);

  container.innerHTML = `
    <div style="max-width: 650px; margin: 0 auto;">
      <div class="card">
        <h3 class="card-header">${t("Comparison Codes")}</h3>
        <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 12px;">
          ${t("Peer comparison uses <strong>real people</strong>: share your code with others over LINE or Discord, and paste theirs below. Codes carry only your name, level, points, and aspect scores — nothing private. Re-paste a newer code any time to update a participant.")}
        </p>
        <div class="form-group">
          <label for="my-crew-code">${t("Your Comparison Code")}</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="my-crew-code" class="form-control" value="${myCode}" readonly style="font-family: var(--font-mono); font-size: 0.75rem;">
            <button type="button" id="btn-copy-code" class="btn btn-primary" style="white-space: nowrap;">${t("Copy")}</button>
          </div>
        </div>
        <form id="add-friend-form">
          <div class="form-group">
            <label for="friend-code">${t("Add a participant's code")}</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="friend-code" class="form-control" placeholder="LQ1-..." style="font-family: var(--font-mono); font-size: 0.75rem;" required>
              <button type="submit" class="btn btn-primary" style="white-space: nowrap;">${t("Add")}</button>
            </div>
          </div>
        </form>
        <p id="friend-error" class="d-none" style="color: var(--color-crimson); font-size: 0.85rem; font-weight: 600;"></p>
      </div>

      <div class="card">
        <h3 class="card-header">${t("Peer Comparison")}</h3>
        <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 15px;">
          ${friends.length === 0
            ? t("No participants added yet — sample profiles fill the board until you add codes.")
            : tp(friends.length === 1
                ? "{n} participant added. Sample rows are marked."
                : "{n} participants added. Sample rows are marked.", { n: friends.length })}
        </p>

        <div class="table-scroll">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--color-card-border); font-family: var(--font-serif); font-size: 1.05rem; color: var(--color-navy);">
              <th style="padding: 10px;">${t("Rank")}</th>
              <th style="padding: 10px;">${t("Participant")}</th>
              <th style="padding: 10px; text-align: center;">${t("Level")}</th>
              <th style="padding: 10px; text-align: right;">${t("Total Points")}</th>
              <th style="padding: 10px; text-align: center;">${t("Tier")}</th>
            </tr>
          </thead>
          <tbody>
            ${allPlayers.map((player, idx) => {
              const rowStyle = player.isUser ? `background: var(--color-astral-glow); font-weight: bold; border: 1px solid var(--color-gold);` : `border-bottom: 1px solid var(--color-card-border);`;
              const badgeClass = idx === 0 ? `background: var(--color-gold); color: #fff;` : idx === 1 ? `background: #b8b2a6; color: #fff;` : `background: var(--bg-primary); color: var(--color-text-secondary);`;
              return `
                <tr style="${rowStyle}">
                  <td style="padding: 12px 10px;"><span style="border-radius:50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; border: 1px solid var(--color-gold); ${badgeClass}">${idx + 1}</span></td>
                  <td style="padding: 12px 10px;">
                    ${escapeHtml(player.isNpc ? t(player.name) : player.name)}
                    ${player.isNpc ? `<span class="npc-tag">${t("Sample")}</span>` : ""}
                    ${player.isFriend ? `<button type="button" class="friend-remove" data-friend-id="${escapeHtml(player.id)}" aria-label="${tp("Remove {name}", { name: escapeHtml(player.name) })}" title="${t("Remove participant")}">✕</button>` : ""}
                  </td>
                  <td style="padding: 12px 10px; text-align: center; font-family: var(--font-mono);">${escapeHtml(player.level)}</td>
                  <td style="padding: 12px 10px; text-align: right; font-family: var(--font-mono);">${escapeHtml(player.totalPoints)}</td>
                  <td style="padding: 12px 10px; text-align: center;"><span class="holo-badge">${escapeHtml(t(player.rankClass))}</span></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  `;

  // Copy own code (clipboard API with select-fallback for older browsers).
  document.getElementById("btn-copy-code").addEventListener("click", async () => {
    const input = document.getElementById("my-crew-code");
    input.select();
    try {
      await navigator.clipboard.writeText(myCode);
    } catch {
      document.execCommand("copy");
    }
    const btn = document.getElementById("btn-copy-code");
    btn.textContent = t("Copied!");
    setTimeout(() => { btn.textContent = t("Copy"); }, 1500);
  });

  document.getElementById("add-friend-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("friend-error");
    errorEl.classList.add("d-none");
    try {
      const friend = decodeCrewCode(document.getElementById("friend-code").value);
      const result = stateManager.addFriend(friend);
      if (!result.ok) throw new Error(result.reason);
      if (onRefresh) onRefresh();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("d-none");
    }
  });

  container.querySelectorAll(".friend-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      stateManager.removeFriend(btn.getAttribute("data-friend-id"));
      if (onRefresh) onRefresh();
    });
  });
}
