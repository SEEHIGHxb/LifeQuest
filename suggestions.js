// suggestions.js - Rule-based, profile-aware suggestion engine.
//
// Suggestions target the weakest components of each aspect (from aspects.js)
// and adapt their advice to the user's profile — region, employment, and
// relationship status — so a Bangkok office worker and an upcountry
// freelancer get different, actionable next steps. Pure module: no DOM,
// fully testable in node.

import { ASPECT_KEYS, getAspectDetail } from "./aspects.js";

// Components at or above this are considered healthy — no suggestion needed.
const WEAK_COMPONENT_THRESHOLD = 70;

const isBangkok = p => p.region === "Bangkok";

// Rule table: aspect -> component key -> builder(profile) returning
// {title, text, actionId?}. actionId links to a preset routine so the UI
// can point at something loggable.
const RULES = {
  finance: {
    savings: (p) => ({
      title: "Grow your savings rate",
      text: p.employment === "Student" || p.employment === "Unemployed"
        ? "Even 5% of any money that comes in counts — set it aside the day you receive it, before spending."
        : "Automate a transfer on payday so saving happens before spending — 15-20% of income maxes this component.",
      actionId: "save_money"
    }),
    income: (p) => ({
      title: "Raise your earning power",
      text: {
        "Freelancer": "Review your rates against the market and pitch one new client this month — freelance income moves fastest through rate and volume.",
        "Business Owner": "Audit your margins: raising prices 5% or cutting one recurring cost usually beats chasing new customers.",
        "Student": "A paid internship or part-time role in your field raises income now and your starting salary later.",
        "Unemployed": "Focus applications on roles matching your strongest skill, and treat upskilling hours as your day job."
      }[p.employment] || "Certifications and a documented win file are the strongest levers for your next salary negotiation."
    }),
    cfpb: () => ({
      title: "Reduce money stress",
      text: "Write a simple monthly budget — knowing exactly where you stand improves financial well-being even before income changes.",
      actionId: "save_money"
    })
  },
  physical: {
    activity: (p) => ({
      title: "Move more each week",
      text: isBangkok(p)
        ? "Get off the BTS/MRT one station early or walk a park loop (Benjakitti, Lumphini) — the WHO guideline is 600 MET-min/week and brisk walking counts."
        : "Brisk walks or cycling around your neighborhood count — the WHO guideline is 600 MET-min/week, about 150 minutes of moderate movement.",
      actionId: "workout"
    }),
    body: () => ({
      title: "Rebalance body composition",
      text: "Composition follows the activity and nutrition components — pair regular movement with regular meals, not crash changes.",
      actionId: "workout"
    }),
    sleep: () => ({
      title: "Protect your sleep window",
      text: "Anchor a fixed wake time and go screens-off 30 minutes before bed — 7-9 hours is the target band."
    }),
    nutrition: () => ({
      title: "Hit 5 portions and 2.5L",
      text: "Add one vegetable portion to lunch and keep a water bottle at your desk — 5 portions and 2.5L/day max this component.",
      actionId: "eat_veggies"
    })
  },
  mental: {
    who5: () => ({
      title: "Schedule something to look forward to",
      text: "Low WHO-5 improves with planned positive activities — book one small enjoyable thing this week and journal how it went.",
      actionId: "cbt_journal"
    }),
    st5: () => ({
      title: "Downshift stress daily",
      text: "Two quick nasal inhales and one long exhale (the physiological sigh) is the fastest evidence-backed stress reset — do 3 before stressful blocks.",
      actionId: "phys_sigh"
    })
  },
  relationships: {
    lsns: () => ({
      title: "Widen your circle",
      text: "Message one relative and one friend you haven't spoken to this month — social networks grow with regular contact, not grand gestures.",
      actionId: "call_friend"
    }),
    ucla: () => ({
      title: "Counter loneliness with contact",
      text: "Loneliness drops fastest with voice or face time, not feeds — call one person today instead of scrolling.",
      actionId: "call_friend"
    }),
    ras: () => ({
      title: "Invest in your relationship",
      text: "Plan one distraction-free date this week — satisfaction tracks shared, novel experiences.",
      actionId: "date_night"
    })
  },
  personalGoals: {
    gse: () => ({
      title: "Stack small wins",
      text: "Self-efficacy grows from completed challenges — pick one finishable task each morning and log it done."
    }),
    grit: () => ({
      title: "Build a streak",
      text: "Choose one skill and touch it daily for 10 minutes — consistency, not intensity, moves grit."
    }),
    learning: () => ({
      title: "Block learning hours",
      text: "Put 2-3 recurring study blocks on your calendar — 5h/week maxes this component.",
      actionId: "learn_future_skills"
    })
  },
  socialContribution: {
    giving: () => ({
      title: "Give a little, regularly",
      text: "Small recurring giving beats occasional large gifts — even 100 THB/month of merit-making or charity moves this.",
      actionId: "make_merit"
    }),
    volunteering: () => ({
      title: "Volunteer a few hours",
      text: "4 hours a month maxes this — one weekend morning at a local temple, shelter, or community event is enough.",
      actionId: "volunteer"
    }),
    ptm: () => ({
      title: "Practice everyday prosociality",
      text: "Help one stranger or neighbor this week — directions, carrying things, a genuine check-in all count."
    })
  },
  environment: {
    plastic: (p) => ({
      title: "Cut single-use plastics",
      text: isBangkok(p)
        ? "Carry a bottle and a bag — refill stations and no-bag discounts are common around Bangkok, and the Thai average is ~3 pieces/day."
        : "Carry a reusable bottle and bag on every errand — the Thai average is ~3 single-use pieces/day; beating it is very achievable.",
      actionId: "recycle_waste"
    }),
    geb: (p) => ({
      title: "Green your commute and home",
      text: isBangkok(p)
        ? "Swap two car trips for the BTS/MRT this week and set the aircon to 25°C or higher."
        : "Walk or cycle short errands and set the aircon to 25°C or higher — everyday habits are the whole green-behavior score.",
      actionId: isBangkok(p) ? "public_transit" : "recycle_waste"
    })
  },
  humanityFuture: {
    skills: () => ({
      title: "Upskill for the future",
      text: "One hour of AI/data study per week already scores — 4h/week maxes this component.",
      actionId: "learn_future_skills"
    }),
    security: () => ({
      title: "Start long-term investing",
      text: "Open an SSF/RMF or index fund with any amount — most Thai workers have no retirement savings, so starting at all puts you ahead.",
      actionId: "save_money"
    }),
    lfis: () => ({
      title: "Act with a longer horizon",
      text: "Mentor someone or support one cause aimed at future generations this month.",
      actionId: "mentor_someone"
    })
  }
};

// Weakest-first suggestions for one aspect page.
export function getAspectSuggestions(state, aspectKey) {
  const detail = getAspectDetail(state, aspectKey);
  if (!detail) return [];
  return detail.components
    .filter(c => c.value < WEAK_COMPONENT_THRESHOLD)
    .sort((a, b) => a.value - b.value)
    .map(c => {
      const build = (RULES[aspectKey] || {})[c.key];
      if (!build) return null;
      return {
        aspect: aspectKey,
        aspectLabel: detail.label,
        componentKey: c.key,
        componentLabel: c.label,
        componentValue: c.value,
        ...build(state.profile || {})
      };
    })
    .filter(Boolean);
}

// Cross-aspect shortlist for the dashboard: the single weakest suggestion
// per aspect, ranked weakest-first, capped at `limit`.
export function getTopSuggestions(state, limit = 3) {
  return ASPECT_KEYS
    .map(key => getAspectSuggestions(state, key)[0])
    .filter(Boolean)
    .sort((a, b) => a.componentValue - b.componentValue)
    .slice(0, limit);
}
