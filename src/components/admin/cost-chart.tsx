import { type PointerEvent, useCallback, useState } from "react";

import { fmtUsd } from "#/components/admin/ui";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export interface CostDay {
  chat: number;
  day: string;
  faq: number;
  requests: number;
  translate: number;
}

const SERIES = [
  { key: "chat", label: m.admin_kind_chat, color: "var(--chart-chat)" },
  {
    key: "translate",
    label: m.admin_kind_translate,
    color: "var(--chart-translate)",
  },
  { key: "faq", label: m.admin_kind_faq, color: "var(--chart-faq)" },
] as const;

function dayLabel(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(getLocale(), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Stacked daily AI cost over the last 30 days, with a hover readout. */
export function CostChart({ days }: { days: CostDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = days.map((x) => x.chat + x.translate + x.faq);
  const max = Math.max(...totals, 0.0001);
  const active = hover ?? days.length - 1;
  const d = days[active];
  const onMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const bar = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    if (bar) {
      setHover(Number(bar.dataset.i));
    }
  }, []);
  const onLeave = useCallback(() => setHover(null), []);
  return (
    <div className="flex flex-col gap-4 p-4 [--chart-chat:oklch(0.55_0.17_265)] [--chart-faq:oklch(0.75_0.13_75)] [--chart-translate:oklch(0.68_0.13_185)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-[20px] tabular-nums">
            {fmtUsd(totals[active] ?? 0)}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {d ? dayLabel(d.day) : ""}
            {d ? ` · ${m.admin_requests_count({ count: d.requests })}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-[12.5px] text-muted-foreground">
          {SERIES.map((s) => (
            <span className="flex items-center gap-1.5" key={s.key}>
              <span
                className="size-2 rounded-[3px]"
                style={{ background: s.color }}
              />
              {s.label()}
              {d ? (
                <span className="text-foreground tabular-nums">
                  {fmtUsd(d[s.key])}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className="flex h-[160px] items-end gap-[3px]"
        onPointerLeave={onLeave}
        onPointerMove={onMove}
      >
        {days.map((day, i) => (
          <div
            className={cn(
              "flex h-full min-w-0 flex-1 cursor-default flex-col justify-end rounded-[4px] transition-colors",
              i === active ? "bg-foreground/[0.05]" : "bg-transparent"
            )}
            data-i={i}
            key={day.day}
          >
            {SERIES.map((s) => {
              const v = day[s.key];
              return v > 0 ? (
                <div
                  className="w-full first:rounded-t-[3px]"
                  key={s.key}
                  style={{
                    height: `${(v / max) * 100}%`,
                    minHeight: 2,
                    background: s.color,
                  }}
                />
              ) : null;
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[12px] text-muted-foreground">
        <span>{days[0] ? dayLabel(days[0].day) : ""}</span>
        <span>{days.at(-1) ? dayLabel(days.at(-1)?.day ?? "") : ""}</span>
      </div>
    </div>
  );
}

/** Daily sign-ups, guests and registered side by side, as a small bar strip. */
export function SignupChart({
  days,
}: {
  days: { day: string; guests: number; registered: number }[];
}) {
  const max = Math.max(...days.map((d) => d.guests + d.registered), 1);
  return (
    <div className="flex flex-col gap-3 p-4 [--chart-guest:oklch(0.8_0.02_265)] [--chart-reg:oklch(0.55_0.17_265)]">
      <div className="flex gap-3 text-[12.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[3px] bg-[var(--chart-reg)]" />
          {m.admin_registered()}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[3px] bg-[var(--chart-guest)]" />
          {m.admin_guests()}
        </span>
      </div>
      <div className="flex h-[96px] items-end gap-[3px]">
        {days.map((d) => (
          <div
            className="flex h-full min-w-0 flex-1 flex-col justify-end"
            key={d.day}
            title={m.admin_signups_tip({
              day: dayLabel(d.day),
              registered: d.registered,
              guests: d.guests,
            })}
          >
            {d.guests > 0 ? (
              <div
                className="w-full rounded-t-[3px] bg-[var(--chart-guest)]"
                style={{ height: `${(d.guests / max) * 100}%`, minHeight: 2 }}
              />
            ) : null}
            {d.registered > 0 ? (
              <div
                className="w-full bg-[var(--chart-reg)] first:rounded-t-[3px]"
                style={{
                  height: `${(d.registered / max) * 100}%`,
                  minHeight: 2,
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
