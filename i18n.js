// i18n.js - Tiny EN/TH localization layer.
//
// English strings ARE the canonical keys: t("Weekly Commitment") looks the
// exact English text up in the Thai dictionary (th.js) and falls back to
// English when no entry exists (e.g. user-authored routine names). The
// language choice lives in its own localStorage key so it survives a
// game-data reset. Pure module: no DOM at import time, fully testable.

import { TH } from "./th.js";

const LANG_STORAGE_KEY = "lifequest_lang";
const SUPPORTED_LANGS = ["en", "th"];

function readStoredLang() {
  try {
    const saved = typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(LANG_STORAGE_KEY);
    return SUPPORTED_LANGS.includes(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

let currentLang = readStoredLang();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return currentLang;
  currentLang = lang;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    }
  } catch (e) {
    console.error("Failed to persist language choice:", e);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
  return currentLang;
}

// Translate a canonical English string.
export function t(text) {
  if (currentLang === "th") {
    return TH[text] || text;
  }
  return text;
}

// Translate a parameterized template: tp("Log {n} more", {n: 3}).
// Unknown placeholders are left as-is so mistakes stay visible.
export function tp(text, params = {}) {
  return t(text).replace(/\{(\w+)\}/g, (match, key) =>
    params[key] !== undefined ? params[key] : match
  );
}

// "62nd" in English; Thai has no ordinal suffixes, so "ที่ 62".
export function percentileLabel(n) {
  if (currentLang === "th") return `ที่ ${n}`;
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

// Locale tag for Date.toLocale* formatting.
export function dateLocale() {
  return currentLang === "th" ? "th-TH" : "en-US";
}
