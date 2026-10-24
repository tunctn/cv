import {
  ArrowTurnBackwardIcon,
  SparklesIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useMemo, useState } from "react";

import { Icon } from "#/components/icon";
import type { IconSvgElement } from "#/components/icon";
import { Button } from "#/components/ui/button";
import type { Version, VersionSource } from "#/lib/cv/history";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

import type { Doc } from "./use-history";

/** You is the default and goes unmarked; AI and restores get a small icon. */
const SOURCE_ICON: Record<VersionSource, IconSvgElement | null> = {
  you: null,
  ai: SparklesIcon,
  restore: ArrowTurnBackwardIcon,
};

// Older AI versions were saved as "AI: <prompt>"; the icon says that now.
const AI_PREFIX = /^AI:\s*/u;

const LEADING_DOT = /^\s*·\s*/u;

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

const DAY_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
};

const dayLabel = (at: number) => {
  const d = new Date(at);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return m.hist_today();
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return m.hist_yesterday();
  }
  return d.toLocaleDateString(getLocale(), DAY_OPTIONS);
};

/** Same-kind changes closer together than this fold into one row. */
const RUN_MS = 5 * 60 * 1000;

interface Row {
  count: number;
  index: number;
  oldestAt: number;
  v: Version<Doc>;
}

const VersionRow = ({
  version,
  index,
  count,
  current,
  undone,
  onJump,
}: {
  version: Version<Doc>;
  index: number;
  count: number;
  current: boolean;
  undone: boolean;
  onJump: (index: number) => void;
}) => {
  const jump = useCallback(() => onJump(index), [index, onJump]);
  const ai = version.source === "ai";
  const label = ai ? version.label.replace(AI_PREFIX, "") : version.label;
  // An AI version is named after what was asked: quote it.
  const text = ai && label !== m.ed_ai_edit() ? `\u201C${label}\u201D` : label;
  const sourceIcon = SOURCE_ICON[version.source];
  return (
    <li>
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by its text (time, state and description), nested deeper than the rule looks */}
      <button
        aria-current={current ? "step" : undefined}
        className={cn(
          "group/row focus-visible:bg-surface relative flex w-full items-start gap-3 rounded-[10px] py-2 pr-3 pl-[13px] text-left transition-colors outline-none",
          current ? "bg-surface" : "hover:bg-surface/60"
        )}
        onClick={jump}
        type="button"
      >
        <span className="relative z-[1] flex h-5 w-[11px] shrink-0 items-center justify-center">
          <span
            className={cn(
              "size-[9px] rounded-full transition-colors",
              current
                ? "bg-foreground ring-surface ring-[3px]"
                : "bg-background ring-foreground/30 group-hover/row:ring-foreground/60 ring-[1.5px]",
              undone && "ring-foreground/20 bg-transparent"
            )}
          />
        </span>
        <span
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-0.5",
            undone && "opacity-50"
          )}
        >
          <span className="flex items-baseline gap-1.5 text-[13px] leading-5">
            <span className="font-medium tabular-nums">
              {new Date(version.at).toLocaleTimeString(
                getLocale(),
                TIME_OPTIONS
              )}
            </span>
            {current ? (
              <span className="text-muted-foreground text-[12px]">
                {m.hist_now()}
              </span>
            ) : null}
            {undone ? (
              <span className="text-muted-foreground text-[12px]">
                {m.hist_undone().replace(LEADING_DOT, "")}
              </span>
            ) : null}
            {count > 1 ? (
              <span className="text-muted-foreground ml-auto text-[11px] tabular-nums">
                ×{count}
              </span>
            ) : null}
          </span>
          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[12px]">
            {sourceIcon ? (
              <Icon className="size-3 shrink-0" icon={sourceIcon} />
            ) : null}
            <span className="truncate">{text}</span>
          </span>
        </span>
      </button>
    </li>
  );
};

/** Runs `load` with the loading flag on, and turns it off however it ends. */
const whileLoading = async (
  setLoading: (loading: boolean) => void,
  load: () => Promise<void>
) => {
  setLoading(true);
  try {
    await load();
  } finally {
    setLoading(false);
  }
};

export const HistoryPanel = ({
  versions,
  cursor,
  onJump,
  hasOlder,
  onLoadOlder,
}: {
  versions: Version<Doc>[];
  cursor: number;
  onJump: (index: number) => void;
  hasOlder: boolean;
  onLoadOlder: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  // Runs of the same kind of change (e.g. many slider moves) show as one
  // row; it points at the run's newest version, or at the
  // current one if the current version is inside the run.
  const groups = useMemo(() => {
    const out: { day: string; rows: Row[] }[] = [];
    for (let i = versions.length - 1; i >= 0; i -= 1) {
      const v = versions[i];
      const day = dayLabel(v.at);
      let group = out.at(-1);
      if (group?.day !== day) {
        group = { day, rows: [] };
        out.push(group);
      }
      const prev = group.rows.at(-1);
      if (
        prev &&
        prev.v.label === v.label &&
        prev.v.source === v.source &&
        prev.oldestAt - v.at < RUN_MS
      ) {
        prev.count += 1;
        prev.oldestAt = v.at;
        if (i === cursor) {
          prev.v = v;
          prev.index = i;
        }
      } else {
        group.rows.push({ v, index: i, count: 1, oldestAt: v.at });
      }
    }
    return out;
  }, [versions, cursor]);

  const loadOlder = useCallback(
    () => whileLoading(setLoading, onLoadOlder),
    [onLoadOlder]
  );

  return (
    <div className="scroll-fade-y h-full scrollbar-thin overflow-y-auto overscroll-contain px-2 py-3">
      {groups.map((g) => (
        <section className="mb-2" key={g.day}>
          <h3 className="text-muted-foreground px-3 pt-1 pb-1 text-[12px] font-medium">
            {g.day}
          </h3>
          <ol className="relative flex flex-col">
            {/* The rail: one hairline behind every dot of the day. */}
            <span
              aria-hidden
              className="bg-foreground/[0.09] absolute top-5 bottom-5 left-[18px] w-px"
            />
            {g.rows.map(({ v, index, count }) => (
              <VersionRow
                count={count}
                current={index === cursor}
                index={index}
                key={v.id}
                onJump={onJump}
                undone={index > cursor}
                version={v}
              />
            ))}
          </ol>
        </section>
      ))}
      {hasOlder ? (
        <div className="px-1 pb-2">
          <Button
            className="text-muted-foreground w-full"
            disabled={loading}
            onClick={loadOlder}
            size="sm"
            variant="ghost"
          >
            {loading ? m.common_loading() : m.hist_show_older()}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
