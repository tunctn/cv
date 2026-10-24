import {
  AiChat02Icon,
  ArrowLeft02Icon,
  DashboardSquare01Icon,
  Files02Icon,
  Search01Icon,
  UserMultiple02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { Icon } from "#/components/icon";
import type { IconSvgElement } from "#/components/icon";
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

export const AdminShell = ({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) => (
  <div className="rr-block bg-surface min-h-dvh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
    <aside className="bg-background/90 sticky top-0 z-20 flex flex-col gap-1 border-b px-3 py-3 backdrop-blur md:h-dvh md:border-e md:border-b-0 md:px-3 md:py-4">
      <div className="flex items-center justify-between gap-2 px-2 md:mb-5">
        <Link className="flex items-center gap-2" to="/">
          <Logo />
        </Link>
        <span className="bg-foreground/[0.06] text-muted-foreground rounded-full px-2 py-0.5 text-[11.5px] font-medium">
          {m.admin_badge()}
        </span>
      </div>
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
        {NAV.map((item) => (
          <Link
            activeOptions={{ exact: item.exact }}
            className="text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground data-[status=active]:bg-foreground/[0.06] data-[status=active]:text-foreground flex shrink-0 items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[14px] transition-colors data-[status=active]:font-medium"
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
          className="text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[14px] transition-colors"
          to="/cvs"
        >
          <Icon className="size-[18px]" icon={ArrowLeft02Icon} />
          {m.admin_back_to_app()}
        </Link>
        <p className="text-muted-foreground truncate px-2.5 pt-2 text-[12px]">
          {email}
        </p>
      </div>
    </aside>
    <main className="min-w-0 px-4 pt-6 pb-24 sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </main>
  </div>
);

export const PageTitle = ({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <h1 className="text-[24px] font-semibold tracking-[-0.025em]">{title}</h1>
      {description ? (
        <p className="text-muted-foreground mt-1 text-[14px]">{description}</p>
      ) : null}
    </div>
    {children ? (
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    ) : null}
  </div>
);

export const Stat = ({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-background ring-foreground/[0.07] flex min-w-0 flex-col gap-1 rounded-[16px] p-4 ring-1",
      className
    )}
  >
    <span className="text-muted-foreground text-[13px]">{label}</span>
    <span className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums">
      {value}
    </span>
    {hint ? (
      <span className="text-muted-foreground truncate text-[12.5px]">
        {hint}
      </span>
    ) : null}
  </div>
);

export const Panel = ({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "bg-background ring-foreground/[0.07] min-w-0 overflow-hidden rounded-[16px] ring-1",
      className
    )}
  >
    {title ? (
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {action}
      </div>
    ) : null}
    {children}
  </section>
);

export const Table = ({
  head,
  children,
  empty,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: boolean;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
      <thead>
        <tr className="text-muted-foreground border-b text-start text-[12.5px]">
          {head.map((h, i) => (
            <th
              className="px-4 py-2.5 text-start font-medium whitespace-nowrap"
              // oxlint-disable-next-line react/no-array-index-key -- static header cells
              key={i}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&>tr]:border-b [&>tr:last-child]:border-b-0">
        {children}
      </tbody>
    </table>
    {empty ? (
      <p className="text-muted-foreground px-4 py-10 text-center text-[13.5px]">
        {m.admin_empty()}
      </p>
    ) : null}
  </div>
);

export const Td = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <td className={cn("px-4 py-2.5 align-middle whitespace-nowrap", className)}>
    {children}
  </td>
);

export const SearchBox = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => {
  const [text, setText] = useState(value);
  // Take over a new value from outside (adjusting state while rendering).
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value);
  }
  const onInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
    []
  );
  useEffect(() => {
    if (text === value) {
      return;
    }
    const t = setTimeout(() => onChange(text), 300);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <label className="bg-background ring-foreground/[0.1] focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-full px-3 ring-1 focus-within:ring-2 sm:w-[300px]">
      <Icon className="text-muted-foreground size-4" icon={Search01Icon} />
      <input
        aria-label={placeholder}
        className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[14px] outline-none"
        onChange={onInput}
        placeholder={placeholder}
        type="search"
        value={text}
      />
    </label>
  );
};

export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => {
  const pick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) =>
      onChange(e.currentTarget.dataset.value as T),
    [onChange]
  );
  return (
    <div className="bg-foreground/[0.05] inline-flex rounded-full p-0.5">
      {options.map((o) => (
        <button
          aria-pressed={o.value === value}
          className="text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground h-8 cursor-pointer rounded-full px-3 text-[13px] transition-colors aria-pressed:font-medium aria-pressed:shadow-sm"
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
};

export const Tag = ({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "danger" | "good" | "warn";
}) => (
  <span
    className={cn(
      "inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-medium",
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

export const UserAvatar = ({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) =>
  image ? (
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
        "bg-foreground/[0.07] text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium",
        className
      )}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );

// Formatting ---------------------------------------------------------------

export const fmtUsd = (v: number) => {
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
};

export const fmtInt = (v: number) =>
  new Intl.NumberFormat(getLocale()).format(v);

export const Pager = ({
  page,
  hasMore,
  total,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  total: number;
  onPage: (p: number) => void;
}) => {
  const prev = useCallback(() => onPage(page - 1), [onPage, page]);
  const next = useCallback(() => onPage(page + 1), [onPage, page]);
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-3 border-t px-4 py-2.5 text-[13px]">
      <span>{m.admin_total({ count: fmtInt(total) })}</span>
      <span className="flex gap-1">
        <button
          className="hover:bg-foreground/[0.05] h-7 cursor-pointer rounded-full px-3 disabled:cursor-default disabled:opacity-40"
          disabled={page === 0}
          onClick={prev}
          type="button"
        >
          {m.admin_prev()}
        </button>
        <button
          className="hover:bg-foreground/[0.05] h-7 cursor-pointer rounded-full px-3 disabled:cursor-default disabled:opacity-40"
          disabled={!hasMore}
          onClick={next}
          type="button"
        >
          {m.admin_next()}
        </button>
      </span>
    </div>
  );
};

export const fmtCompact = (v: number) =>
  new Intl.NumberFormat(getLocale(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

export const fmtBytes = (v: number) => {
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
};

export const fmtDate = (iso: string | null | undefined) => {
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
};

export const fmtAgo = (iso: string | null | undefined) => {
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
};

export const fmtDuration = (ms: number) =>
  ms < 1000
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
