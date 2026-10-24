import {
  customKey,
  EMPTY_ITEM,
  emptyCustomItem,
  emptyCustomSection,
  newId,
} from "./schema";
import type { CustomKey, CustomSection, CV, SectionKey } from "./schema";

/**
 * Dot paths into a CV, e.g. "basics.summary", "experience.2.highlights.0",
 * "skills.1.items.3.text". Numeric segments index arrays.
 */
export type Path = string;

const NUMERIC = /^\d+$/u;
const CUSTOM_ITEMS = /^custom\.\d+\.items$/u;

const segments = (path: Path) =>
  path.split(".").map((s) => (NUMERIC.test(s) ? Number(s) : s));

export const getIn = (cv: CV, path: Path): unknown => {
  let cur: unknown = cv;
  for (const seg of segments(path)) {
    if (cur === null || cur === undefined) {
      return undefined;
    }
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
};

export const setIn = (cv: CV, path: Path, value: unknown): CV => {
  const segs = segments(path);
  const write = (node: unknown, i: number): unknown => {
    const seg = segs[i];
    const copy = Array.isArray(node)
      ? [...node]
      : { ...(node as Record<string, unknown>) };
    (copy as Record<string | number, unknown>)[seg] =
      i === segs.length - 1
        ? value
        : write((node as Record<string | number, unknown>)[seg], i + 1);
    return copy;
  };
  return write(cv, 0) as CV;
};

const updateList = (
  cv: CV,
  listPath: Path,
  fn: (list: unknown[]) => unknown[]
): CV => {
  const list = getIn(cv, listPath);
  return Array.isArray(list) ? setIn(cv, listPath, fn(list)) : cv;
};

export const moveIn = (cv: CV, listPath: Path, from: number, to: number) =>
  updateList(cv, listPath, (list) => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
    return next;
  });

export const removeAt = (cv: CV, listPath: Path, index: number) =>
  updateList(cv, listPath, (list) => list.filter((_, i) => i !== index));

export const insertAt = (
  cv: CV,
  listPath: Path,
  index: number,
  item: unknown
) =>
  updateList(cv, listPath, (list) => {
    const next = [...list];
    next.splice(index, 0, item);
    return next;
  });

const cloneWithIds = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(cloneWithIds) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "id" ? newId() : cloneWithIds(v);
    }
    return out as T;
  }
  return value;
};

export const duplicateAt = (cv: CV, listPath: Path, index: number) =>
  updateList(cv, listPath, (list) => {
    const next = [...list];
    next.splice(index + 1, 0, cloneWithIds(list[index]));
    return next;
  });

export const splitIndex = (
  path: Path
): { list: Path; index: number } | null => {
  const i = path.lastIndexOf(".");
  const last = path.slice(i + 1);
  if (i === -1 || !NUMERIC.test(last)) {
    return null;
  }
  return { list: path.slice(0, i), index: Number(last) };
};

export const blankFor = (listPath: Path): unknown => {
  if (listPath.endsWith(".highlights")) {
    return "";
  }
  if (CUSTOM_ITEMS.test(listPath)) {
    return emptyCustomItem();
  }
  if (listPath === "custom") {
    return emptyCustomSection();
  }
  if (listPath.endsWith(".items")) {
    return { id: newId(), title: "", text: "" };
  }
  if (listPath in EMPTY_ITEM) {
    return EMPTY_ITEM[listPath as SectionKey]();
  }
  return null;
};

export const addCustomSection = (cv: CV, section: CustomSection): CV => ({
  ...cv,
  custom: [...cv.custom, section],
  sectionOrder: [...cv.sectionOrder, customKey(section.id)],
});

export const removeCustomSection = (cv: CV, key: CustomKey): CV => ({
  ...cv,
  custom: cv.custom.filter((s) => customKey(s.id) !== key),
  sectionOrder: cv.sectionOrder.filter((k) => k !== key),
});
