import {
  AiChat02Icon,
  ArrowLeft02Icon,
  DashboardSquare01Icon,
  Files02Icon,
  Search01Icon,
  UserMultiple02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { Link } from "@tanstack/react-router";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import { Icon, type IconSvgElement } from "#/components/icon";
import { Logo } from "#/components/primitives";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

const NAV: {
  to: string;
  label: () => string;
  icon: IconSvgElement;
  exact?: boolean;
}[] = [
  {
    to: "/admin",
    label: m.admin_nav_overview,
    icon: DashboardSquare01Icon,
    exact: true,
  },
  { to: "/admin/users", label: m.admin_nav_users, icon: UserMultiple02Icon },
  { to: "/admin/files", label: m.admin_nav_files, icon: Files02Icon },
  { to: "/admin/usage", label: m.admin_nav_usage, icon: AiChat02Icon },
];

/**
 * Sidebar + content. The whole area is excluded from session replays
 * (rr-block) and from analytics (src/lib/track.ts).
 */
export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  return (
    <div className="rr-block min-h-dvh bg-surface md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 flex flex-col gap-1 border-b bg-background/90 px-3 py-3 backdrop-blur md:h-dvh md:border-e md:border-b-0 md:px-3 md:py-4">
        <div className="flex items-center justify-between gap-2 px-2 md:mb-5">
          <Link className="flex items-center gap-2" to="/">
            <Logo />
          </Link>
          <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 font-medium text-[11.5px] text-muted-foreground">
            {m.admin_badge()}
          </span>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
          {NAV.map((item) => (
            <Link
              activeOptions={{ exact: item.exact }}
              className="flex shrink-0 items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground data-[status=active]:bg-foreground/[0.06] data-[status=active]:font-medium data-[status=active]:text-foreground"
              key={item.to}
              to={item.to}
            >
              <Icon className="size-[18px]" icon={item.icon} />
              {item.label()}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-1 md:flex">
          <Link
            className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
            to="/cvs"
          >
            <Icon className="size-[18px]" icon={ArrowLeft02Icon} />
            {m.admin_back_to_app()}
          </Link>
          <p className="truncate px-2.5 pt-2 text-[12px] text-muted-foreground">
            {email}
          </p>
        </div>
      </aside>
      <main className="min-w-0 px-4 pt-6 pb-24 sm:px-8 sm:pt-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-semibold text-[24px] tracking-[-0.025em]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-[14px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-[16px] bg-background p-4 ring-1 ring-foreground/[0.07]",
        className
      )}
    >
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="font-semibold text-[24px] tabular-nums tracking-[-0.02em]">
        {value}
      </span>
      {hint ? (
        <span className="truncate text-[12.5px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[16px] bg-background ring-1 ring-foreground/[0.07]",
        className
      )}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="font-semibold text-[14px]">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A horizontally scrollable table inside a panel. */
export function Table({
  head,
  children,
  empty,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b text-start text-[12.5px] text-muted-foreground">
            {head.map((h, i) => (
              <th
                className="whitespace-nowrap px-4 py-2.5 text-start font-medium"
                // biome-ignore lint/suspicious/noArrayIndexKey: static header cells
                key={i}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child]:border-b-0 [&>tr]:border-b">
          {children}
        </tbody>
      </table>
      {empty ? (
        <p className="px-4 py-10 text-center text-[13.5px] text-muted-foreground">
          {m.admin_empty()}
        </p>
      ) : null}
    </div>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("whitespace-nowrap px-4 py-2.5 align-middle", className)}>
      {children}
    </td>
  );
}

/** Search box that reports its value after a short pause. */
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value);
  const onInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    []
  );
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) {
      return;
    }
    const t = setTimeout(() => onChange(text), 300);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <label className="flex h-9 w-full items-center gap-2 rounded-full bg-background px-3 ring-1 ring-foreground/[0.1] focus-within:ring-2 focus-within:ring-ring/50 sm:w-[300px]">
      <Icon className="size-4 text-muted-foreground" icon={Search01Icon} />
      <input
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
        onChange={onInput}
        placeholder={placeholder}
        type="search"
        value={text}
      />
    </label>
  );
}

/** Pill tabs for a filter. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const pick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) =>
      onChange(e.currentTarget.dataset.value as T),
    [onChange]
  );
  return (
    <div className="inline-flex rounded-full bg-foreground/[0.05] p-0.5">
      {options.map((o) => (
        <button
          aria-pressed={o.value === value}
          className="h-8 cursor-pointer rounded-full px-3 text-[13px] text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm"
          data-value={o.value}
          key={o.value}
          onClick={pick}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pager({
  page,
  hasMore,
  total,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  total: number;
  onPage: (p: number) => void;
}) {
  const prev = useCallback(() => onPage(page - 1), [onPage, page]);
  const next = useCallback(() => onPage(page + 1), [onPage, page]);
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-[13px] text-muted-foreground">
      <span>{m.admin_total({ count: fmtInt(total) })}</span>
      <span className="flex gap-1">
        <button
          className="h-7 cursor-pointer rounded-full px-3 hover:bg-foreground/[0.05] disabled:cursor-default disabled:opacity-40"
          disabled={page === 0}
          onClick={prev}
          type="button"
        >
          {m.admin_prev()}
        </button>
        <button
          className="h-7 cursor-pointer rounded-full px-3 hover:bg-foreground/[0.05] disabled:cursor-default disabled:opacity-40"
          disabled={!hasMore}
          onClick={next}
          type="button"
        >
          {m.admin_next()}
        </button>
      </span>
    </div>
  );
}

export function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "danger" | "good" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 font-medium text-[11.5px]",
        tone === "muted" && "bg-foreground/[0.06] text-muted-foreground",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "good" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      )}
    >
      {children}
    </span>
  );
}

/** The user's avatar or their initial. */
export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  return image ? (
    <img
      alt=""
      className={cn("size-7 shrink-0 rounded-full object-cover", className)}
      height={28}
      src={image}
      width={28}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] font-medium text-[12px] text-muted-foreground",
        className
      )}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

// Formatting ---------------------------------------------------------------

export function fmtUsd(v: number) {
  const abs = Math.abs(v);
  let digits = 2;
  if (abs > 0 && abs < 0.01) {
    digits = 6;
  } else if (abs > 0 && abs < 1) {
    digits = 4;
  }
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(v);
}

export function fmtInt(v: number) {
  return new Intl.NumberFormat(getLocale()).format(v);
}

export function fmtCompact(v: number) {
  return new Intl.NumberFormat(getLocale(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

export function fmtBytes(v: number) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let i = 0;
  let n = v;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return new Intl.NumberFormat(getLocale(), {
    style: "unit",
    unit: units[i],
    unitDisplay: "short",
    maximumFractionDigits: i === 0 ? 0 : 1,
  }).format(n);
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) {
    return "–";
  }
  return new Date(iso).toLocaleString(getLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 hours ago" style. */
export function fmtAgo(iso: string | null | undefined) {
  if (!iso) {
    return "–";
  }
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 30],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];
  let value = diff;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) {
      return rtf.format(Math.round(value), unit);
    }
    value /= size;
  }
  return "–";
}

export function fmtDuration(ms: number) {
  return ms < 1000
    ? new Intl.NumberFormat(getLocale(), {
        style: "unit",
        unit: "millisecond",
        unitDisplay: "narrow",
      }).format(ms)
    : new Intl.NumberFormat(getLocale(), {
        style: "unit",
        unit: "second",
        unitDisplay: "narrow",
        maximumFractionDigits: 1,
      }).format(ms / 1000);
}
