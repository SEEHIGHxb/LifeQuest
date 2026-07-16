// views/helpers.js - presentation glue shared by two or more view modules:
// HTML escaping, aspect labels, confidence badges, benchmark standing lines,
// commitment pin, routine cards, and the quantity prompt. Moved verbatim from
// the old monolithic ui.js; behavior unchanged.

import { stateManager } from "../state.js";
import { percentileBand } from "../benchmarks.js";
import { getAspectConfidence, ASPECT_KEYS } from "../aspects.js";
import { t, tp, percentileLabel } from "../i18n.js";

// Escape user-provided strings before inserting into innerHTML.
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

export const ASPECT_LABELS = {
  finance: "Finance",
  physical: "Physical",
  mental: "Mental",
  relationships: "Relationships",
  personalGoals: "Personal Goals",
  socialContribution: "Social Contribution",
  environment: "Environment",
  humanityFuture: "Humanity's Future"
};

// Localized aspect label (falls back to the raw key).
// Escaped: an unknown key (e.g. from an imported save) falls through to `key`
// itself, which would otherwise be echoed raw into innerHTML.
export const aspectLabel = key => escapeHtml(t(ASPECT_LABELS[key] || key));

// --- CONFIDENCE UI (Phase 2) ---

export const CONFIDENCE_LABELS = () => ({ verified: t("In-depth"), high: t("High"), partial: t("Partial"), estimated: t("Estimated") });

// Aspects whose survey inputs the monthly re-assessment (#/checkin) re-runs, so
// an estimated one there gets an actionable link rather than text-only guidance.
export const CHECKIN_ASPECTS = ["mental", "relationships", "personalGoals"];

// Small tier badge for an aspect (dashboard rows + aspect header). Empty string
// when confidence is unknown (older saves with no captured coverage).
export function confidenceBadge(conf) {
  if (!conf || !conf.tier) return "";
  const title = conf.tier === "verified"
    ? t("Measured with the full long-form instruments (deep assessment complete)")
    : tp("Score confidence: {answered} of {total} inputs answered", { answered: conf.answered, total: conf.total });
  return `<span class="confidence-badge confidence-${conf.tier}" title="${escapeHtml(title)}">${CONFIDENCE_LABELS()[conf.tier]}</span>`;
}

// Component-row chip: shown for partial/estimated (to flag low confidence) and
// for verified (to credit deep-assessment rows); high stays uncluttered.
export function componentConfidenceChip(tier) {
  if (tier !== "partial" && tier !== "estimated" && tier !== "verified") return "";
  return `<span class="component-confidence confidence-${tier}">${CONFIDENCE_LABELS()[tier]}</span>`;
}

// --- FRIENDLIER PERCENTILE PRESENTATION ---
//
// A percentile is jargon; most people read "ahead of ~62% of people like you"
// far more easily. These helpers turn the raw percentile into a plain-language
// phrase and a one-line definition; the coarse band label comes from
// percentileBand() in benchmarks.js. The exact number and its indicative range
// stay available as secondary detail.

// The headline sentence a non-technical reader understands at a glance.
export function percentilePhrase(percentile) {
  return tp("Ahead of about {pct}% of people like you", { pct: percentile });
}

// One shared "Standing vs society" block, used on the dashboard row and the
// aspect gauge. `compact` trims it to a single line for the dashboard list.
export function benchmarkStanding(b, { compact = false } = {}) {
  const band = percentileBand(b.percentile);
  const chip = `<span class="percentile-band band-${band.key}">${t(band.label)}</span>`;
  const detail = tp("{pct} percentile · typical range {low}–{high}", {
    pct: percentileLabel(b.percentile),
    low: percentileLabel(b.range.low),
    high: percentileLabel(b.range.high)
  });
  if (compact) {
    return `<span class="benchmark-plain">${percentilePhrase(b.percentile)}</span> ${chip} <span class="benchmark-detail">${detail}</span>`;
  }
  return `
    <p class="benchmark-plain-lead">${percentilePhrase(b.percentile)} ${chip}</p>
    <p class="benchmark-detail">${detail}${b.verified ? ` · <span class="benchmark-verified">${t("in-depth verified")}</span>` : ""}</p>
    <p class="gauge-note percentile-definition">${t("“Percentile” = the share of people you're ahead of, so higher is better. The range shows how precise this estimate is, not a statistical confidence interval.")}</p>`;
}

// Localized method tag for a benchmark ("vs published norms", …). Was a
// METHOD_TAGS object duplicated in the dashboard and aspect views.
export function methodTag(method) {
  const tags = {
    distribution: t("vs published norms"),
    threshold: t("vs participation rates"),
    estimate: t("estimate")
  };
  return tags[method] || method;
}

// Aspect keys currently scored purely from defaults (tier === "estimated").
export function estimatedAspects(state) {
  return ASPECT_KEYS.filter(k => getAspectConfidence(state, k).tier === "estimated");
}

// Pinned commitment progress (dashboard + aspect page).
export function commitmentPin(commitment) {
  const pct = Math.min(100, Math.round((commitment.progress / commitment.weeklyTarget) * 100));
  return `
    <div class="commit-head">
      <span>${tp("{aspect} • this week", { aspect: aspectLabel(commitment.aspect) })}</span>
      <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${commitment.progress} / ${commitment.weeklyTarget}</span>
    </div>
    <div class="xp-bar-container" style="height: 6px; margin-top: 4px;" role="progressbar" aria-label="${t("Commitment progress")}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="xp-bar-fill" style="width: ${pct}%;"></div>
    </div>
    <div class="commit-note">${commitment.completed
      ? t("✅ Pledge complete — bonus points banked. Resets next week.")
      : tp("Log {n} more {aspect} routine(s) for +{xp} bonus points.", {
          n: commitment.weeklyTarget - commitment.progress,
          aspect: aspectLabel(commitment.aspect),
          xp: stateManager.commitBonusXp(commitment.weeklyTarget)
        })}</div>`;
}

// Duty-of-care banner (finding #4). Renders the mental-health support notice
// from getMentalHealthNotice(): static app copy plus Thailand hotline numbers,
// escaped defensively to match the other innerHTML sinks. Returns "" when
// there is nothing to show.
export function mentalHealthNotice(notice) {
  if (!notice) return "";
  return `
    <div class="care-banner" role="note" aria-label="${escapeHtml(t("Mental health support"))}">
      <p class="care-banner-title">${escapeHtml(notice.title)}</p>
      <p class="care-banner-text">${escapeHtml(notice.body)}</p>
      <ul class="care-resources">
        ${notice.resources.map(r => `
          <li>
            <span class="care-resource-label">${escapeHtml(r.label)}</span>
            <a class="care-resource-tel" href="tel:${escapeHtml(String(r.tel).replace(/[^0-9+]/g, ""))}">${escapeHtml(r.tel)}</a>
          </li>`).join("")}
      </ul>
    </div>`;
}

// Shared routine-card markup (ledger + aspect pages).
export function actionCard(action, removable) {
  return `
    <div class="action-card" data-id="${escapeHtml(action.id)}" role="button" tabindex="0" aria-label="${tp("Log {title}", { title: escapeHtml(t(action.title)) })}">
      ${removable ? `<button type="button" class="action-remove" data-remove-id="${action.id}" aria-label="${t("Remove routine")}" title="${t("Remove routine")}">✕</button>` : ""}
      <div class="action-title">${escapeHtml(t(action.title))}</div>
      <div class="action-impacts">+${action.xp} ${t("points")}</div>
      <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;">${escapeHtml(t(action.desc))}</div>
    </div>`;
}

// Shared click/keyboard binding for routine cards. Quantifiable actions
// ask for the real amount first; others log directly.
export function bindActionCards(container, actions, onLogAction) {
  container.querySelectorAll(".action-card").forEach(card => {
    const logIt = () => {
      const action = actions.find(a => a.id === card.getAttribute("data-id"));
      if (!action) return;
      if (action.metric) {
        promptQuantity(action, (value) => {
          onLogAction(action.id, action.title, action.impacts, action.xp,
            { value, unit: action.metric.unit, label: action.metric.label });
        });
      } else {
        onLogAction(action.id, action.title, action.impacts, action.xp);
      }
    };
    card.addEventListener("click", logIt);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        logIt();
      }
    });
  });
}

// Accessible modal scaffold shared by every popup (quantity prompt, level-up,
// reset flow). Implements the WCAG dialog pattern the individual popups were
// missing: role="dialog" + aria-modal, a Tab/Shift-Tab focus trap, Escape to
// close, and focus restored to the triggering element on close.
// `html` must be a single .popup-card element of trusted/escaped markup.
export function openDialog({ label, html, closeOnBackdrop = true }) {
  const previouslyFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.innerHTML = html;
  const card = overlay.firstElementChild || overlay;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  if (label) card.setAttribute("aria-label", label);

  const focusables = () => [...overlay.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.disabled);

  const onKeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const close = () => {
    document.removeEventListener("keydown", onKeydown, true);
    overlay.remove();
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };

  document.addEventListener("keydown", onKeydown, true);
  if (closeOnBackdrop) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }

  document.body.appendChild(overlay);
  const els = focusables();
  if (els.length) els[0].focus();

  return { overlay, close };
}

// Small modal asking for the real measured amount before logging.
export function promptQuantity(action, onConfirm) {
  const m = action.metric;
  const { overlay, close } = openDialog({
    label: t(action.title),
    html: `
    <div class="popup-card" style="max-width: 360px;">
      <h3 style="font-family: var(--font-serif); font-weight: 700; margin-bottom: 6px;">${escapeHtml(t(action.title))}</h3>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">${t("Enter the real amount — it becomes part of your measured record.")}</p>
      <div class="form-group" style="text-align: left;">
        <label for="quantity-input">${escapeHtml(t(m.label))} (${escapeHtml(t(m.unit))})</label>
        <input type="number" id="quantity-input" class="form-control" value="${m.default}" min="${m.min}" max="${m.max}" step="${m.step}">
      </div>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
        <button type="button" class="btn btn-quantity-cancel">${t("Cancel")}</button>
        <button type="button" class="btn btn-primary btn-quantity-confirm">${t("Log It")}</button>
      </div>
    </div>
  `
  });

  const input = overlay.querySelector("#quantity-input");
  input.focus();
  input.select();

  const confirm = () => {
    const value = parseFloat(input.value);
    if (!Number.isFinite(value) || value < m.min || value > m.max) {
      input.style.borderColor = "var(--color-crimson)";
      return;
    }
    close();
    onConfirm(value);
  };

  overlay.querySelector(".btn-quantity-cancel").addEventListener("click", close);
  overlay.querySelector(".btn-quantity-confirm").addEventListener("click", confirm);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirm();
  });
}
