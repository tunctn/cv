import {
  Moon02Icon,
  Sun03Icon,
  SunMoonIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { Icon } from "#/components/icon";
import type { IconSvgElement } from "#/components/icon";
import { applyTheme, THEME_KEY } from "#/lib/theme";
import type { Theme } from "#/lib/theme";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

const OPTIONS: { value: Theme; label: () => string; icon: IconSvgElement }[] = [
  { value: "system", label: m.theme_system, icon: SunMoonIcon },
  { value: "light", label: m.theme_light, icon: Sun03Icon },
  { value: "dark", label: m.theme_dark, icon: Moon02Icon },
];

// The picked theme: kept in memory too, so a pick still applies for this visit
// when storage is unavailable.
let picked: Theme | null = null;
const listeners = new Set<() => void>();

const subscribeTheme = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const storedTheme = (): Theme => {
  if (picked) {
    return picked;
  }
  try {
    return (localStorage.getItem(THEME_KEY) as Theme | null) ?? "light";
  } catch {
    // Storage unavailable: stay on light.
    return "light";
  }
};

const serverTheme = (): Theme => "light";

const ThemeOption = ({
  option,
  active,
  onPick,
}: {
  option: (typeof OPTIONS)[number];
  active: boolean;
  onPick: (t: Theme) => void;
}) => {
  const pick = useCallback(() => onPick(option.value), [onPick, option.value]);
  return (
    <button
      aria-checked={active}
      aria-label={option.label()}
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors",
        active
          ? "bg-surface text-foreground dark:bg-surface-2 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={pick}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a segmented control; buttons with radio semantics, not native radio inputs
      role="radio"
      title={option.label()}
      type="button"
    >
      <Icon className="size-4" icon={option.icon} />
    </button>
  );
};

export const ThemeSwitcher = ({ className }: { className?: string }) => {
  const theme = useSyncExternalStore(subscribeTheme, storedTheme, serverTheme);

  // Follow the OS while on "system".
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const pick = useCallback((t: Theme) => {
    picked = t;
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // Not persisted; still applied for this visit.
    }
    for (const onChange of listeners) {
      onChange();
    }
  }, []);

  return (
    <div
      aria-label={m.theme_label()}
      className={cn(
        "bg-background inline-flex items-center gap-0.5 rounded-full border p-1",
        className
      )}
      role="radiogroup"
    >
      {OPTIONS.map((o) => (
        <ThemeOption
          active={theme === o.value}
          key={o.value}
          onPick={pick}
          option={o}
        />
      ))}
    </div>
  );
};
