// crewcode.js - Shareable "Crew Codes" for real user-vs-user rankings.
//
// A crew code packs a player's public stats (name, level, total points,
// aspect scores) into a compact base64url string with an "LQ1-" prefix.
// Friends exchange codes over chat and paste them into the Rankings tab —
// real people, no backend, works on any static host. Pure module: no DOM.

const CODE_PREFIX = "LQ1-";
const NAME_MAX_LENGTH = 20;
const LEVEL_MAX = 999;
const POINTS_MAX = 10000000;
const ASPECT_COUNT = 8;

// Aspect order is part of the code format — do not reorder.
const ASPECT_ORDER = [
  "finance", "physical", "mental", "relationships",
  "personalGoals", "socialContribution", "environment", "humanityFuture"
];

// Same points formula the Rankings table uses.
export function crewPoints(state) {
  const historyXp = (state.history || []).reduce((sum, h) => sum + (h.xpReward || 0), 0);
  return historyXp + (state.profile.level || 1) * 150;
}

// TextEncoder-based base64url so Thai and other non-Latin names survive.
function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url) {
  const bin = atob(b64url.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeCrewCode(state) {
  const payload = {
    v: 1,
    n: String(state.profile.name || "Guest").trim().slice(0, NAME_MAX_LENGTH) || "Guest",
    l: Math.max(1, Math.min(LEVEL_MAX, parseInt(state.profile.level || 1))),
    p: Math.max(0, Math.min(POINTS_MAX, crewPoints(state))),
    a: ASPECT_ORDER.map(key => Math.round(Math.max(0, Math.min(100, (state.aspects || {})[key] || 0))))
  };
  return CODE_PREFIX + toBase64Url(JSON.stringify(payload));
}

// Throws a user-friendly Error on anything malformed or out of range.
export function decodeCrewCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed.startsWith(CODE_PREFIX)) {
    throw new Error(`Crew codes start with "${CODE_PREFIX}".`);
  }
  let payload;
  try {
    payload = JSON.parse(fromBase64Url(trimmed.slice(CODE_PREFIX.length)));
  } catch {
    throw new Error("That code is damaged — ask your crewmate to copy it again.");
  }
  if (!payload || payload.v !== 1) {
    throw new Error("Unsupported crew code version.");
  }
  const name = typeof payload.n === "string" ? payload.n.trim().slice(0, NAME_MAX_LENGTH) : "";
  const level = parseInt(payload.l);
  const points = parseInt(payload.p);
  const aspects = payload.a;
  if (!name) throw new Error("Crew code is missing a name.");
  if (!Number.isInteger(level) || level < 1 || level > LEVEL_MAX) {
    throw new Error("Crew code has an invalid level.");
  }
  if (!Number.isInteger(points) || points < 0 || points > POINTS_MAX) {
    throw new Error("Crew code has invalid points.");
  }
  if (!Array.isArray(aspects) || aspects.length !== ASPECT_COUNT
    || !aspects.every(v => Number.isFinite(v) && v >= 0 && v <= 100)) {
    throw new Error("Crew code has invalid aspect scores.");
  }
  return {
    name,
    level,
    totalPoints: points,
    aspects: Object.fromEntries(ASPECT_ORDER.map((key, i) => [key, Math.round(aspects[i])]))
  };
}
