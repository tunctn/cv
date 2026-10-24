import { m } from "#/paraglide/messages.js";
import { getLocale, isLocale } from "#/paraglide/runtime.js";
import type { Locale } from "#/paraglide/runtime.js";

import type { Labels, SectionKey } from "./schema";

export const cvLocale = (language?: string): Locale =>
  language && isLocale(language) ? language : getLocale();

export const localizedLabels = (locale: Locale = getLocale()): Labels => {
  const t = { locale };
  return {
    profile: m.cv_label_profile({}, t),
    experience: m.cv_label_experience({}, t),
    education: m.cv_label_education({}, t),
    skills: m.cv_label_skills({}, t),
    projects: m.cv_label_projects({}, t),
    languages: m.cv_label_languages({}, t),
  };
};

export const sectionLabel = (
  key: SectionKey | "profile",
  locale: Locale = getLocale()
): string => localizedLabels(locale)[key];

export const withLocalLabel = <C extends { labels: Labels; language?: string }>(
  cv: C,
  key: keyof Labels
): C => {
  const locale = cvLocale(cv.language);
  const english = localizedLabels("en")[key];
  if (locale === "en" || (cv.labels[key] && cv.labels[key] !== english)) {
    return cv;
  }
  return { ...cv, labels: { ...cv.labels, [key]: sectionLabel(key, locale) } };
};

const NOT_CONTENT = new Set([
  "labels",
  "style",
  "language",
  "sectionOrder",
  "photo",
  "columns",
]);

export const hasWords = (value: unknown, top = true): boolean => {
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  if (Array.isArray(value)) {
    return value.some((v) => hasWords(v, false));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([k, v]) =>
        k !== "id" && !(top && NOT_CONTENT.has(k)) && hasWords(v, false)
    );
  }
  return false;
};

export const withLanguage = <C extends { labels: Labels; language?: string }>(
  cv: C,
  to: Locale
): C => {
  const from = cvLocale(cv.language);
  const old = localizedLabels(from);
  const english = localizedLabels("en");
  const next = localizedLabels(to);
  const labels = { ...cv.labels };
  for (const key of Object.keys(next) as (keyof Labels)[]) {
    if (
      !labels[key] ||
      labels[key] === old[key] ||
      labels[key] === english[key]
    ) {
      labels[key] = next[key];
    }
  }
  return { ...cv, language: to, labels };
};
