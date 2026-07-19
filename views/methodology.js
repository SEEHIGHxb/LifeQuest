// views/methodology.js - the "How scores are measured" page (#/methodology).
//
// One place a user (or a reviewer) can read WHAT each aspect score is built
// from, WHERE each instrument comes from, HOW the composite weights are set,
// and what the known limitations are — without reading source code. The
// citation labels stay in English on purpose (they are literature citations,
// same rule as benchmarks.js); everything else is translated.

import { t, tp } from "../i18n.js";
import { escapeHtml } from "./helpers.js";

// Instrument provenance. `cite` labels are canonical English citations.
const CITES = {
  cfpb: { label: "CFPB (2015), Measuring financial well-being: A guide to using the CFPB Financial Well-Being Scale", url: "https://www.consumerfinance.gov/data-research/research-reports/financial-well-being-scale/" },
  ipaq: { label: "IPAQ short form — MET-minute scoring protocol", url: "https://sites.google.com/view/ipaq" },
  jss: { label: "Jenkins et al. (1988), A scale for the estimation of sleep problems in clinical research", url: "https://pubmed.ncbi.nlm.nih.gov/3193141/" },
  who5: { label: "WHO-5 Well-Being Index (Psychiatric Research Unit, Region H, Denmark)", url: "https://www.corc.uk.net/outcome-experience-measures/the-world-health-organisation-five-well-being-index-who-5/" },
  st5: { label: "Srithanya Stress Test ST-5, Thai Dept. of Mental Health", url: "https://he01.tci-thaijo.org/index.php/jmht/article/view/1296" },
  pss: { label: "Cohen et al. (1983), Perceived Stress Scale (PSS-10)", url: "https://pubmed.ncbi.nlm.nih.gov/6668417/" },
  lsns: { label: "Lubben et al. (2006), LSNS-6 / LSNS-R social network scales", url: "https://pubmed.ncbi.nlm.nih.gov/16921004/" },
  ucla: { label: "Hughes et al. (2004), UCLA 3-item Loneliness Scale", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2394670/" },
  ras: { label: "Hendrick (1988), Relationship Assessment Scale", url: "https://doi.org/10.2307/352430" },
  gse: { label: "Schwarzer & Jerusalem (1995), General Self-Efficacy Scale", url: "https://userpage.fu-berlin.de/~health/faq_gse.pdf" },
  grit: { label: "Duckworth & Quinn (2009), Short Grit Scale (Grit-S)", url: "https://pubmed.ncbi.nlm.nih.gov/19205937/" },
  rses: { label: "Rosenberg (1965), Rosenberg Self-Esteem Scale", url: "https://socy.umd.edu/about-us/using-rosenberg-self-esteem-scale" },
  cfc: { label: "Strathman et al. (1994), Consideration of Future Consequences scale", url: "https://doi.org/10.1037/0022-3514.66.4.742" }
};

function citeLinks(keys) {
  return keys.map(k => `<a href="${CITES[k].url}" target="_blank" rel="noopener noreferrer">${escapeHtml(CITES[k].label)}</a>`).join(" · ");
}

// Average absolute score shift per re-assessed aspect across the check-in
// history — a plain-language test-retest stability readout.
export function scoreStability(state) {
  const checkins = (state && state.checkins) || [];
  const shifts = checkins.flatMap(c => Object.values(c.shifts || {}));
  if (shifts.length === 0) return null;
  const avg = shifts.reduce((sum, v) => sum + Math.abs(v), 0) / shifts.length;
  return { count: checkins.length, avg: Math.round(avg * 10) / 10 };
}

// `cites` empty means the aspect uses app-authored items — that is disclosed
// instead of dressed up with a borrowed citation.
function aspectSection(title, formula, rationale, cites) {
  const provenance = cites.length
    ? citeLinks(cites)
    : escapeHtml(t("App-authored behavioral items — not a standardized instrument. Read this aspect as a habits index, not a validated psychological measure."));
  return `
    <div class="component-row">
      <div class="component-head"><span>${escapeHtml(title)}</span></div>
      <div class="component-detail">${escapeHtml(formula)}</div>
      <div class="component-detail">${escapeHtml(rationale)}</div>
      <div class="component-detail benchmark-sources">${provenance}</div>
    </div>`;
}

export function renderMethodology(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const stability = scoreStability(state);

  container.innerHTML = `
    <a href="#/dashboard" class="aspect-back">&larr; ${t("Overview")}</a>

    <div class="card">
      <h2 class="aspect-title">${t("How scores are measured")}</h2>
      <p class="aspect-blurb">${t("Each aspect score (0-100) combines published, validated questionnaires with facts you report about your life. This page shows every instrument, how it is scored, how the parts are weighted, and the known limitations — so no number is a black box.")}</p>
      <p class="aspect-blurb">${t("This is a self-reflection tool, not a medical or psychological diagnosis. If a score worries you, treat it as a prompt to talk to a professional, not as a verdict.")}</p>
    </div>

    <div class="card">
      <h4 class="card-header">${t("The eight aspects")}</h4>
      ${aspectSection(
        t("Finance"),
        t("60% income percentile (lognormal model calibrated to Thai Labour Force Survey wages) + 40% CFPB Financial Well-Being score (official age-banded table) + a savings-rate bonus of up to 10 points."),
        t("Objective standing is weighted above sentiment; the savings bonus rewards a habit you fully control."),
        ["cfpb"]
      )}
      ${aspectSection(
        t("Physical"),
        t("40% activity (IPAQ MET-minutes vs the WHO 600 guideline) + 20% Asian-BMI band + 20% sleep (Jenkins Sleep Scale + reported duration) + 20% nutrition (vegetables + water). Missing measurements are omitted and the weights renormalized — never faked."),
        t("Activity carries the most weight because it has the strongest evidence base and is the component your weekly review re-measures most directly."),
        ["ipaq", "jss"]
      )}
      ${aspectSection(
        t("Mental"),
        t("50% WHO-5 well-being + 50% ST-5 stress resilience (Thai DMH cutoffs, inverted so calmer scores higher). The in-depth PSS-10 refines the stress half when completed."),
        t("An equal split of positive well-being and stress keeps one bad week from dominating the score."),
        ["who5", "st5", "pss"]
      )}
      ${aspectSection(
        t("Relationships"),
        t("40% social network (LSNS-6) + 30% low loneliness (UCLA-3) + 30% relationship satisfaction (RAS, couples only). Singles reweight to 50/50 — being single is never penalized."),
        t("Network size and felt loneliness measure different things; both matter, so neither dominates."),
        ["lsns", "ucla", "ras"]
      )}
      ${aspectSection(
        t("Personal Goals"),
        t("40% self-efficacy (GSE) + 30% grit (Grit-S perseverance facet) + 30% active learning (weekly study hours + self-rated digital literacy). The in-depth section adds the full GSE-10, Grit-12, and Rosenberg self-esteem."),
        t("Belief you can act, persistence, and actual learning time together approximate progress toward goals."),
        ["gse", "grit", "rses"]
      )}
      ${aspectSection(
        t("Social Contribution"),
        t("40% donations (frequency + amount vs income) + 40% action (volunteering hours + helping behavior) + 20% civic participation."),
        t("Giving money and giving time are weighted equally; civic habits count but are the hardest to self-report accurately."),
        []
      )}
      ${aspectSection(
        t("Environment"),
        t("40% waste (daily single-use plastics vs the ~3/day Thai average + recycling habits) + 40% transit choices + 20% conservation habits."),
        t("Plastics and transport dominate the part of an individual Thai footprint that daily habits can actually change."),
        []
      )}
      ${aspectSection(
        t("Humanity's Future"),
        t("25% future skills + 25% legacy actions + 25% future-oriented giving + 25% long-term security (retirement investments). The in-depth CFC-12 adds a validated future-orientation reading."),
        t("Four equal parts because there is no published evidence for ranking them — an honest uniform prior."),
        ["cfc"]
      )}
    </div>

    <div class="card">
      <h4 class="card-header">${t("Confidence, benchmarks, and answer quality")}</h4>
      <p class="aspect-blurb">${t("Every score carries a confidence tier: High (you answered everything), Partial, Estimated (defaults stood in), or Verified (you completed the full-length in-depth instruments).")}</p>
      <p class="aspect-blurb">${t("Society percentiles are honest approximations against cited published statistics — each benchmark names its method and sources, and the band around it is an indicative range, not a statistical confidence interval.")}</p>
      <p class="aspect-blurb">${t("The dashed outline on the dashboard radar is a derived population average: a reference person assembled from the same cited statistics (median income, typical activity levels, published questionnaire means) is scored through the exact formulas that score you.")}</p>
      <p class="aspect-blurb">${t("Behavior-driven aspects are re-measured by the weekly review: the quantities you report replace last week's values inside the same formulas, so a score moves exactly as much as the measured change implies — never by flat per-log bonuses.")}</p>
      <p class="aspect-blurb">${t("Answer quality is checked: a questionnaire answered with the same option on every row (despite reverse-worded questions) is not counted as a confirmed measurement until re-answered.")}</p>
    </div>

    <div class="card">
      <h4 class="card-header">${t("Measurement stability")}</h4>
      <p class="aspect-blurb">${
        stability
          ? tp("Across your {count} re-assessment(s), survey-based scores shifted by an average of {avg} points (each shift is capped at ±15). Smaller average shifts mean the measurement is stable for you.", { count: stability.count, avg: stability.avg })
          : t("Complete a monthly re-assessment to start tracking how stable your scores are over time.")
      }</p>
    </div>
  `;
}
