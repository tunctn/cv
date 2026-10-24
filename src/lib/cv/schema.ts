import { z } from "zod";
import { m } from "#/paraglide/messages.js";
import type { Locale } from "#/paraglide/runtime.js";

import { cvLocale, localizedLabels } from "./i18n-labels";

export const linkSchema = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string(),
});

export const basicsSchema = z.object({
  name: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  website: z.string(),
  summary: z.string(),
  photo: z.string(),
  links: z.array(linkSchema),
});

export const experienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  location: z.string(),
  start: z.string(),
  end: z.string(),
  meta: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
});

export const educationSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string(),
  location: z.string(),
  start: z.string(),
  end: z.string(),
  meta: z.string(),
  description: z.string(),
});

export const skillItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
});

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.union([z.literal(1), z.literal(2)]),
  items: z.array(skillItemSchema),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
});

export const languageSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
});

export const SECTION_KEYS = [
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** An entry of a user-made section: title, optional details and bullets. */
export const customItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  date: z.string(),
  location: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
});

/** A section the user named themselves, e.g. "Awards" or "Volunteering". */
export const customSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(customItemSchema),
});

/** Custom sections appear in `sectionOrder` as "custom:<id>". */
export type CustomKey = `custom:${string}`;
export type OrderKey = SectionKey | CustomKey;

export function customKey(id: string): CustomKey {
  return `custom:${id}`;
}

export function isCustomKey(key: string): key is CustomKey {
  return key.startsWith("custom:");
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  languages: "Languages",
};

export const labelsSchema = z.object({
  profile: z.string(),
  experience: z.string(),
  education: z.string(),
  skills: z.string(),
  projects: z.string(),
  languages: z.string(),
});

export const DEFAULT_LABELS: z.infer<typeof labelsSchema> = {
  profile: "Profile",
  ...SECTION_LABELS,
};

/** Per-CV overrides of the template's look. Anything unset falls back to the template default. */
export const PAPERS = ["a4", "letter"] as const;
export type Paper = (typeof PAPERS)[number];

export const styleSchema = z.object({
  paper: z.enum(PAPERS).optional(),
  font: z.string().optional(),
  accent: z.string().optional(),
  padX: z.number().min(0).max(120).optional(),
  padTop: z.number().min(0).max(120).optional(),
  padBottom: z.number().min(0).max(120).optional(),
  /** Text size multiplier (1 = the template's sizes). */
  fontScale: z.number().min(0.7).max(1.5).optional(),
  /** Line height multiplier (1 = the template's leading). */
  lineHeight: z.number().min(0.7).max(1.8).optional(),
  /** Extra letter spacing in em, added to the template's tracking. */
  letterSpacing: z.number().min(-0.1).max(0.2).optional(),
  /** Size multiplier for the name and section headings. */
  headingScale: z.number().min(0.6).max(1.6).optional(),
  /** Font weight for the name and section headings (unset = the template's). */
  headingWeight: z.number().int().min(100).max(900).optional(),
});

export const cvSchema = z.object({
  /** Locale the CV is written in (set at creation); drives default headings and the AI. */
  language: z.string().optional(),
  basics: basicsSchema,
  style: styleSchema,
  labels: labelsSchema,
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.array(skillSchema),
  projects: z.array(projectSchema),
  languages: z.array(languageSchema),
  custom: z.array(customSectionSchema).default([]),
  sectionOrder: z.array(
    z.union([z.enum(SECTION_KEYS), z.templateLiteral(["custom:", z.string()])])
  ),
});

export type CV = z.infer<typeof cvSchema>;
export type CvStyle = z.infer<typeof styleSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type Labels = z.infer<typeof labelsSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Link = z.infer<typeof linkSchema>;
export type CustomItem = z.infer<typeof customItemSchema>;
export type CustomSection = z.infer<typeof customSectionSchema>;

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyExperience(): Experience {
  return {
    id: newId(),
    company: "",
    role: "",
    location: "",
    start: "",
    end: "",
    meta: "",
    description: "",
    highlights: [],
  };
}

export function emptyEducation(): Education {
  return {
    id: newId(),
    school: "",
    degree: "",
    location: "",
    start: "",
    end: "",
    meta: "",
    description: "",
  };
}

export function emptySkillItem(): SkillItem {
  return { id: newId(), title: "", text: "" };
}

export function emptySkill(): Skill {
  return { id: newId(), name: "", columns: 1, items: [] };
}

export function emptyProject(): Project {
  return { id: newId(), name: "", url: "", description: "", highlights: [] };
}

export function emptyLanguage(): Language {
  return { id: newId(), name: "", level: "" };
}

export function emptyCustomItem(): CustomItem {
  return {
    id: newId(),
    title: "",
    subtitle: "",
    date: "",
    location: "",
    description: "",
    highlights: [],
  };
}

export function emptyCustomSection(title?: string): CustomSection {
  return {
    id: newId(),
    title: title ?? m.cv_new_section(),
    items: [emptyCustomItem()],
  };
}

export const EMPTY_ITEM: Record<SectionKey, () => { id: string }> = {
  experience: emptyExperience,
  education: emptyEducation,
  skills: emptySkill,
  projects: emptyProject,
  languages: emptyLanguage,
};

/** A blank CV; with a locale, its headings are in that language and it remembers it. */
export function emptyCv(locale?: Locale): CV {
  return {
    ...(locale ? { language: locale } : {}),
    basics: {
      name: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      summary: "",
      photo: "",
      links: [],
    },
    style: {},
    labels: locale ? localizedLabels(locale) : { ...DEFAULT_LABELS },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
    custom: [],
    sectionOrder: [...SECTION_KEYS],
  };
}

/** Fills in anything missing so older or partial documents still render. */
export function normalizeCv(input: unknown): CV {
  const base = emptyCv();
  const raw = (input ?? {}) as Partial<CV>;
  const custom: CustomSection[] = (
    Array.isArray(raw.custom) ? raw.custom : []
  ).map((s) => ({
    id: s.id || newId(),
    title: s.title ?? "",
    items: (s.items ?? []).map((i) => ({ ...emptyCustomItem(), ...i })),
  }));
  const customKeys = custom.map((s) => customKey(s.id));
  const order: OrderKey[] = Array.isArray(raw.sectionOrder)
    ? raw.sectionOrder.filter(
        (k): k is OrderKey =>
          SECTION_KEYS.includes(k as SectionKey) ||
          customKeys.includes(k as CustomKey)
      )
    : [];
  for (const key of [...SECTION_KEYS, ...customKeys]) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }
  return {
    ...(typeof raw.language === "string" ? { language: raw.language } : {}),
    basics: {
      ...base.basics,
      ...(raw.basics ?? {}),
      links: raw.basics?.links ?? [],
    },
    style: { ...(raw.style ?? {}) },
    // Missing headings fall back to the CV's language, else the UI locale.
    labels: {
      ...localizedLabels(cvLocale(raw.language)),
      ...(raw.labels ?? {}),
    },
    experience: (raw.experience ?? []).map((e) => ({
      ...emptyExperience(),
      ...e,
    })),
    education: (raw.education ?? []).map((e) => ({
      ...emptyEducation(),
      ...e,
    })),
    skills: (raw.skills ?? []).map((e) => ({
      ...emptySkill(),
      ...e,
      items: (e.items ?? []).map((i) => ({ ...emptySkillItem(), ...i })),
    })),
    projects: (raw.projects ?? []).map((e) => ({ ...emptyProject(), ...e })),
    languages: (raw.languages ?? []).map((e) => ({ ...emptyLanguage(), ...e })),
    custom,
    sectionOrder: order,
  };
}
