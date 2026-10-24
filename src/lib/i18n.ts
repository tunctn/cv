import { defineCustomClientStrategy, isLocale } from "#/paraglide/runtime.js";
import type { Locale } from "#/paraglide/runtime.js";

/**
 * Mirrors the server's pick into the client: the server render writes the
 * locale into <html lang>, and the client reads it back before falling
 * through to navigator.languages. Keeps hydration in the same language.
 */
defineCustomClientStrategy("custom-html", {
  getLocale: () => {
    const lang =
      typeof document === "undefined"
        ? undefined
        : document.documentElement.lang;
    return lang && isLocale(lang) ? lang : undefined;
  },
  setLocale: () => {
    // The cookie strategy persists the choice; nothing to store here.
  },
});

/** Each language in its own name, for the language picker. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  hi: "हिन्दी",
  ar: "العربية",
  pt: "Português",
  bn: "বাংলা",
  ru: "Русский",
  ja: "日本語",
  fr: "Français",
  de: "Deutsch",
  ko: "한국어",
  tr: "Türkçe",
  it: "Italiano",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  pl: "Polski",
  nl: "Nederlands",
  uk: "Українська",
  th: "ไทย",
};

/** English names, shown small under the native name in the picker. */
export const ENGLISH_NAMES: Record<Locale, string> = {
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  hi: "Hindi",
  ar: "Arabic",
  pt: "Portuguese",
  bn: "Bengali",
  ru: "Russian",
  ja: "Japanese",
  fr: "French",
  de: "German",
  ko: "Korean",
  tr: "Turkish",
  it: "Italian",
  vi: "Vietnamese",
  id: "Indonesian",
  pl: "Polish",
  nl: "Dutch",
  uk: "Ukrainian",
  th: "Thai",
};

const RTL = new Set<Locale>(["ar"]);

export const textDirection = (locale: Locale): "rtl" | "ltr" =>
  RTL.has(locale) ? "rtl" : "ltr";
