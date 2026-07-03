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
    title: "ST-5 Stress Index (past 2-4 weeks)",
    items: [
      { text: "How often did you have trouble sleeping because of worry?", options: ST5_FREQ, def: 0 },
      { text: "How often did you have poor concentration?", options: ST5_FREQ, def: 0 },
      { text: "How often did you feel irritable, restless, or agitated?", options: ST5_FREQ, def: 0 },
      { text: "How often did you feel bored or discouraged?", options: ST5_FREQ, def: 0 },
      { text: "How often did you not want to meet people?", options: ST5_FREQ, def: 0 }
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
    title: "UCLA Loneliness Index",
    items: [
      { text: "How often do you feel that you lack companionship?", options: UCLA_FREQ, def: 1 },
      { text: "How often do you feel left out?", options: UCLA_FREQ, def: 1 },
      { text: "How often do you feel isolated from others?", options: UCLA_FREQ, def: 1 }
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
