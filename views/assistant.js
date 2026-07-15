// views/assistant.js - contextual tip for the floating guidance assistant.
// Moved verbatim from the old monolithic ui.js; behavior unchanged.

import { t } from "../i18n.js";

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
    finance: "Your finance score has room to grow. A simple monthly budget and a set savings rate are good starting points.",
    physical: "Your physical activity could use a lift. A short walk today is an easy way to build momentum.",
    mental: "Feeling stretched? Try a slow breathing break — two short inhales through the nose, then one long exhale.",
    relationships: "Connection matters. Consider reaching out to a close friend or relative this week.",
    personalGoals: "Steady practice moves your goals forward. Even 20 minutes of focused learning today helps.",
    socialContribution: "Small acts of giving add up. A minor kindness or a modest donation strengthens this area.",
    environment: "Everyday choices shape your footprint. Separating recyclables today is a simple step.",
    humanityFuture: "Long-term security grows from consistent habits — saving and upskilling both anchor your future."
  };

  return t(dialogs[lowestAspect] || "Log a routine today to keep your assessment current and track your progress.");
}
