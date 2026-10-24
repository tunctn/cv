import type { ReactNode } from "react";

import type { CV, Paper } from "./schema";

/** Sheet sizes in CSS px (96 dpi). A4 is 210×297 mm, US Letter is 8.5×11 in. */
export const PAPER_SIZES: Record<
  Paper,
  { width: number; height: number; label: string }
> = {
  a4: { width: 794, height: 1123, label: "A4" },
  letter: { width: 816, height: 1056, label: "US Letter" },
};

/**
 * The unit of pagination. Pages break only between blocks, so a block is
 * never split across two pages.
 */
export interface Block {
  /** Spans the full sheet width, ignoring horizontal padding (e.g. a coloured header band). */
  bleed?: boolean;
  /** Space above the block in px. Dropped when the block starts a page. */
  gap?: number;
  /** Never leave this block last on a page (e.g. a section heading). */
  keepWithNext?: boolean;
  key: string;
  node: ReactNode;
}

export interface Layout {
  main: Block[];
  /** Optional second column, paginated on its own (sidebar templates). */
  side?: Block[];
}

export interface TemplateStyle {
  accent: string;
  font: string;
  fontScale: number;
  headingScale: number;
  /** Unset keeps the weights the template draws its headings with. */
  headingWeight?: number;
  letterSpacing: number;
  lineHeight: number;
  padBottom: number;
  padTop: number;
  padX: number;
  paper: Paper;
}

/** Typography settings with neutral defaults; templates may override them. */
type TypeKeys = "fontScale" | "lineHeight" | "letterSpacing" | "headingScale";

export const TYPE_DEFAULTS: Pick<TemplateStyle, TypeKeys> = {
  fontScale: 1,
  lineHeight: 1,
  letterSpacing: 0,
  headingScale: 1,
};

/** Groups in the template picker. */
export const TEMPLATE_CATEGORIES = [
  "professional",
  "simple",
  "creative",
  "technical",
  "academic",
  "student",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface TemplateDef {
  build: (cv: CV) => Layout;
  category: TemplateCategory;
  defaults: Omit<TemplateStyle, "paper" | TypeKeys | "headingWeight"> &
    Partial<Pick<TemplateStyle, TypeKeys | "headingWeight">>;
  description: string;
  id: string;
  name: string;
  /** Extra classes on every sheet (base text colour, size, leading). */
  sheetClassName?: string;
  /** Sidebar column, drawn on every page. */
  side?: {
    width: number;
    position: "left" | "right";
    /** Background etc. for the full-height column. */
    className?: string;
  };
}

export const resolveStyle = (def: TemplateDef, cv: CV): TemplateStyle => {
  const s = cv.style ?? {};
  return {
    paper: s.paper ?? "a4",
    font: s.font ?? def.defaults.font,
    accent: s.accent ?? def.defaults.accent,
    padX: s.padX ?? def.defaults.padX,
    padTop: s.padTop ?? def.defaults.padTop,
    padBottom: s.padBottom ?? def.defaults.padBottom,
    fontScale: s.fontScale ?? def.defaults.fontScale ?? TYPE_DEFAULTS.fontScale,
    lineHeight:
      s.lineHeight ?? def.defaults.lineHeight ?? TYPE_DEFAULTS.lineHeight,
    letterSpacing:
      s.letterSpacing ??
      def.defaults.letterSpacing ??
      TYPE_DEFAULTS.letterSpacing,
    headingScale:
      s.headingScale ?? def.defaults.headingScale ?? TYPE_DEFAULTS.headingScale,
    headingWeight: s.headingWeight ?? def.defaults.headingWeight,
  };
};

export const typeAttrs = (style: TemplateStyle) => {
  const attrs: Record<string, string> = {};
  const vars: Record<string, string> = {};
  if (style.lineHeight !== 1) {
    attrs["data-cv-lh"] = "";
    vars["--cv-lh"] = String(style.lineHeight);
  }
  if (style.letterSpacing !== 0) {
    attrs["data-cv-ls"] = "";
    vars["--cv-ls"] = `${style.letterSpacing}em`;
  }
  if (style.headingScale !== 1) {
    attrs["data-cv-hs"] = "";
    vars["--cv-hs"] = String(style.headingScale);
  }
  if (style.headingWeight !== undefined) {
    attrs["data-cv-hw"] = "";
    vars["--cv-hw"] = String(style.headingWeight);
  }
  return { attrs, vars };
};

/** Keys of the blocks that start pages 2, 3, … for each column. */
export interface PageBreaks {
  main: string[];
  side: string[];
}

export const paginate = (
  blocks: Block[],
  heights: number[],
  available: number,
  forced?: string[]
): number[][] => {
  if (forced) {
    const starts = new Set(forced);
    const pages: number[][] = [[]];
    for (const [i, b] of blocks.entries()) {
      if (starts.has(b.key) && (pages.at(-1) as number[]).length > 0) {
        pages.push([]);
      }
      (pages.at(-1) as number[]).push(i);
    }
    return pages;
  }
  const pages: number[][] = [[]];
  let used = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    const page = pages.at(-1) as number[];
    const empty = page.length === 0;
    const gap = empty ? 0 : (blocks[i].gap ?? 0);
    let need = gap + heights[i];
    if (blocks[i].keepWithNext && i + 1 < blocks.length) {
      need += (blocks[i + 1].gap ?? 0) + heights[i + 1];
    }
    if (!empty && used + need > available) {
      pages.push([i]);
      used = heights[i];
      continue;
    }
    page.push(i);
    used += gap + heights[i];
  }
  return pages;
};

export const usedHeight = (
  blocks: Block[],
  heights: number[],
  indexes: number[]
) =>
  indexes.reduce(
    (sum, i, n) => sum + (n === 0 ? 0 : (blocks[i].gap ?? 0)) + heights[i],
    0
  );

export const breaksOf = (blocks: Block[], pages: number[][]) =>
  pages.slice(1).flatMap((p) => (p.length ? [blocks[p[0]].key] : []));
