// views/actions.js - preset routines that users can log. Pure data, moved
// verbatim from the old monolithic ui.js; behavior unchanged.
//
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
