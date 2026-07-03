// ui.js - LifeQuest UI Rendering Views & Lumi Dialogue

import { stateManager } from "./state.js";
import { renderRadarChart, renderTrendChart } from "./chart.js";
import { INSTRUMENTS } from "./surveys.js";
import { getAllBenchmarks, collectSources, ordinal } from "./benchmarks.js";
import { getAspectDetail } from "./aspects.js";
import { getAspectSuggestions, getTopSuggestions } from "./suggestions.js";

// Escape user-provided strings before inserting into innerHTML.
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const ASPECT_LABELS = {
  finance: "Finance",
  physical: "Physical",
  mental: "Mental",
  relationships: "Relationships",
  personalGoals: "Personal Goals",
  socialContribution: "Social Contribution",
  environment: "Environment",
  humanityFuture: "Humanity's Future"
};

// Mock competitors for the Astral Express Rankings
const MOCK_COMPETITORS = [
  { name: "Himeko", level: 48, totalPoints: 4850 },
  { name: "Welt", level: 42, totalPoints: 4280 },
  { name: "Dan Heng", level: 31, totalPoints: 3150 },
  { name: "March 7th", level: 24, totalPoints: 2420 },
  { name: "Stelle", level: 19, totalPoints: 1950 },
  { name: "Pom-Pom", level: 12, totalPoints: 1280 }
];

// Presets for actions that users can log.
// `metric` marks quantifiable actions: the user is asked for the real amount,
// which is stored on the history entry (raw data for measured scoring).
export const ACTION_PRESETS = [
  { id: "save_money", title: "Add to Savings", aspect: "finance", impacts: { finance: 8 }, xp: 20, desc: "Deposit money/savings (+8 Finance)",
    metric: { label: "Amount saved", unit: "THB", default: 500, min: 1, max: 1000000, step: 1 } },
  { id: "cbt_journal", title: "CBT Journaling", aspect: "mental", impacts: { mental: 8 }, xp: 20, desc: "Write cognitive reappraisal (+8 Mental)" },
  { id: "phys_sigh", title: "Physiological Sigh", aspect: "mental", impacts: { mental: 5 }, xp: 10, desc: "Breath control vagus reset (+5 Mental)" },
  { id: "workout", title: "Exercise Session", aspect: "physical", impacts: { physical: 10, mental: 3 }, xp: 30, desc: "Exercise MVPA (+10 Phys, +3 Mental)",
    metric: { label: "Duration", unit: "minutes", default: 30, min: 5, max: 600, step: 5 } },
  { id: "eat_veggies", title: "Veggie Portions", aspect: "physical", impacts: { physical: 5 }, xp: 15, desc: "Eat healthy greens (+5 Physical)",
    metric: { label: "Portions today", unit: "portions", default: 5, min: 1, max: 15, step: 1 } },
  { id: "drink_water", title: "Water Intake", aspect: "physical", impacts: { physical: 5 }, xp: 10, desc: "Hydration target (+5 Physical)",
    metric: { label: "Amount today", unit: "liters", default: 2.5, min: 0.5, max: 10, step: 0.1 } },
  { id: "call_friend", title: "Connect with Friend", aspect: "relationships", impacts: { relationships: 10, mental: 2 }, xp: 20, desc: "Call relative or friend (+10 Rel, +2 Ment)" },
  { id: "date_night", title: "Relationship Date", aspect: "relationships", impacts: { relationships: 8 }, xp: 25, desc: "Quality partner time (+8 Relationships)" },
  { id: "make_merit", title: "Make Merit / Donation", aspect: "socialContribution", impacts: { socialContribution: 10, finance: -2 }, xp: 25, desc: "Tham Bun / Donate (+10 Social, -2 Fin)",
    metric: { label: "Amount donated", unit: "THB", default: 100, min: 1, max: 1000000, step: 1 } },
  { id: "volunteer", title: "Volunteer", aspect: "socialContribution", impacts: { socialContribution: 12 }, xp: 35, desc: "Community service (+12 Social)",
    metric: { label: "Time spent", unit: "hours", default: 1, min: 0.5, max: 24, step: 0.5 } },
  { id: "recycle_waste", title: "Separate Recycling", aspect: "environment", impacts: { environment: 8 }, xp: 15, desc: "Household waste sort (+8 Env)" },
  { id: "public_transit", title: "Ride BTS / MRT", aspect: "environment", impacts: { environment: 8 }, xp: 20, desc: "Avoid car commute (+8 Env)" },
  { id: "learn_future_skills", title: "Study AI / Data Sci", aspect: "humanityFuture", impacts: { humanityFuture: 10, personalGoals: 5 }, xp: 30, desc: "Upskill future tech (+10 Future, +5 Goals)",
    metric: { label: "Study time", unit: "hours", default: 1, min: 0.5, max: 16, step: 0.5 } },
  { id: "mentor_someone", title: "Mentor / Teach", aspect: "humanityFuture", impacts: { humanityFuture: 8, relationships: 2 }, xp: 25, desc: "Share upskilling (+8 Future, +2 Rel)" }
];

export function getLumiTip(aspects) {
  // Find lowest aspect
  let lowestAspect = "mental";
  let minVal = 101;
  for (const [key, val] of Object.entries(aspects)) {
    if (val < minVal) {
      minVal = val;
      lowestAspect = key;
    }
  }

  const dialogs = {
    finance: "Our finance ledger shows some vulnerability, Trailblazer. Perhaps a budget plan? Let's check our savings rate.",
    physical: "Lumi notices your physical stamina could use a boost. A walk around the Express would do wonders.",
    mental: "A heavy heart or cluttered thoughts? Take a deep breath with me. Two quick inhales through the nose... and one long, slow sigh out.",
    relationships: "Even among the stars, hearts need company. Have you connected with a close friend recently?",
    personalGoals: "The Trailblaze requires constant practice. Just 20 minutes of learning today will sync your goal metrics.",
    socialContribution: "Making merit brings light to the community. Even a small act of kindness to a stranger spreads warmth.",
    environment: "A cleaner planet fosters a cleaner mind. Have we separated our plastics today?",
    humanityFuture: "The future feels vast, but savings and upskilling anchor tomorrow. Let us study a future skill today."
  };

  return dialogs[lowestAspect] || "Every day aboard the Express is another entry in the logbook of your Trailblaze.";
}

// --- ONBOARDING FORM BUILDERS ---

function numberField(id, label, value, attrs = "") {
  return `
    <div class="form-group">
      <label for="${id}">${label}</label>
      <input type="number" id="${id}" class="form-control" value="${value}" ${attrs}>
    </div>`;
}

function radioQuestion(instrKey, itemIndex, item) {
  return `
    <fieldset class="survey-question">
      <legend>${itemIndex + 1}. ${item.text}</legend>
      <div class="radio-group">
        ${item.options.map(o => `
          <label class="radio-option">
            <input type="radio" name="${instrKey}-q${itemIndex}" value="${o.v}" ${o.v === item.def ? "checked" : ""}>
            ${o.l}
          </label>`).join("")}
      </div>
    </fieldset>`;
}

function instrumentBlock(instrKey) {
  const instr = INSTRUMENTS[instrKey];
  return `
    <div class="instrument-block">
      <p class="instrument-title">${instr.title}</p>
      ${instr.items.map((item, i) => radioQuestion(instrKey, i, item)).join("")}
    </div>`;
}

function collectInstrument(instrKey) {
  return INSTRUMENTS[instrKey].items.map((item, i) => {
    const el = document.querySelector(`input[name="${instrKey}-q${i}"]:checked`);
    return el ? parseInt(el.value) : item.def;
  });
}

// 1. RENDER ONBOARDING SURVEY
export function renderOnboarding(containerId, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pages = [
    {
      title: "Step 1: Crew Profile & Finance",
      body: `
        <div class="form-group">
          <label for="onb-name">Crew Member Name</label>
          <input type="text" id="onb-name" class="form-control" placeholder="E.g., Stelle" value="Guest" maxlength="40">
        </div>
        <div class="grid-2">
          ${numberField("onb-age", "Age (for population benchmarks)", 25, 'min="15" max="100"')}
          <div class="form-group">
            <label for="onb-gender">Gender (for benchmark norms)</label>
            <select id="onb-gender" class="form-control">
              <option value="unspecified">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="onb-region">Primary Region (Cost of Living Mapping)</label>
          <select id="onb-region" class="form-control">
            <option value="Provinces">Provinces / Upcountry Thailand</option>
            <option value="Bangkok">Bangkok &amp; Vicinity</option>
          </select>
        </div>
        <div class="form-group">
          <label for="onb-employment">Employment Status</label>
          <select id="onb-employment" class="form-control">
            <option value="Office Worker">Office Worker / Salary Employee</option>
            <option value="Freelancer">Freelancer / Independent</option>
            <option value="Business Owner">Business Owner / Entrepreneur</option>
            <option value="Unemployed">Unemployed / Looking for Work</option>
            <option value="Student">Student</option>
          </select>
        </div>
        <div class="form-group">
          <label for="onb-relationship">Relationship Status</label>
          <select id="onb-relationship" class="form-control">
            <option value="Single">Single</option>
            <option value="Coupled">In a Relationship / Married</option>
          </select>
        </div>
        ${numberField("onb-income", "Monthly Individual Income (Net THB)", 15000, 'min="0"')}
        ${numberField("onb-savings", "Monthly Savings Rate (% of Income)", 10, 'min="0" max="100"')}
        ${instrumentBlock("cfpb")}`
    },
    {
      title: "Step 2: Physical Baseline",
      body: `
        <div class="grid-2">
          ${numberField("onb-height", "Height (cm)", 170, 'min="100" max="250"')}
          ${numberField("onb-weight", "Weight (kg)", 60, 'min="25" max="300"')}
        </div>
        <div class="grid-2">
          ${numberField("onb-sleep", "Average Nightly Sleep (Hours)", 7, 'min="0" max="16" step="0.5"')}
          ${numberField("onb-veg", "Vegetable/Fruit Portions per Day", 2, 'min="0" max="15"')}
        </div>
        ${numberField("onb-water", "Water Intake per Day (Liters)", 1.5, 'min="0" max="10" step="0.1"')}
        <p class="instrument-title">Weekly Physical Activity (IPAQ)</p>
        <div class="grid-2">
          ${numberField("onb-vig-days", "Vigorous Exercise (Days/Week)", 0, 'min="0" max="7"')}
          ${numberField("onb-vig-mins", "Vigorous Minutes per Day", 0, 'min="0" max="600"')}
        </div>
        <div class="grid-2">
          ${numberField("onb-mod-days", "Moderate Exercise (Days/Week)", 0, 'min="0" max="7"')}
          ${numberField("onb-mod-mins", "Moderate Minutes per Day", 0, 'min="0" max="600"')}
        </div>
        <div class="grid-2">
          ${numberField("onb-walk-days", "Walking (Days/Week)", 3, 'min="0" max="7"')}
          ${numberField("onb-walk-mins", "Walking Minutes per Day", 20, 'min="0" max="600"')}
        </div>
        ${instrumentBlock("jss")}`
    },
    {
      title: "Step 3: Mental Well-Being",
      body: `
        ${instrumentBlock("st5")}
        ${instrumentBlock("who5")}`
    },
    {
      title: "Step 4: Relationships",
      body: `
        ${instrumentBlock("lsns")}
        ${instrumentBlock("ucla")}
        <div id="ras-block" class="d-none">
          ${instrumentBlock("ras")}
        </div>`
    },
    {
      title: "Step 5: Goals & Learning",
      body: `
        ${instrumentBlock("gse")}
        ${instrumentBlock("grit")}
        <div class="grid-2">
          ${numberField("onb-learning", "Weekly Learning / Study Hours", 2, 'min="0" max="80" step="0.5"')}
          ${numberField("onb-digital", "Digital Literacy Self-Rating (0-100)", 50, 'min="0" max="100"')}
        </div>`
    },
    {
      title: "Step 6: Contribution, Environment & Future",
      body: `
        ${instrumentBlock("ptm")}
        <div class="grid-2">
          ${numberField("onb-donations", "Monthly Donations (THB)", 0, 'min="0"')}
          ${numberField("onb-volunteer", "Volunteering Hours per Month", 0, 'min="0" max="300"')}
        </div>
        ${instrumentBlock("geb")}
        ${numberField("onb-plastics", "Single-Use Plastic Items per Week", 5, 'min="0" max="100"')}
        ${instrumentBlock("lfis")}
        <div class="form-group">
          <label for="onb-pension">Long-term pension / retirement products (SSF, RMF, stock portfolio)?</label>
          <select id="onb-pension" class="form-control">
            <option value="false">No, not yet planning pension</option>
            <option value="true">Yes, retirement assets secured</option>
          </select>
        </div>`
    }
  ];

  container.innerHTML = `
    <div class="onboarding-container card">
      <div class="brand" style="text-align: center; margin-bottom: 25px;">
        <h1>ASTRAL EXPRESS REGISTRY</h1>
        <p>Nameless Crew &bull; Baseline Assessment</p>
      </div>
      <form id="onboarding-form">
        ${pages.map((page, i) => `
          <div class="survey-page ${i === 0 ? "" : "d-none"}" id="onb-page-${i}">
            <h3 class="card-header">${page.title}</h3>
            ${page.body}
            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
              ${i > 0 ? `<button type="button" class="btn btn-onb-prev" data-page="${i}">Back</button>` : `<span></span>`}
              ${i < pages.length - 1
                ? `<button type="button" class="btn btn-primary btn-onb-next" data-page="${i}">Next</button>`
                : `<button type="submit" class="btn btn-primary">Synchronize Registry &amp; Board</button>`}
            </div>
          </div>`).join("")}
      </form>
      <p id="onboarding-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
  `;

  const showPage = (idx) => {
    pages.forEach((_, i) => {
      document.getElementById(`onb-page-${i}`).classList.toggle("d-none", i !== idx);
    });
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  container.querySelectorAll(".btn-onb-next").forEach(btn => {
    btn.addEventListener("click", () => showPage(parseInt(btn.dataset.page) + 1));
  });
  container.querySelectorAll(".btn-onb-prev").forEach(btn => {
    btn.addEventListener("click", () => showPage(parseInt(btn.dataset.page) - 1));
  });

  // Show couple questions only when relevant
  const relationshipSelect = document.getElementById("onb-relationship");
  relationshipSelect.addEventListener("change", () => {
    document.getElementById("ras-block").classList.toggle("d-none", relationshipSelect.value === "Single");
  });

  document.getElementById("onboarding-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("onboarding-error");
    errorEl.classList.add("d-none");
    try {
      const val = (id) => document.getElementById(id).value;

      const surveyData = {
        name: val("onb-name"),
        age: val("onb-age"),
        gender: val("onb-gender"),
        region: val("onb-region"),
        employment: val("onb-employment"),
        relationshipStatus: val("onb-relationship"),
        income: val("onb-income"),
        savingsRate: val("onb-savings"),
        height: val("onb-height"),
        weight: val("onb-weight"),
        sleepHours: val("onb-sleep"),
        vegetablePortions: val("onb-veg"),
        waterLiters: val("onb-water"),
        weeklyVigorousDays: val("onb-vig-days"),
        weeklyVigorousMins: val("onb-vig-mins"),
        weeklyModerateDays: val("onb-mod-days"),
        weeklyModerateMins: val("onb-mod-mins"),
        weeklyWalkingDays: val("onb-walk-days"),
        weeklyWalkingMins: val("onb-walk-mins"),
        weeklyLearningHours: val("onb-learning"),
        digitalLiteracy: val("onb-digital"),
        monthlyDonations: val("onb-donations"),
        volunteeringHours: val("onb-volunteer"),
        singleUsePlastics: val("onb-plastics"),
        longTermInvestments: val("onb-pension"),
        cfpb: collectInstrument("cfpb"),
        jss: collectInstrument("jss"),
        st5: collectInstrument("st5"),
        who5: collectInstrument("who5"),
        lsns: collectInstrument("lsns"),
        ucla: collectInstrument("ucla"),
        ras: collectInstrument("ras"),
        gse: collectInstrument("gse"),
        grit: collectInstrument("grit"),
        ptm: collectInstrument("ptm"),
        geb: collectInstrument("geb"),
        lfis: collectInstrument("lfis")
      };

      stateManager.submitOnboarding(surveyData);
      onComplete();
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      errorEl.textContent = "Synchronization Error: " + err.message;
      errorEl.classList.remove("d-none");
    }
  });
}

// Shared markup for one suggestion entry (dashboard + aspect pages).
function suggestionItem(s, showAspect) {
  return `
    <a href="#/aspect/${s.aspect}" class="suggestion-link">
      <div class="suggestion-item">
        <div class="suggestion-title">${escapeHtml(s.title)}</div>
        <div class="suggestion-text">${escapeHtml(s.text)}</div>
        <div class="suggestion-meta">${showAspect ? `${escapeHtml(s.aspectLabel)} &bull; ` : ""}${escapeHtml(s.componentLabel)}: ${s.componentValue}/100</div>
      </div>
    </a>`;
}

// Pinned commitment progress (dashboard + aspect page).
function commitmentPin(commitment) {
  const pct = Math.min(100, Math.round((commitment.progress / commitment.weeklyTarget) * 100));
  return `
    <div class="commit-head">
      <span>${ASPECT_LABELS[commitment.aspect] || commitment.aspect} &bull; this week</span>
      <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${commitment.progress} / ${commitment.weeklyTarget}</span>
    </div>
    <div class="xp-bar-container" style="height: 6px; margin-top: 4px;" role="progressbar" aria-label="Commitment progress" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="xp-bar-fill" style="width: ${pct}%;"></div>
    </div>
    <div class="commit-note">${commitment.completed
      ? "✅ Pledge complete — bonus XP banked. Resets next week."
      : `Log ${commitment.weeklyTarget - commitment.progress} more ${ASPECT_LABELS[commitment.aspect] || commitment.aspect} routine(s) for +${stateManager.commitBonusXp(commitment.weeklyTarget)} bonus XP.`}</div>`;
}

// 2. RENDER THE MAIN DASHBOARD
export function renderDashboard(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const p = state.profile;
  const xpNeeded = p.level * 100;
  const xpPercent = Math.round((p.xp / xpNeeded) * 100);
  const benchmarks = getAllBenchmarks(state);
  const benchmarkSources = collectSources(benchmarks);
  const suggestions = getTopSuggestions(state, 3);
  const commitment = state.commitment;
  const checkinDue = stateManager.isCheckinDue();

  const METHOD_TAGS = { distribution: "vs published norms", threshold: "vs participation rates", estimate: "estimate" };

  container.innerHTML = `
    ${checkinDue ? `
      <div class="checkin-banner">
        <p><strong>Monthly Re-Sync due.</strong> Re-run the short well-being instruments so your scores track your real standing, not last month's.</p>
        <a href="#/checkin" class="btn btn-primary" style="white-space: nowrap;">Start Re-Sync</a>
      </div>` : ""}
    <div class="dashboard-grid">
      <!-- LEFT COLUMN: STATUS & RADAR CHART -->
      <div>
        <div class="card" style="display: flex; gap: 20px; align-items: center; padding: 18px 24px;">
          <div style="position: relative;">
            <div class="seal">✦</div>
            <div style="position: absolute; bottom: -5px; right: -5px;" class="level-badge">Lv.${p.level}</div>
          </div>
          <div style="flex-grow: 1;">
            <h3 style="font-family: var(--font-serif); font-size: 1.4rem; font-weight: bold; color: var(--color-navy);">${escapeHtml(p.name)}</h3>
            <p style="font-family: var(--font-serif); font-size: 0.8rem; color: var(--color-gold); text-transform: uppercase;">
              ${p.rank} &bull; ${escapeHtml(p.employment)} (${escapeHtml(p.region)})
            </p>
            <div class="xp-bar-container" role="progressbar" aria-label="Experience progress" aria-valuenow="${xpPercent}" aria-valuemin="0" aria-valuemax="100">
              <div class="xp-bar-fill" style="width: ${xpPercent}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-family: var(--font-serif); font-size: 0.75rem; margin-top: 4px; color: var(--color-text-secondary);">
              <span>XP: ${p.xp} / ${xpNeeded}</span>
              <span>Trailblaze Progress: ${xpPercent}%</span>
            </div>
          </div>
        </div>

        ${commitment ? `
        <div class="card">
          <h4 class="card-header">Weekly Commitment</h4>
          <a href="#/aspect/${commitment.aspect}" class="suggestion-link">${commitmentPin(commitment)}</a>
        </div>` : ""}

        <div class="card">
          <h4 class="card-header">Alignment Metrics</h4>
          <div id="radar-chart-container" style="width: 100%; display: flex; justify-content: center; align-items: center;"></div>
        </div>

        ${suggestions.length > 0 ? `
        <div class="card">
          <h4 class="card-header">Lumi's Suggestions</h4>
          <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 10px;">
            Targeting your weakest measured components — tap one to open that aspect.
          </p>
          ${suggestions.map(s => suggestionItem(s, true)).join("")}
        </div>` : ""}
      </div>

      <!-- RIGHT COLUMN: RATINGS LIST & TERMINAL -->
      <div>
        <div class="card">
          <h4 class="card-header">Synchronization Metrics</h4>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${Object.entries(state.aspects).map(([key, val]) => {
              const b = benchmarks[key];
              return `
                <a href="#/aspect/${key}" class="aspect-row" aria-label="Open ${ASPECT_LABELS[key] || key} details">
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 500; margin-bottom: 2px;">
                    <span>${ASPECT_LABELS[key] || key} <span class="aspect-row-arrow">&rsaquo;</span></span>
                    <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${val}%</span>
                  </div>
                  <div class="xp-bar-container" style="height: 5px; margin-top: 0;" role="progressbar" aria-label="${ASPECT_LABELS[key] || key}" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="100">
                    <div class="xp-bar-fill" style="width: ${val}%; background-color: var(--color-gold);"></div>
                  </div>
                  ${b ? `
                  <div class="benchmark-line" title="${escapeHtml(b.summary)}">
                    Society: ~${ordinal(b.percentile)} percentile <span class="benchmark-method">(${METHOD_TAGS[b.method] || b.method})</span>
                  </div>` : ""}
                </a>
              `;
            }).join("")}
          </div>
          <div class="benchmark-sources">
            <details>
              <summary>Benchmark sources &amp; methodology</summary>
              <p class="benchmark-disclaimer">
                Percentiles compare your baseline answers with published population
                statistics — they are honest approximations, not exact ranks.
                "Estimate" marks curves calibrated to a published anchor point.
              </p>
              <ul>
                ${benchmarkSources.map(src => `
                  <li><a href="${src.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>
                `).join("")}
              </ul>
            </details>
          </div>
        </div>

        <div class="card">
          <h4 class="card-header">Express Log Terminal</h4>
          <div class="terminal" id="dashboard-terminal">
            ${state.history.length === 0 ?
              `<div class="terminal-line"><span class="terminal-accent">> No logs recorded yet. Ledger is clean.</span></div>` :
              state.history.slice(0, 10).map(item => `
                <div class="terminal-line">
                  <span class="terminal-gold">[${new Date(item.timestamp).toLocaleTimeString()}]</span>
                  Logged: <span class="terminal-accent">"${escapeHtml(item.actionName)}"</span>${item.quantity ? ` — ${item.quantity.value} ${escapeHtml(item.quantity.unit)}` : ""}. Reward +${item.xpReward} XP.
                </div>
              `).join("")
            }
          </div>
        </div>
      </div>
    </div>
  `;

  renderRadarChart("radar-chart-container", state.aspects);
}

// Shared routine-card markup (ledger + aspect pages).
function actionCard(action, removable) {
  return `
    <div class="action-card" data-id="${action.id}" role="button" tabindex="0" aria-label="Log ${escapeHtml(action.title)}">
      ${removable ? `<button type="button" class="action-remove" data-remove-id="${action.id}" aria-label="Remove routine" title="Remove routine">✕</button>` : ""}
      <div class="action-title">${escapeHtml(action.title)}</div>
      <div class="action-impacts">+${action.xp} XP</div>
      <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;">${escapeHtml(action.desc)}</div>
    </div>`;
}

// Shared click/keyboard binding for routine cards. Quantifiable actions
// ask for the real amount first; others log directly.
function bindActionCards(container, actions, onLogAction) {
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

// 2b. RENDER A DEDICATED ASPECT PAGE (#/aspect/<key>)
export function renderAspectPage(containerId, state, aspectKey, onLogAction, onRefresh) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const detail = getAspectDetail(state, aspectKey);
  if (!detail) return;

  const b = detail.benchmark;
  const suggestions = getAspectSuggestions(state, aspectKey);
  const commitment = state.commitment;
  const isCommittedHere = commitment && commitment.aspect === aspectKey;
  const METHOD_TAGS = { distribution: "vs published norms", threshold: "vs participation rates", estimate: "estimate" };

  // Routines that positively impact this aspect (presets + custom).
  const relevantActions = [...ACTION_PRESETS, ...(state.customActions || [])]
    .filter(a => (a.impacts[aspectKey] || 0) > 0);

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; Express Desk</a>

    <div class="card aspect-header-card">
      <div>
        <h2 class="aspect-title">${detail.label}</h2>
        <p class="aspect-blurb">${detail.blurb}</p>
      </div>
      <div class="aspect-score-badge">
        <span class="aspect-score-value">${detail.score}</span>
        <span class="aspect-score-max">/100</span>
      </div>
    </div>

    <div class="dashboard-grid">
      <div>
        <div class="card">
          <h4 class="card-header">Standing vs Society</h4>
          ${b ? `
            <div class="gauge-track" role="progressbar" aria-label="Percentile vs society" aria-valuenow="${b.percentile}" aria-valuemin="1" aria-valuemax="99">
              <div class="gauge-fill" style="width: ${b.percentile}%;"></div>
              <div class="gauge-marker" style="left: ${b.percentile}%;"></div>
            </div>
            <div class="gauge-caption">
              <span>~${ordinal(b.percentile)} percentile</span>
              <span class="benchmark-method">(${METHOD_TAGS[b.method] || b.method})</span>
            </div>
            <p class="gauge-summary">${escapeHtml(b.summary)}</p>
            ${b.notes.map(n => `<p class="gauge-note">${escapeHtml(n)}</p>`).join("")}
            <div class="benchmark-sources">
              <details>
                <summary>Sources</summary>
                <ul>
                  ${b.sources.map(src => `<li><a href="${src.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`).join("")}
                </ul>
              </details>
            </div>
          ` : `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              No baseline data for this comparison yet — re-run the onboarding sync to unlock it.
            </p>
          `}
        </div>

        <div class="card">
          <h4 class="card-header">Component Breakdown</h4>
          ${detail.components.length === 0 ? `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">Baseline survey data needed for this breakdown.</p>
          ` : detail.components.map(c => `
            <div class="component-row">
              <div class="component-head">
                <span>${escapeHtml(c.label)}</span>
                <span class="text-gold" style="font-family: var(--font-mono); font-weight: bold;">${c.value}</span>
              </div>
              <div class="xp-bar-container" style="height: 5px; margin-top: 0;" role="progressbar" aria-label="${escapeHtml(c.label)}" aria-valuenow="${c.value}" aria-valuemin="0" aria-valuemax="100">
                <div class="xp-bar-fill" style="width: ${c.value}%;"></div>
              </div>
              <div class="component-detail">${escapeHtml(c.detail)}</div>
            </div>
          `).join("")}
        </div>

        ${suggestions.length > 0 ? `
        <div class="card">
          <h4 class="card-header">Suggested Focus</h4>
          ${suggestions.map(s => `
            <div class="suggestion-item">
              <div class="suggestion-title">${escapeHtml(s.title)}</div>
              <div class="suggestion-text">${escapeHtml(s.text)}</div>
              <div class="suggestion-meta">${escapeHtml(s.componentLabel)}: ${s.componentValue}/100</div>
            </div>
          `).join("")}
        </div>` : ""}
      </div>

      <div>
        <div class="card">
          <h4 class="card-header">Weekly Commitment</h4>
          ${isCommittedHere ? `
            ${commitmentPin(commitment)}
            <button type="button" id="btn-end-commit" class="btn" style="margin-top: 12px; font-size: 0.8rem;">End Commitment</button>
          ` : commitment ? `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              You're already committed to
              <a href="#/aspect/${commitment.aspect}">${ASPECT_LABELS[commitment.aspect] || commitment.aspect}</a>
              this week — one pledge at a time keeps it honest.
            </p>
          ` : `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 10px;">
              Pledge a weekly routine count for ${detail.label}. Hitting it earns bonus XP; the pledge renews every week until you end it.
            </p>
            <form id="commit-form" style="display: flex; gap: 10px; align-items: flex-end;">
              <div class="form-group" style="flex-grow: 1; margin-bottom: 0;">
                <label for="commit-target">Routine logs per week (3-21)</label>
                <input type="number" id="commit-target" class="form-control" value="5" min="3" max="21" required>
              </div>
              <button type="submit" class="btn btn-primary">Commit</button>
            </form>
          `}
        </div>

        <div class="card">
          <h4 class="card-header">Trend (Weekly Snapshots)</h4>
          <div id="aspect-trend-chart"></div>
        </div>

        <div class="card">
          <h4 class="card-header">Log a ${detail.label} Routine</h4>
          ${relevantActions.length === 0 ? `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary);">
              No routines target this aspect yet — register one in the Routines Ledger.
            </p>
          ` : `
            <div class="action-grid">
              ${relevantActions.map(a => actionCard(a, false)).join("")}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  renderTrendChart("aspect-trend-chart", detail.trend);
  bindActionCards(container, relevantActions, onLogAction);

  const commitForm = container.querySelector("#commit-form");
  if (commitForm) {
    commitForm.addEventListener("submit", (e) => {
      e.preventDefault();
      stateManager.commitToAspect(aspectKey, parseInt(document.getElementById("commit-target").value));
      if (onRefresh) onRefresh();
    });
  }
  const endCommitBtn = container.querySelector("#btn-end-commit");
  if (endCommitBtn) {
    endCommitBtn.addEventListener("click", () => {
      if (confirm("End this week's commitment? Progress will be discarded.")) {
        stateManager.clearCommitment();
        if (onRefresh) onRefresh();
      }
    });
  }
}

// 2c. RENDER THE MONTHLY MINI RE-ASSESSMENT (#/checkin)
export function renderCheckin(containerId, state, onComplete) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const isCoupled = state.profile.relationshipStatus !== "Single";

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; Express Desk</a>
    <div class="onboarding-container card">
      <div class="brand" style="text-align: center; margin-bottom: 25px;">
        <h1>MONTHLY RE-SYNC</h1>
        <p>Short instruments only &bull; recalibrates Mental, Relationships &amp; Personal Goals</p>
      </div>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 20px;">
        Answer for the recent weeks, not how you felt at onboarding. Scores shift
        by at most ±15 points per re-sync, and consistent routine logging since
        the last sync adds a small bonus. Reward: +40 XP.
      </p>
      <form id="checkin-form">
        ${instrumentBlock("who5")}
        ${instrumentBlock("st5")}
        ${instrumentBlock("ucla")}
        ${isCoupled ? instrumentBlock("ras") : ""}
        ${instrumentBlock("gse")}
        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 15px;">Complete Re-Sync</button>
      </form>
      <p id="checkin-error" class="d-none" style="color: var(--color-crimson); margin-top: 12px; font-weight: 600;"></p>
    </div>
  `;

  document.getElementById("checkin-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("checkin-error");
    errorEl.classList.add("d-none");
    try {
      const shifts = stateManager.submitCheckin({
        who5: collectInstrument("who5"),
        st5: collectInstrument("st5"),
        ucla: collectInstrument("ucla"),
        ras: isCoupled ? collectInstrument("ras") : null,
        gse: collectInstrument("gse")
      });
      onComplete(shifts);
    } catch (err) {
      console.error("Check-in submission failed:", err);
      errorEl.textContent = "Re-Sync Error: " + err.message;
      errorEl.classList.remove("d-none");
    }
  });
}

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
          <h3 class="card-header">Log Routine</h3>
          <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            Select a routine below to log to your ledger. Lumi will adjust your alignment metrics (max 5 logs per routine per day).
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
          <h3 class="card-header">Register New Routine</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            Registered routines appear in the routine grid and can be logged like presets.
          </p>
          <form id="custom-action-form">
            <div class="form-group">
              <label for="custom-title">Routine Name</label>
              <input type="text" id="custom-title" class="form-control" placeholder="E.g., Practice Meditating" maxlength="60" required>
            </div>

            <div class="form-group">
              <label for="custom-aspect">Target Aspect</label>
              <select id="custom-aspect" class="form-control">
                ${Object.entries(ASPECT_LABELS).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}
              </select>
            </div>

            <div class="form-group">
              <label for="custom-points">Aspect Sync Impact (+1 to +15)</label>
              <input type="number" id="custom-points" class="form-control" value="5" min="1" max="15" required>
            </div>

            <div class="form-group">
              <label for="custom-xp">XP Reward (+5 to +50)</label>
              <input type="number" id="custom-xp" class="form-control" value="15" min="5" max="50" required>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Register Routine</button>
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

// Small modal asking for the real measured amount before logging.
function promptQuantity(action, onConfirm) {
  const m = action.metric;
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  overlay.innerHTML = `
    <div class="popup-card" style="max-width: 360px;">
      <h3 style="font-family: var(--font-serif); font-weight: 700; margin-bottom: 6px;">${escapeHtml(action.title)}</h3>
      <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">Enter the real amount — it becomes part of your measured record.</p>
      <div class="form-group" style="text-align: left;">
        <label for="quantity-input">${escapeHtml(m.label)} (${escapeHtml(m.unit)})</label>
        <input type="number" id="quantity-input" class="form-control" value="${m.default}" min="${m.min}" max="${m.max}" step="${m.step}">
      </div>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
        <button type="button" class="btn btn-quantity-cancel">Cancel</button>
        <button type="button" class="btn btn-primary btn-quantity-confirm">Log It</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#quantity-input");
  input.focus();
  input.select();

  const close = () => overlay.remove();
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
    if (e.key === "Escape") close();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
}

// 4. RENDER THE MISSIONS TAB
export function renderQuests(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const active = state.goals.filter(g => !g.completed);
  const completed = state.goals.filter(g => g.completed);

  const progressBar = (goal) => {
    const pct = Math.round((goal.currentValue / goal.targetValue) * 100);
    return `
      <div class="xp-bar-container" style="height: 6px; margin-top: 8px;" role="progressbar" aria-label="${escapeHtml(goal.title)} progress" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="xp-bar-fill" style="width: ${pct}%;"></div>
      </div>
      <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-text-secondary);">${goal.currentValue} / ${goal.targetValue} logged</span>`;
  };

  container.innerHTML = `
    <div class="dashboard-grid">
      <!-- ACTIVE MISSIONS -->
      <div>
        <div class="card">
          <h3 class="card-header">Active Missions</h3>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 15px;">
            Missions progress automatically as you log matching routines in the Ledger. Daily missions reset each day, weekly each week.
          </p>
          <div style="display: flex; flex-direction: column; gap: 15px;">
            ${active.length === 0 ?
              `<p style="font-style: italic; color: var(--color-text-secondary);">All missions completed! New cycles begin tomorrow.</p>` :
              active.map(goal => `
                <div style="border: 1.5px solid rgba(0, 184, 230, 0.3); border-radius: 4px; padding: 15px; background: rgba(255,255,255,0.6);">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <span class="holo-badge">${goal.type.toUpperCase()}</span>
                    <strong style="font-size: 1.05rem;">${escapeHtml(goal.title)}</strong>
                  </div>
                  <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 4px 0 4px 0;">${escapeHtml(goal.description)}</p>
                  <span class="text-gold" style="font-family: var(--font-mono); font-size: 0.8rem; font-weight: bold;">Aspect: ${(ASPECT_LABELS[goal.aspect] || goal.aspect).toUpperCase()} &bull; +${goal.xpReward} XP</span>
                  ${progressBar(goal)}
                  ${goal.milestones ? `
                    <ul style="list-style: none; margin-top: 8px; font-size: 0.8rem; color: var(--color-text-secondary);">
                      ${goal.milestones.map(m => `<li>${m.completed ? "✅" : "⬜"} ${escapeHtml(m.text)}</li>`).join("")}
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
          <h3 class="card-header">Completed Missions</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${completed.length === 0 ?
              `<p style="font-style: italic; color: var(--color-text-secondary);">No completed missions in this cycle yet.</p>` :
              completed.map(goal => `
                <div style="border: 1.5px solid var(--color-nectar); border-radius: 4px; padding: 12px; background: rgba(52,199,89,0.06); display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <span style="font-weight: bold; color: var(--color-nectar);">${escapeHtml(goal.title)}</span>
                    <p style="font-size: 0.75rem; color: var(--color-text-secondary);">Completed: +${goal.xpReward} XP</p>
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

// 5. RENDER LEADERBOARD
export function renderLeaderboard(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const userScore = state.history.reduce((sum, h) => sum + h.xpReward, 0) + (state.profile.level * 150);
  const userEntry = {
    name: `${state.profile.name} (You)`,
    level: state.profile.level,
    totalPoints: userScore,
    isUser: true
  };

  const allPlayers = [...MOCK_COMPETITORS, userEntry]
    .map(pl => ({ ...pl, rankClass: stateManager.getRankClass(pl.level) }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  container.innerHTML = `
    <div class="card" style="max-width: 650px; margin: 0 auto;">
      <h3 class="card-header">Astral Express - Rankings</h3>
      <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 15px;">
        Synchronized rankings of Nameless crew members based on completed missions and baseline alignment.
      </p>

      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid var(--color-gold); font-family: var(--font-serif); font-size: 1.1rem; color: var(--color-navy);">
            <th style="padding: 10px;">Rank</th>
            <th style="padding: 10px;">Crew Member</th>
            <th style="padding: 10px; text-align: center;">Level</th>
            <th style="padding: 10px; text-align: right;">Total Points</th>
            <th style="padding: 10px; text-align: center;">Clearance</th>
          </tr>
        </thead>
        <tbody>
          ${allPlayers.map((player, idx) => {
            const rowStyle = player.isUser ? `background: rgba(0,184,230,0.1); font-weight: bold; border: 1.5px solid var(--color-gold);` : `border-bottom: 1px solid rgba(195,154,60,0.15);`;
            const badgeClass = idx === 0 ? `background: var(--color-gold); color: #fff;` : idx === 1 ? `background: silver; color: #fff;` : `background: var(--bg-primary); color: var(--color-text-secondary);`;
            return `
              <tr style="${rowStyle}">
                <td style="padding: 12px 10px;"><span style="border-radius:50%; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; border: 1px solid var(--color-gold); ${badgeClass}">${idx + 1}</span></td>
                <td style="padding: 12px 10px;">${escapeHtml(player.name)}</td>
                <td style="padding: 12px 10px; text-align: center; font-family: var(--font-mono);">${player.level}</td>
                <td style="padding: 12px 10px; text-align: right; font-family: var(--font-mono);">${player.totalPoints}</td>
                <td style="padding: 12px 10px; text-align: center;"><span class="holo-badge">${player.rankClass}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}
