import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  type CommitMeta,
  changedPaths,
  createTimeline,
  editGroup,
  type Timeline,
  type TimelineAction,
  timelineReducer,
  type Version,
} from "#/lib/cv/history";
import { type CV, newId } from "#/lib/cv/schema";
import type { TemplateId } from "#/lib/cv/templates";
import {
  listVersions,
  type StoredVersion,
  saveVersion,
} from "#/lib/cv/versions";

import { m } from "#/paraglide/messages.js";
import { describeChange } from "./history-label";

export interface Doc {
  cv: CV;
  template: TemplateId;
}

/** How long after the last change a version is written to the database. */
const PERSIST_MS = 900;

function fromStored(v: StoredVersion): Version<Doc> {
  return {
    id: v.id,
    at: v.at,
    label: v.label,
    source: v.source,
    doc: { cv: v.cv, template: v.template as TemplateId },
  };
}

function sameDoc(a: Doc, b: Doc) {
  return (
    a.template === b.template && JSON.stringify(a.cv) === JSON.stringify(b.cv)
  );
}

/**
 * Versions from the database and where the CV on screen sits among them.
 * After an undo the newest versions are "ahead" (redo); reloading keeps
 * that, so undo/redo behave exactly as before the reload.
 */
function seed(
  current: Doc,
  stored: StoredVersion[]
): { versions: Version<Doc>[]; cursor: number } {
  const versions = stored.map(fromStored);
  if (versions.length === 0) {
    return {
      cursor: 0,
      versions: [
        {
          id: newId(),
          at: Date.now(),
          label: m.hist_original(),
          source: "you",
          doc: current,
        },
      ],
    };
  }
  let same = versions.length - 1;
  while (same >= 0 && !sameDoc(versions[same].doc, current)) {
    same -= 1;
  }
  if (same !== -1) {
    // Show the database copy as the one on screen.
    versions[same] = { ...versions[same], doc: current };
    return { versions, cursor: same };
  }
  const last = versions.at(-1) as Version<Doc>;
  versions.push({
    id: newId(),
    at: Date.now(),
    label: describeChange(last.doc, current, changedPaths(last.doc, current)),
    source: "you",
    doc: current,
  });
  return { versions, cursor: versions.length - 1 };
}

function describeEdit(prev: Doc, next: Doc): CommitMeta {
  const paths = changedPaths(prev, next);
  return {
    label: describeChange(prev, next, paths),
    source: "you",
    group: editGroup(paths, prev, next),
  };
}

/**
 * The editor's document with undo/redo over a timeline that is also stored
 * in Postgres, so history survives reloads and shows in the History tab.
 */
export function useHistory(
  cvId: string,
  initial: Doc,
  stored: StoredVersion[],
  moreStored: boolean
) {
  const [timeline, dispatch] = useReducer(
    timelineReducer as (
      s: Timeline<Doc>,
      a: TimelineAction<Doc>
    ) => Timeline<Doc>,
    null,
    () => {
      const { versions, cursor } = seed(initial, stored);
      return createTimeline(versions, cursor);
    }
  );
  const current = timeline.versions[timeline.cursor];
  const { doc } = current;

  const commit = useCallback(
    (
      update: (d: Doc) => Doc,
      meta?: Omit<CommitMeta, "source"> & {
        source?: CommitMeta["source"];
      }
    ) =>
      dispatch({
        type: "commit",
        update,
        now: Date.now(),
        describe: meta
          ? (prev, next) => ({
              label: meta.label || describeEdit(prev, next).label,
              group: meta.group,
              source: meta.source ?? "you",
            })
          : describeEdit,
      }),
    []
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const jump = useCallback(
    (index: number) => dispatch({ type: "jump", index }),
    []
  );
  /** Ends the current typing/AI step, so the next change starts a new one. */
  const seal = useCallback(() => dispatch({ type: "seal" }), []);

  // Write versions whose content changed since they were last saved.
  // Versions loaded from the database count as saved.
  const [saved] = useState(() => {
    const ids = new Set(stored.map((v) => v.id));
    return new Map(
      timeline.versions.filter((v) => ids.has(v.id)).map((v) => [v.id, v.doc])
    );
  });
  const pending = useRef<Version<Doc>[]>([]);
  pending.current = timeline.versions.filter((v) => saved.get(v.id) !== v.doc);
  const persist = useCallback(async () => {
    for (const v of pending.current) {
      const docAtSend = v.doc;
      try {
        // One at a time and in order, so an older version never lands last.
        // biome-ignore lint/performance/noAwaitInLoops: sequential on purpose
        await saveVersion({
          data: {
            cvId,
            id: v.id,
            at: v.at,
            label: v.label,
            source: v.source,
            template: v.doc.template,
            data: v.doc.cv,
          },
        });
        saved.set(v.id, docAtSend);
      } catch {
        // Kept pending; the next change retries.
      }
    }
  }, [cvId, saved]);
  const versionsKey = timeline.versions
    .map((v) => `${v.id}:${saved.get(v.id) === v.doc ? 1 : 0}`)
    .join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when any version's content changes
  useEffect(() => {
    if (pending.current.length === 0) {
      return;
    }
    const t = setTimeout(persist, PERSIST_MS);
    return () => clearTimeout(t);
  }, [versionsKey, persist]);

  const hasOlder = useRef(moreStored);
  const loadOlder = useCallback(async () => {
    const [first] = timeline.versions;
    if (!hasOlder.current) {
      return;
    }
    const page = await listVersions({ data: { cvId, before: first.at } });
    hasOlder.current = page.more;
    const older = page.versions.map(fromStored);
    for (const v of older) {
      saved.set(v.id, v.doc);
    }
    dispatch({ type: "prepend", versions: older });
  }, [cvId, saved, timeline.versions]);

  return useMemo(
    () => ({
      doc,
      commit,
      undo,
      redo,
      jump,
      seal,
      persist,
      loadOlder,
      hasOlder: hasOlder.current,
      versions: timeline.versions,
      cursor: timeline.cursor,
      canUndo: timeline.cursor > 0,
      canRedo: timeline.cursor < timeline.versions.length - 1,
    }),
    [doc, commit, undo, redo, jump, seal, persist, loadOlder, timeline]
  );
}
