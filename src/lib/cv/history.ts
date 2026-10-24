import { newId } from "./schema";

/**
 * Undo history as a timeline of versions with a cursor. Undo and redo move
 * the cursor; a new change drops everything after the cursor and appends.
 *
 * The reducer is pure (no refs, no side effects), so React may call it as
 * often as it likes and the history stays exact.
 */

export type VersionSource = "you" | "ai" | "restore";

export interface Version<D> {
  at: number;
  doc: D;
  id: string;
  label: string;
  source: VersionSource;
}

export interface Timeline<D> {
  /** Index of the version on screen. */
  cursor: number;
  /** Coalescing key of the newest version, if it may still absorb changes. */
  open: { key: string; at: number } | null;
  versions: Version<D>[];
}

export interface CommitMeta {
  /** Changes with the same key in quick succession become one step. */
  group?: string;
  label: string;
  source: VersionSource;
}

export type TimelineAction<D> =
  | {
      type: "commit";
      /** Applied to the version on screen, inside the reducer, so several
       * changes in one tick each build on the one before. */
      update: (doc: D) => D;
      describe: (prev: D, next: D) => CommitMeta;
      now: number;
    }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "jump"; index: number }
  | { type: "seal" }
  | { type: "prepend"; versions: Version<D>[] };

/** Typing pauses longer than this start a new step. */
export const TYPING_WINDOW_MS = 1200;

export const createTimeline = <D>(
  versions: Version<D>[],
  cursor = versions.length - 1
): Timeline<D> => ({ versions, cursor, open: null });

// oxlint-disable-next-line complexity -- one case per action, kept together so the rules are easy to audit
export const timelineReducer = <D>(
  state: Timeline<D>,
  action: TimelineAction<D>
): Timeline<D> => {
  switch (action.type) {
    case "commit": {
      const current = state.versions[state.cursor];
      if (!current) {
        return state;
      }
      const doc = action.update(current.doc);
      if (doc === current.doc) {
        return state;
      }
      const meta = action.describe(current.doc, doc);
      const { now } = action;
      const atEnd = state.cursor === state.versions.length - 1;
      const { open } = state;
      const windowMs = meta.group?.startsWith("ai:")
        ? Number.POSITIVE_INFINITY
        : TYPING_WINDOW_MS;
      if (
        atEnd &&
        meta.group &&
        open?.key === meta.group &&
        now - open.at < windowMs
      ) {
        const versions = [...state.versions];
        versions[state.cursor] = { ...current, doc, at: now };
        return { ...state, versions, open: { key: meta.group, at: now } };
      }
      const version: Version<D> = {
        id: newId(),
        doc,
        label: meta.label,
        source: meta.source,
        at: now,
      };
      const versions = [...state.versions.slice(0, state.cursor + 1), version];
      return {
        versions,
        cursor: versions.length - 1,
        open: meta.group ? { key: meta.group, at: now } : null,
      };
    }
    case "undo": {
      return state.cursor > 0
        ? { ...state, cursor: state.cursor - 1, open: null }
        : state;
    }
    case "redo": {
      return state.cursor < state.versions.length - 1
        ? { ...state, cursor: state.cursor + 1, open: null }
        : state;
    }
    case "jump": {
      const index = Math.max(
        0,
        Math.min(state.versions.length - 1, action.index)
      );
      return index === state.cursor
        ? state
        : { ...state, cursor: index, open: null };
    }
    case "seal": {
      return state.open ? { ...state, open: null } : state;
    }
    case "prepend": {
      const known = new Set(state.versions.map((v) => v.id));
      const older = action.versions.filter((v) => !known.has(v.id));
      return older.length === 0
        ? state
        : {
            ...state,
            versions: [...older, ...state.versions],
            cursor: state.cursor + older.length,
          };
    }
    default: {
      return state;
    }
  }
};

export const changedPaths = (
  a: unknown,
  b: unknown,
  limit = 8,
  prefix = ""
): string[] => {
  if (a === b) {
    return [];
  }
  const objA = a !== null && typeof a === "object";
  const objB = b !== null && typeof b === "object";
  if (!(objA && objB) || Array.isArray(a) !== Array.isArray(b)) {
    return [prefix];
  }
  if (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length !== b.length &&
    prefix !== ""
  ) {
    return [prefix];
  }
  const out: string[] = [];
  const keys = new Set([
    ...Object.keys(a as object),
    ...Object.keys(b as object),
  ]);
  for (const k of keys) {
    const sub = changedPaths(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
      limit - out.length,
      prefix ? `${prefix}.${k}` : k
    );
    out.push(...sub);
    if (out.length >= limit) {
      break;
    }
  }
  return out;
};

const valueAt = (root: unknown, path: string): unknown => {
  let cur = root;
  for (const k of path.split(".")) {
    if (cur === null || typeof cur !== "object") {
      return;
    }
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
};

const isLeaf = (v: unknown) => v === undefined || typeof v !== "object";

export const editGroup = (paths: string[], a: unknown, b: unknown) => {
  if (paths.length === 0 || paths.length > 4) {
    return;
  }
  for (const path of paths) {
    const before = valueAt(a, path);
    const after = valueAt(b, path);
    if (!(isLeaf(before) && isLeaf(after))) {
      return;
    }
  }
  return `edit:${paths.toSorted().join(",")}`;
};
