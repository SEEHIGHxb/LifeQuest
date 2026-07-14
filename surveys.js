// surveys.js - LifeQuest Survey Instrument Definitions
// Each instrument: { title, items: [{ text, options: [{v, l}], def }] }
// "def" is the pre-checked default so partial submissions never crash scoring.

const DESCRIBES_REVERSED = [
  { v: 0, l: "Describes me completely" },
  { v: 1, l: "Describes me very well" },
  { v: 2, l: "Somewhat" },
  { v: 3, l: "Very little" },
  { v: 4, l: "Not at all" }
];

const FREQ_POSITIVE = [
  { v: 4, l: "Always" },
  { v: 3, l: "Often" },
  { v: 2, l: "Sometimes" },
  { v: 1, l: "Rarely" },
  { v: 0, l: "Never" }
];

const SLEEP_FREQ = [
  { v: 0, l: "Rarely / Not at all" },
  { v: 1, l: "1-3 days" },
  { v: 3, l: "4-14 days" },
  { v: 5, l: "Almost every day" }
];

const ST5_FREQ = [
  { v: 0, l: "Rarely / Not at all" },
  { v: 1, l: "Sometimes" },
  { v: 2, l: "Often" },
  { v: 3, l: "Regularly" }
];

const WHO5_FREQ = [
  { v: 5, l: "All of the time" },
  { v: 4, l: "Most of the time" },
  { v: 3, l: "More than half the time" },
  { v: 2, l: "Less than half the time" },
  { v: 1, l: "Some of the time" },
  { v: 0, l: "At no time" }
];

const LSNS_COUNT = [
  { v: 0, l: "None" },
  { v: 1, l: "One" },
  { v: 2, l: "Two" },
  { v: 3, l: "Three or four" },
  { v: 4, l: "Five to eight" },
  { v: 5, l: "Nine or more" }
];

const UCLA_FREQ = [
  { v: 1, l: "Hardly ever" },
  { v: 2, l: "Some of the time" },
  { v: 3, l: "Often" }
];

const RAS_SCALE = [
  { v: 1, l: "Very poorly" },
  { v: 2, l: "Poorly" },
  { v: 3, l: "Average" },
  { v: 4, l: "Well" },
  { v: 5, l: "Extremely well" }
];

const AGREE_4 = [
  { v: 1, l: "Not at all true" },
  { v: 2, l: "Hardly true" },
  { v: 3, l: "Moderately true" },
  { v: 4, l: "Exactly true" }
];

const LIKE_ME_5 = [
  { v: 1, l: "Not like me at all" },
  { v: 2, l: "Not much like me" },
  { v: 3, l: "Somewhat like me" },
  { v: 4, l: "Mostly like me" },
  { v: 5, l: "Very much like me" }
];

const FREQ_5 = [
  { v: 0, l: "Never" },
  { v: 1, l: "Rarely" },
  { v: 2, l: "Sometimes" },
  { v: 3, l: "Often" },
  { v: 4, l: "Very often" }
];

export const INSTRUMENTS = {
  cfpb: {
    title: "CFPB Financial Well-Being Assessment",
    items: [
      { text: "Because of my money situation, I feel like I will never have the things I want in life.", options: DESCRIBES_REVERSED, def: 2 },
      { text: "I am just getting by financially.", options: DESCRIBES_REVERSED, def: 2 },
      { text: "I am concerned that the money I have or will save won't last.", options: DESCRIBES_REVERSED, def: 2 },
      { text: "I have money left over at the end of the month.", options: FREQ_POSITIVE, def: 2 },
      { text: "My finances control my life.", options: DESCRIBES_REVERSED, def: 2 }
    ]
  },
  jss: {
    title: "Sleep Quality (past 2-4 weeks)",
    items: [
      { text: "How often did you have difficulty falling asleep?", options: SLEEP_FREQ, def: 0 },
      { text: "How often did you wake up during the night?", options: SLEEP_FREQ, def: 0 },
      { text: "How often did you wake up earlier than planned?", options: SLEEP_FREQ, def: 0 },
      { text: "How often did you wake up feeling unrefreshed?", options: SLEEP_FREQ, def: 0 }
    ]
  },
  st5: {
    // `def` is the scale MIDPOINT (not the calmest option): a skipped ST-5
    // yields a neutral ~50 stress-resilience reading rather than a fabricated
    // "perfectly calm" 100. Confidence flagging still marks it as estimated.
    title: "ST-5 Stress Index (past 2-4 weeks)",
    items: [
      { text: "How often did you have trouble sleeping because of worry?", options: ST5_FREQ, def: 1 },
      { text: "How often did you have poor concentration?", options: ST5_FREQ, def: 1 },
      { text: "How often did you feel irritable, restless, or agitated?", options: ST5_FREQ, def: 1 },
      { text: "How often did you feel bored or discouraged?", options: ST5_FREQ, def: 1 },
      { text: "How often did you not want to meet people?", options: ST5_FREQ, def: 1 }
    ]
  },
  who5: {
    title: "WHO-5 Well-Being Index (past 2 weeks)",
    items: [
      { text: "I have felt cheerful and in good spirits.", options: WHO5_FREQ, def: 3 },
      { text: "I have felt calm and relaxed.", options: WHO5_FREQ, def: 3 },
      { text: "I have felt active and vigorous.", options: WHO5_FREQ, def: 3 },
      { text: "I woke up feeling fresh and rested.", options: WHO5_FREQ, def: 3 },
      { text: "My daily life has been filled with things that interest me.", options: WHO5_FREQ, def: 3 }
    ]
  },
  lsns: {
    title: "LSNS-6 Social Network Scale",
    items: [
      { text: "How many relatives do you see or hear from at least once a month?", options: LSNS_COUNT, def: 3 },
      { text: "How many relatives do you feel at ease with to talk about private matters?", options: LSNS_COUNT, def: 3 },
      { text: "How many relatives do you feel close to such that you could call on them for help?", options: LSNS_COUNT, def: 3 },
      { text: "How many friends do you see or hear from at least once a month?", options: LSNS_COUNT, def: 3 },
      { text: "How many friends do you feel at ease with to talk about private matters?", options: LSNS_COUNT, def: 3 },
      { text: "How many friends do you feel close to such that you could call on them for help?", options: LSNS_COUNT, def: 3 }
    ]
  },
  ucla: {
    // `def` is the scale MIDPOINT ("Some of the time"): a skipped UCLA yields a
    // neutral ~50 rather than a fabricated "never lonely" 100.
    title: "UCLA Loneliness Index",
    items: [
      { text: "How often do you feel that you lack companionship?", options: UCLA_FREQ, def: 2 },
      { text: "How often do you feel left out?", options: UCLA_FREQ, def: 2 },
      { text: "How often do you feel isolated from others?", options: UCLA_FREQ, def: 2 }
    ]
  },
  ras: {
    title: "Relationship Assessment (couples only)",
    items: [
      { text: "How well does your partner meet your needs?", options: RAS_SCALE, def: 3 },
      { text: "In general, how satisfied are you with your relationship?", options: RAS_SCALE, def: 3 },
      { text: "How good is your relationship compared to most?", options: RAS_SCALE, def: 3 }
    ]
  },
  gse: {
    title: "GSE-6 Self-Efficacy Scale",
    items: [
      { text: "I can always manage to solve difficult problems if I try hard enough.", options: AGREE_4, def: 3 },
      { text: "If someone opposes me, I can find the means and ways to get what I want.", options: AGREE_4, def: 3 },
      { text: "I am confident that I could deal efficiently with unexpected events.", options: AGREE_4, def: 3 },
      { text: "Thanks to my resourcefulness, I know how to handle unforeseen situations.", options: AGREE_4, def: 3 },
      { text: "I can solve most problems if I invest the necessary effort.", options: AGREE_4, def: 3 },
      { text: "I can usually handle whatever comes my way.", options: AGREE_4, def: 3 }
    ]
  },
  grit: {
    title: "Grit-S (Perseverance)",
    items: [
      { text: "I finish whatever I begin.", options: LIKE_ME_5, def: 4 },
      { text: "Setbacks don't discourage me. I don't give up easily.", options: LIKE_ME_5, def: 3 },
      { text: "I am a hard worker.", options: LIKE_ME_5, def: 4 },
      { text: "I am diligent. I never give up.", options: LIKE_ME_5, def: 4 }
    ]
  },
  ptm: {
    title: "Prosocial Tendencies (typical month)",
    items: [
      { text: "How often do you donate money to charity, temples, or people in need?", options: FREQ_5, def: 2 },
      { text: "How often do you help friends or family members who are in need?", options: FREQ_5, def: 1 },
      { text: "How often do you help strangers (e.g., giving directions, carrying things)?", options: FREQ_5, def: 2 },
      { text: "How often do you participate in community or neighborhood activities?", options: FREQ_5, def: 2 },
      { text: "How often do you engage in local civic issues (e.g., voting, community meetings)?", options: FREQ_5, def: 3 }
    ]
  },
  geb: {
    title: "Green Everyday Behavior",
    items: [
      { text: "How often do you separate recyclables (plastic, paper, glass) from general waste?", options: FREQ_5, def: 2 },
      { text: "How often do you refuse or avoid single-use plastics (bags, straws, cups)?", options: FREQ_5, def: 2 },
      { text: "How often do you use public transit, walk, or cycle instead of a private car?", options: FREQ_5, def: 3 },
      { text: "How often do you turn off lights and appliances when not in use?", options: FREQ_5, def: 3 },
      { text: "How often do you limit air-conditioning use or set it to 25°C or higher?", options: FREQ_5, def: 2 },
      { text: "How often do you choose eco-friendly or refillable products?", options: FREQ_5, def: 2 }
    ]
  },
  lfis: {
    title: "Long-Term Future Index",
    items: [
      { text: "I actively learn skills that will stay relevant in the future (AI, data, languages).", options: FREQ_5, def: 3 },
      { text: "I do things intended to leave a positive legacy beyond my own life.", options: FREQ_5, def: 2 },
      { text: "I support or donate to causes addressing future generations' well-being.", options: FREQ_5, def: 2 },
      { text: "I plan my finances with a horizon of 10 years or more.", options: FREQ_5, def: 3 },
      { text: "I support causes addressing global existential risks (climate, pandemics, AI safety).", options: FREQ_5, def: 2 }
    ]
  }
};

export function instrumentSize(key) {
  return INSTRUMENTS[key].items.length;
}

// ===========================================================================
// DEEP ASSESSMENT — optional, long-form instruments taken AFTER onboarding.
//
// Design rule: every deep instrument is a full-length VALIDATED scale and, where
// possible, a SUPERSET of the short form used at onboarding (e.g. CFPB-10 ⊇ the
// 5 onboarding items, GSE-10 ⊇ GSE-6, Grit-12 ⊇ Grit-S, LSNS-R ⊇ LSNS-6). More
// items = higher internal-consistency reliability, so a completed deep section
// tightens the aspect's confidence tier and its percentile band. All option
// value sets below are already ORIENTED (higher value = healthier), so scoring
// a deep instrument is a plain sum of the selected values — no reverse-scoring
// bookkeeping at score time.
// ===========================================================================

// --- Response scales unique to the deep instruments ---

// CFPB "describes me" for POSITIVELY-worded items (mirror of DESCRIBES_REVERSED).
const DESCRIBES_POSITIVE = [
  { v: 4, l: "Describes me completely" },
  { v: 3, l: "Describes me very well" },
  { v: 2, l: "Somewhat" },
  { v: 1, l: "Very little" },
  { v: 0, l: "Not at all" }
];

// CFPB frequency for NEGATIVELY-worded items (mirror of FREQ_POSITIVE).
const FREQ_REVERSED = [
  { v: 0, l: "Always" },
  { v: 1, l: "Often" },
  { v: 2, l: "Sometimes" },
  { v: 3, l: "Rarely" },
  { v: 4, l: "Never" }
];

// PSS-10 (Cohen). Negatively-worded items count UP toward stress...
const PSS_FREQ = [
  { v: 0, l: "Never" },
  { v: 1, l: "Almost never" },
  { v: 2, l: "Sometimes" },
  { v: 3, l: "Fairly often" },
  { v: 4, l: "Very often" }
];
// ...and the four positively-worded items (4,5,7,8) are reverse-keyed, so the
// stored value still measures stress (higher = more stress).
const PSS_FREQ_REV = [
  { v: 4, l: "Never" },
  { v: 3, l: "Almost never" },
  { v: 2, l: "Sometimes" },
  { v: 1, l: "Fairly often" },
  { v: 0, l: "Very often" }
];

// Grit-O consistency-of-interest items are reverse-keyed (mirror of LIKE_ME_5).
const LIKE_ME_5_REV = [
  { v: 5, l: "Not like me at all" },
  { v: 4, l: "Not much like me" },
  { v: 3, l: "Somewhat like me" },
  { v: 2, l: "Mostly like me" },
  { v: 1, l: "Very much like me" }
];

// Rosenberg Self-Esteem: 4-point agree scale, positive and reverse-keyed forms.
const RSES_AGREE = [
  { v: 3, l: "Strongly agree" },
  { v: 2, l: "Agree" },
  { v: 1, l: "Disagree" },
  { v: 0, l: "Strongly disagree" }
];
const RSES_AGREE_REV = [
  { v: 0, l: "Strongly agree" },
  { v: 1, l: "Agree" },
  { v: 2, l: "Disagree" },
  { v: 3, l: "Strongly disagree" }
];

// CFC-12: 5-point "characteristic of me". Future-oriented items count up...
const CFC_CHAR = [
  { v: 5, l: "Extremely characteristic of me" },
  { v: 4, l: "Somewhat characteristic of me" },
  { v: 3, l: "Uncertain" },
  { v: 2, l: "Somewhat uncharacteristic of me" },
  { v: 1, l: "Extremely uncharacteristic of me" }
];
// ...and immediate-oriented items (3,4,5,9,10,11,12) are reverse-keyed.
const CFC_CHAR_REV = [
  { v: 1, l: "Extremely characteristic of me" },
  { v: 2, l: "Somewhat characteristic of me" },
  { v: 3, l: "Uncertain" },
  { v: 4, l: "Somewhat uncharacteristic of me" },
  { v: 5, l: "Extremely uncharacteristic of me" }
];

// RAS-7 extra items are negatively framed (higher raw feeling = worse), so
// their option values are reverse-keyed to keep higher = healthier.
const RAS_FREQ_REV = [
  { v: 5, l: "Never" },
  { v: 4, l: "Rarely" },
  { v: 3, l: "Sometimes" },
  { v: 2, l: "Often" },
  { v: 1, l: "Very often" }
];
const RAS_AMOUNT_REV = [
  { v: 5, l: "None / very few" },
  { v: 4, l: "A few" },
  { v: 3, l: "Some" },
  { v: 2, l: "Many" },
  { v: 1, l: "Very many" }
];

// LSNS-R contact-frequency and decision-support items (the -R adds these to the
// -6 "how many" count items, which reuse LSNS_COUNT above).
const LSNS_CONTACT = [
  { v: 0, l: "Less than monthly" },
  { v: 1, l: "Monthly" },
  { v: 2, l: "A few times a month" },
  { v: 3, l: "Weekly" },
  { v: 4, l: "A few times a week" },
  { v: 5, l: "Daily" }
];
const LSNS_DECISION = [
  { v: 0, l: "Never" },
  { v: 1, l: "Seldom" },
  { v: 2, l: "Sometimes" },
  { v: 3, l: "Often" },
  { v: 4, l: "Very often" },
  { v: 5, l: "Always" }
];

// Sedentary time (fewer sitting hours = healthier).
const SITTING_BANDS = [
  { v: 4, l: "Less than 4 hours" },
  { v: 3, l: "4–6 hours" },
  { v: 2, l: "6–8 hours" },
  { v: 1, l: "8–10 hours" },
  { v: 0, l: "More than 10 hours" }
];

export const DEEP_INSTRUMENTS = {
  // FINANCE — full 10-item CFPB Financial Well-Being Scale (our onboarding
  // CFPB is a 5-item subset of these). Raw oriented sum 0-40.
  cfpb10: {
    title: "CFPB Financial Well-Being Scale (full 10-item)",
    items: [
      { text: "I could handle a major unexpected expense.", options: DESCRIBES_POSITIVE, def: 2 },
      { text: "I am securing my financial future.", options: DESCRIBES_POSITIVE, def: 2 },
      { text: "Because of my money situation, I feel like I will never have the things I want in life.", options: DESCRIBES_REVERSED, def: 2 },
      { text: "I can enjoy life because of the way I'm managing my money.", options: DESCRIBES_POSITIVE, def: 2 },
      { text: "I am just getting by financially.", options: DESCRIBES_REVERSED, def: 2 },
      { text: "I am concerned that the money I have or will save won't last.", options: DESCRIBES_REVERSED, def: 2 },
      { text: "Giving a gift for a wedding, birthday, or other occasion would put a strain on my finances for the month.", options: FREQ_REVERSED, def: 2 },
      { text: "I have money left over at the end of the month.", options: FREQ_POSITIVE, def: 2 },
      { text: "I am behind with my finances.", options: FREQ_REVERSED, def: 2 },
      { text: "My finances control my life.", options: FREQ_REVERSED, def: 2 }
    ]
  },

  // PHYSICAL — sedentary time + sleep-hygiene self-report. Raw sum 0-12.
  sedentary: {
    title: "Sedentary time & sleep hygiene",
    items: [
      { text: "On a typical weekday, about how many hours do you spend sitting?", options: SITTING_BANDS, def: 2 },
      { text: "I keep a consistent sleep and wake schedule.", options: FREQ_5, def: 2 },
      { text: "I avoid screens for at least 30 minutes before bed.", options: FREQ_5, def: 2 }
    ]
  },

  // MENTAL — full 10-item Perceived Stress Scale (Cohen). Raw sum 0-40 measures
  // STRESS (higher = more stress); the aspect score inverts it.
  pss10: {
    title: "Perceived Stress Scale (PSS-10, past month)",
    items: [
      { text: "In the last month, how often have you been upset because of something that happened unexpectedly?", options: PSS_FREQ, def: 2 },
      { text: "In the last month, how often have you felt unable to control the important things in your life?", options: PSS_FREQ, def: 2 },
      { text: "In the last month, how often have you felt nervous and stressed?", options: PSS_FREQ, def: 2 },
      { text: "In the last month, how often have you felt confident about your ability to handle your personal problems?", options: PSS_FREQ_REV, def: 2 },
      { text: "In the last month, how often have you felt that things were going your way?", options: PSS_FREQ_REV, def: 2 },
      { text: "In the last month, how often have you found that you could not cope with all the things you had to do?", options: PSS_FREQ, def: 2 },
      { text: "In the last month, how often have you been able to control irritations in your life?", options: PSS_FREQ_REV, def: 2 },
      { text: "In the last month, how often have you felt that you were on top of things?", options: PSS_FREQ_REV, def: 2 },
      { text: "In the last month, how often have you been angered because of things that were outside of your control?", options: PSS_FREQ, def: 2 },
      { text: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?", options: PSS_FREQ, def: 2 }
    ]
  },

  // RELATIONSHIPS — LSNS-R (12-item revised Lubben; our LSNS-6 is a subset).
  // Raw sum 0-60.
  lsnsR: {
    title: "Lubben Social Network Scale – Revised (LSNS-R)",
    items: [
      { text: "How many relatives do you see or hear from at least once a month?", options: LSNS_COUNT, def: 3 },
      { text: "How often do you see or hear from the relative with whom you have the most contact?", options: LSNS_CONTACT, def: 3 },
      { text: "How many relatives do you feel at ease with to talk about private matters?", options: LSNS_COUNT, def: 3 },
      { text: "How many relatives do you feel close to such that you could call on them for help?", options: LSNS_COUNT, def: 3 },
      { text: "When one of your relatives has an important decision to make, how often do they talk to you about it?", options: LSNS_DECISION, def: 3 },
      { text: "How often is one of your relatives available for you to talk to when you have an important decision to make?", options: LSNS_DECISION, def: 3 },
      { text: "How many friends do you see or hear from at least once a month?", options: LSNS_COUNT, def: 3 },
      { text: "How often do you see or hear from the friend with whom you have the most contact?", options: LSNS_CONTACT, def: 3 },
      { text: "How many friends do you feel at ease with to talk about private matters?", options: LSNS_COUNT, def: 3 },
      { text: "How many friends do you feel close to such that you could call on them for help?", options: LSNS_COUNT, def: 3 },
      { text: "When one of your friends has an important decision to make, how often do they talk to you about it?", options: LSNS_DECISION, def: 3 },
      { text: "How often is one of your friends available for you to talk to when you have an important decision to make?", options: LSNS_DECISION, def: 3 }
    ]
  },

  // RELATIONSHIPS (coupled only) — full 7-item Relationship Assessment Scale
  // (Hendrick; our onboarding RAS is items 1-3). Raw sum 7-35.
  ras7: {
    title: "Relationship Assessment Scale (full 7-item)",
    items: [
      { text: "How well does your partner meet your needs?", options: RAS_SCALE, def: 3 },
      { text: "In general, how satisfied are you with your relationship?", options: RAS_SCALE, def: 3 },
      { text: "How good is your relationship compared to most?", options: RAS_SCALE, def: 3 },
      { text: "How often do you wish you hadn't gotten into this relationship?", options: RAS_FREQ_REV, def: 3 },
      { text: "To what extent has your relationship met your original expectations?", options: RAS_SCALE, def: 3 },
      { text: "How much do you love your partner?", options: RAS_SCALE, def: 3 },
      { text: "How many problems are there in your relationship?", options: RAS_AMOUNT_REV, def: 3 }
    ]
  },

  // PERSONAL GOALS — full GSE-10 (⊇ our GSE-6). Raw sum 10-40.
  gse10: {
    title: "General Self-Efficacy Scale (full 10-item)",
    items: [
      { text: "I can always manage to solve difficult problems if I try hard enough.", options: AGREE_4, def: 3 },
      { text: "If someone opposes me, I can find the means and ways to get what I want.", options: AGREE_4, def: 3 },
      { text: "It is easy for me to stick to my aims and accomplish my goals.", options: AGREE_4, def: 3 },
      { text: "I am confident that I could deal efficiently with unexpected events.", options: AGREE_4, def: 3 },
      { text: "Thanks to my resourcefulness, I know how to handle unforeseen situations.", options: AGREE_4, def: 3 },
      { text: "I can solve most problems if I invest the necessary effort.", options: AGREE_4, def: 3 },
      { text: "I can remain calm when facing difficulties because I can rely on my coping abilities.", options: AGREE_4, def: 3 },
      { text: "When I am confronted with a problem, I can usually find several solutions.", options: AGREE_4, def: 3 },
      { text: "If I am in trouble, I can usually think of a solution.", options: AGREE_4, def: 3 },
      { text: "I can usually handle whatever comes my way.", options: AGREE_4, def: 3 }
    ]
  },

  // PERSONAL GOALS — full 12-item Grit-O (⊇ our Grit-S). Consistency items are
  // reverse-keyed via LIKE_ME_5_REV. Raw sum 12-60.
  grit12: {
    title: "Grit Scale (full 12-item)",
    items: [
      { text: "I have overcome setbacks to conquer an important challenge.", options: LIKE_ME_5, def: 3 },
      { text: "New ideas and projects sometimes distract me from previous ones.", options: LIKE_ME_5_REV, def: 3 },
      { text: "My interests change from year to year.", options: LIKE_ME_5_REV, def: 3 },
      { text: "Setbacks don't discourage me.", options: LIKE_ME_5, def: 3 },
      { text: "I have been obsessed with a certain idea or project for a short time but later lost interest.", options: LIKE_ME_5_REV, def: 3 },
      { text: "I am a hard worker.", options: LIKE_ME_5, def: 3 },
      { text: "I often set a goal but later choose to pursue a different one.", options: LIKE_ME_5_REV, def: 3 },
      { text: "I have difficulty maintaining my focus on projects that take more than a few months to complete.", options: LIKE_ME_5_REV, def: 3 },
      { text: "I finish whatever I begin.", options: LIKE_ME_5, def: 3 },
      { text: "I have achieved a goal that took years of work.", options: LIKE_ME_5, def: 3 },
      { text: "I become interested in new pursuits every few months.", options: LIKE_ME_5_REV, def: 3 },
      { text: "I am diligent.", options: LIKE_ME_5, def: 3 }
    ]
  },

  // PERSONAL GOALS — Rosenberg Self-Esteem Scale (10-item). Negatively-worded
  // items are reverse-keyed. Raw sum 0-30.
  rses: {
    title: "Rosenberg Self-Esteem Scale",
    items: [
      { text: "On the whole, I am satisfied with myself.", options: RSES_AGREE, def: 2 },
      { text: "At times I think I am no good at all.", options: RSES_AGREE_REV, def: 1 },
      { text: "I feel that I have a number of good qualities.", options: RSES_AGREE, def: 2 },
      { text: "I am able to do things as well as most other people.", options: RSES_AGREE, def: 2 },
      { text: "I feel I do not have much to be proud of.", options: RSES_AGREE_REV, def: 1 },
      { text: "I certainly feel useless at times.", options: RSES_AGREE_REV, def: 1 },
      { text: "I feel that I'm a person of worth, at least on an equal plane with others.", options: RSES_AGREE, def: 2 },
      { text: "I wish I could have more respect for myself.", options: RSES_AGREE_REV, def: 1 },
      { text: "All in all, I am inclined to feel that I am a failure.", options: RSES_AGREE_REV, def: 1 },
      { text: "I take a positive attitude toward myself.", options: RSES_AGREE, def: 2 }
    ]
  },

  // SOCIAL CONTRIBUTION — additional giving & civic habits (self-report). 0-16.
  civicplus: {
    title: "Giving & civic habits (self-report)",
    items: [
      { text: "I give to or support causes I care about on a regular basis.", options: FREQ_5, def: 2 },
      { text: "I volunteer my time or skills for others or my community.", options: FREQ_5, def: 2 },
      { text: "I take part in civic activities such as voting, community meetings, or petitions.", options: FREQ_5, def: 2 },
      { text: "I go out of my way to help strangers when I see a need.", options: FREQ_5, def: 2 }
    ]
  },

  // ENVIRONMENT — additional green habits (self-report). 0-16.
  greenplus: {
    title: "Everyday green habits (self-report)",
    items: [
      { text: "I choose products with less packaging or more eco-friendly options.", options: FREQ_5, def: 2 },
      { text: "I repair or reuse items instead of replacing them.", options: FREQ_5, def: 2 },
      { text: "I limit food waste and compost when I can.", options: FREQ_5, def: 2 },
      { text: "I use energy- and water-saving practices at home.", options: FREQ_5, def: 2 }
    ]
  },

  // HUMANITY'S FUTURE — 12-item Consideration of Future Consequences scale.
  // Immediate-oriented items are reverse-keyed. Raw sum 12-60.
  cfc12: {
    title: "Consideration of Future Consequences (CFC-12)",
    items: [
      { text: "I consider how things might be in the future, and try to influence those things with my day-to-day behavior.", options: CFC_CHAR, def: 3 },
      { text: "Often I engage in a particular behavior in order to achieve outcomes that may not result for many years.", options: CFC_CHAR, def: 3 },
      { text: "I only act to satisfy immediate concerns, figuring the future will take care of itself.", options: CFC_CHAR_REV, def: 3 },
      { text: "My behavior is only influenced by the immediate (a matter of days or weeks) outcomes of my actions.", options: CFC_CHAR_REV, def: 3 },
      { text: "My convenience is a big factor in the decisions I make or the actions I take.", options: CFC_CHAR_REV, def: 3 },
      { text: "I am willing to sacrifice my immediate happiness or well-being in order to achieve future outcomes.", options: CFC_CHAR, def: 3 },
      { text: "I think it is important to take warnings about negative outcomes seriously even if the negative outcome will not occur for many years.", options: CFC_CHAR, def: 3 },
      { text: "I think it is more important to perform a behavior with important distant consequences than a behavior with less-important immediate consequences.", options: CFC_CHAR, def: 3 },
      { text: "I generally ignore warnings about possible future problems because I think the problems will be resolved before they reach crisis level.", options: CFC_CHAR_REV, def: 3 },
      { text: "I think that sacrificing now is usually unnecessary since future outcomes can be dealt with at a later time.", options: CFC_CHAR_REV, def: 3 },
      { text: "I only act to satisfy immediate concerns, figuring that I will take care of future problems that may occur at a later date.", options: CFC_CHAR_REV, def: 3 },
      { text: "Since my day-to-day work has specific outcomes, it is more important to me than behavior that has distant outcomes.", options: CFC_CHAR_REV, def: 3 }
    ]
  }
};

// The deep assessment is presented one aspect-section at a time so a user can
// complete it progressively. `coupledOnly` instruments are shown only to users
// whose relationshipStatus is not "Single". `blurb` explains the section's gain.
export const DEEP_SECTIONS = [
  { aspect: "finance", title: "Finance — in depth", blurb: "The full 10-item CFPB Financial Well-Being Scale (onboarding used 5).", instruments: [{ key: "cfpb10" }] },
  { aspect: "physical", title: "Physical — in depth", blurb: "Sedentary time and sleep hygiene refine your activity and sleep scores.", instruments: [{ key: "sedentary" }] },
  { aspect: "mental", title: "Mental — in depth", blurb: "The 10-item Perceived Stress Scale adds a validated stress reading.", instruments: [{ key: "pss10" }] },
  { aspect: "relationships", title: "Relationships — in depth", blurb: "The full LSNS-R social-network scale, plus the full relationship scale for couples.", instruments: [{ key: "lsnsR" }, { key: "ras7", coupledOnly: true }] },
  { aspect: "personalGoals", title: "Personal Goals — in depth", blurb: "Full GSE-10 and Grit-12, plus the Rosenberg Self-Esteem Scale.", instruments: [{ key: "gse10" }, { key: "grit12" }, { key: "rses" }] },
  { aspect: "socialContribution", title: "Social Contribution — in depth", blurb: "Additional giving and civic-participation habits.", instruments: [{ key: "civicplus" }] },
  { aspect: "environment", title: "Environment — in depth", blurb: "Additional everyday green habits.", instruments: [{ key: "greenplus" }] },
  { aspect: "humanityFuture", title: "Humanity's Future — in depth", blurb: "The 12-item Consideration of Future Consequences scale.", instruments: [{ key: "cfc12" }] }
];

export function deepInstrumentSize(key) {
  return DEEP_INSTRUMENTS[key].items.length;
}

// Instruments to show for one deep section, filtering coupled-only ones out for
// single users.
export function deepSectionInstruments(section, isCoupled) {
  return section.instruments.filter(i => !i.coupledOnly || isCoupled).map(i => i.key);
}
