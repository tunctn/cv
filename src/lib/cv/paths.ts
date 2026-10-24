import {
  type CustomKey,
  type CustomSection,
  type CV,
  customKey,
  EMPTY_ITEM,
  emptyCustomItem,
  emptyCustomSection,
  newId,
  type SectionKey,
} from "./schema";

/**
 * Dot paths into a CV, e.g. "basics.summary", "experience.2.highlights.0",
 * "skills.1.items.3.text". Numeric segments index arrays.
 */
export type Path = string;

const NUMERIC = /^\d+$/;
const CUSTOM_ITEMS = /^custom\.\d+\.items$/;

function segments(path: Path) {
  return path.split(".").map((s) => (NUMERIC.test(s) ? Number(s) : s));
}

export function getIn(cv: CV, path: Path): unknown {
  let cur: unknown = cv;
  for (const seg of segments(path)) {
    if (cur === null || cur === undefined) {
      return undefined;
    }
    cur = (cur as Record<string | number, unknown>)[seg];
  }
  return cur;
}

/** Returns a copy of `cv` with `value` written at `path` (structural sharing elsewhere). */
export function setIn(cv: CV, path: Path, value: unknown): CV {
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
}

function updateList(
  cv: CV,
  listPath: Path,
  fn: (list: unknown[]) => unknown[]
): CV {
  const list = getIn(cv, listPath);
  return Array.isArray(list) ? setIn(cv, listPath, fn(list)) : cv;
}

export function moveIn(cv: CV, listPath: Path, from: number, to: number) {
  return updateList(cv, listPath, (list) => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
    return next;
  });
}

export function removeAt(cv: CV, listPath: Path, index: number) {
  return updateList(cv, listPath, (list) => list.filter((_, i) => i !== index));
}

export function insertAt(cv: CV, listPath: Path, index: number, item: unknown) {
  return updateList(cv, listPath, (list) => {
    const next = [...list];
    next.splice(index, 0, item);
    return next;
  });
}

/** Deep copy with fresh ids so React keys and AI references stay unique. */
function cloneWithIds<T>(value: T): T {
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
}

export function duplicateAt(cv: CV, listPath: Path, index: number) {
  return updateList(cv, listPath, (list) => {
    const next = [...list];
    next.splice(index + 1, 0, cloneWithIds(list[index]));
    return next;
  });
}

/** Splits "experience.2" into its list ("experience") and index (2). */
export function splitIndex(path: Path): { list: Path; index: number } | null {
  const i = path.lastIndexOf(".");
  const last = path.slice(i + 1);
  if (i === -1 || !NUMERIC.test(last)) {
    return null;
  }
  return { list: path.slice(0, i), index: Number(last) };
}

/** A blank item for whatever kind of list `listPath` points at. */
export function blankFor(listPath: Path): unknown {
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
}

/** Appends a custom section to the end of the CV (after the other sections). */
export function addCustomSection(cv: CV, section: CustomSection): CV {
  return {
    ...cv,
    custom: [...cv.custom, section],
    sectionOrder: [...cv.sectionOrder, customKey(section.id)],
  };
}

/** Removes a custom section and its place in the section order. */
export function removeCustomSection(cv: CV, key: CustomKey): CV {
  return {
    ...cv,
    custom: cv.custom.filter((s) => customKey(s.id) !== key),
    sectionOrder: cv.sectionOrder.filter((k) => k !== key),
  };
}
