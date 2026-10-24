import { m } from "#/paraglide/messages.js";
import { getLocale, isLocale, type Locale } from "#/paraglide/runtime.js";

import type { Labels, SectionKey } from "./schema";

/** The CV's own language if it has a valid one, else the current UI locale. */
export function cvLocale(language?: string): Locale {
  return language && isLocale(language) ? language : getLocale();
}

/** Default section headings in a locale (the UI locale when left out). */
export function localizedLabels(locale: Locale = getLocale()): Labels {
  const t = { locale };
  return {
    profile: m.cv_label_profile({}, t),
    experience: m.cv_label_experience({}, t),
    education: m.cv_label_education({}, t),
    skills: m.cv_label_skills({}, t),
    projects: m.cv_label_projects({}, t),
    languages: m.cv_label_languages({}, t),
  };
}

/** Default heading of one built-in section, e.g. for "Add section" menus. */
export function sectionLabel(
  key: SectionKey | "profile",
  locale: Locale = getLocale()
): string {
  return localizedLabels(locale)[key];
}

/**
 * When a section is added, give it its heading in the CV's language if the
 * stored one is still an untouched English default (older CVs kept those).
 */
export function withLocalLabel<C extends { labels: Labels; language?: string }>(
  cv: C,
  key: keyof Labels
): C {
  const locale = cvLocale(cv.language);
  const english = localizedLabels("en")[key];
  if (locale === "en" || (cv.labels[key] && cv.labels[key] !== english)) {
    return cv;
  }
  return { ...cv, labels: { ...cv.labels, [key]: sectionLabel(key, locale) } };
}

const NOT_CONTENT = new Set([
  "labels",
  "style",
  "language",
  "sectionOrder",
  "photo",
  "columns",
]);

/** Whether the CV has any text the person wrote (headings don't count). */
export function hasWords(value: unknown, top = true): boolean {
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
}

/**
 * Switch the CV's language: headings still at a default (of the old
 * language or English) take the new language's default; renamed ones stay.
 */
export function withLanguage<C extends { labels: Labels; language?: string }>(
  cv: C,
  to: Locale
): C {
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
}
