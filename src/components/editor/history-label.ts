import type { CV } from "#/lib/cv/schema";
import { SECTION_KEYS, type SectionKey } from "#/lib/cv/schema";
import { getTemplate, type TemplateId } from "#/lib/cv/templates";
import { templateName } from "#/lib/cv/templates/copy";
import { m } from "#/paraglide/messages.js";

interface Doc {
  cv: CV;
  template: TemplateId;
}

const STYLE_LABELS: Record<string, () => string> = {
  font: m.hist_changed_font,
  accent: m.hist_changed_colour,
  paper: m.hist_changed_paper,
  padX: m.hist_changed_margins,
  padTop: m.hist_changed_margins,
  padBottom: m.hist_changed_margins,
};

/** A short name for what changed between two versions of a CV. */
export function describeChange(prev: Doc, next: Doc, paths: string[]) {
  if (paths.length === 0) {
    return m.hist_no_change();
  }
  const labels = new Set(paths.map((p) => labelForPath(prev, next, p)));
  return labels.size === 1 ? [...labels][0] : m.hist_edited_cv();
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one case per part of the CV
function labelForPath(prev: Doc, next: Doc, path: string): string {
  if (path === "template") {
    return m.hist_switched_template({
      name: templateName(getTemplate(next.template)),
    });
  }
  const [, area, key, index] = path.split(".");
  if (area === "style") {
    return STYLE_LABELS[key]?.() ?? m.hist_changed_typography();
  }
  if (area === "sectionOrder") {
    return m.hist_reordered_sections();
  }
  if (area === "labels") {
    return m.hist_renamed_section();
  }
  if (area === "basics") {
    if (key === "summary") {
      return m.hist_edited_profile();
    }
    return key === "photo" ? m.hist_changed_photo() : m.hist_edited_header();
  }
  if (area === "custom") {
    const before = prev.cv.custom.length;
    const after = next.cv.custom.length;
    if (key === undefined && after !== before) {
      return after > before ? m.hist_added_section() : m.hist_removed_section();
    }
    const section = next.cv.custom[Number(key)] ?? prev.cv.custom[Number(key)];
    return section?.title
      ? m.hist_edited_name({ name: section.title })
      : m.hist_edited_section();
  }
  if (SECTION_KEYS.includes(area as SectionKey)) {
    const name = next.cv.labels[area as SectionKey] || area;
    const before = prev.cv[area as SectionKey].length;
    const after = next.cv[area as SectionKey].length;
    if (index === undefined && key === undefined && after !== before) {
      return after > before
        ? m.hist_added_to({ name })
        : m.hist_removed_from({ name });
    }
    return m.hist_edited_name({ name });
  }
  return m.hist_edited_cv();
}
