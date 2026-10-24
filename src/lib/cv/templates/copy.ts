import { m } from "#/paraglide/messages.js";
import type { TemplateCategory, TemplateDef } from "../engine";

/** Template names and descriptions in the visitor's language. */
const NAMES: Record<string, () => string> = {
  classic: m.template_name_classic,
  modern: m.template_name_modern,
  studio: m.template_name_studio,
  compact: m.template_name_compact,
  minimal: m.template_name_minimal,
  editorial: m.template_name_editorial,
  collegiate: m.template_name_collegiate,
  academic: m.template_name_academic,
  executive: m.template_name_executive,
  ats: m.template_name_ats,
  portfolio: m.template_name_portfolio,
  timeline: m.template_name_timeline,
  "two-tone": m.template_name_two_tone,
  swiss: m.template_name_swiss,
  terminal: m.template_name_terminal,
  elegant: m.template_name_elegant,
  tech: m.template_name_tech,
  nordic: m.template_name_nordic,
  finance: m.template_name_finance,
  clinical: m.template_name_clinical,
  teacher: m.template_name_teacher,
  graduate: m.template_name_graduate,
  europa: m.template_name_europa,
  skillbar: m.template_name_skillbar,
  startup: m.template_name_startup,
};

const DESCRIPTIONS: Record<string, () => string> = {
  classic: m.template_desc_classic,
  modern: m.template_desc_modern,
  studio: m.template_desc_studio,
  compact: m.template_desc_compact,
  minimal: m.template_desc_minimal,
  editorial: m.template_desc_editorial,
  collegiate: m.template_desc_collegiate,
  academic: m.template_desc_academic,
  executive: m.template_desc_executive,
  ats: m.template_desc_ats,
  portfolio: m.template_desc_portfolio,
  timeline: m.template_desc_timeline,
  "two-tone": m.template_desc_two_tone,
  swiss: m.template_desc_swiss,
  terminal: m.template_desc_terminal,
  elegant: m.template_desc_elegant,
  tech: m.template_desc_tech,
  nordic: m.template_desc_nordic,
  finance: m.template_desc_finance,
  clinical: m.template_desc_clinical,
  teacher: m.template_desc_teacher,
  graduate: m.template_desc_graduate,
  europa: m.template_desc_europa,
  skillbar: m.template_desc_skillbar,
  startup: m.template_desc_startup,
};

export function templateName(def: TemplateDef) {
  return NAMES[def.id]?.() ?? def.name;
}

export function templateDescription(def: TemplateDef) {
  return DESCRIPTIONS[def.id]?.() ?? def.description;
}

const CATEGORY_LABELS: Record<TemplateCategory | "all", () => string> = {
  all: m.template_cat_all,
  professional: m.template_cat_professional,
  simple: m.template_cat_simple,
  creative: m.template_cat_creative,
  technical: m.template_cat_technical,
  academic: m.template_cat_academic,
  student: m.template_cat_student,
};

/** Localised name of a template category ("all" for the unfiltered list). */
export function categoryLabel(category: TemplateCategory | "all") {
  return CATEGORY_LABELS[category]();
}
