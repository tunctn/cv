import {
  Moon02Icon,
  Sun03Icon,
  SunMoonIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useEffect, useState } from "react";
import { Icon, type IconSvgElement } from "#/components/icon";

import { applyTheme, THEME_KEY, type Theme } from "#/lib/theme";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

const OPTIONS: { value: Theme; label: () => string; icon: IconSvgElement }[] = [
  { value: "system", label: m.theme_system, icon: SunMoonIcon },
  { value: "light", label: m.theme_light, icon: Sun03Icon },
  { value: "dark", label: m.theme_dark, icon: Moon02Icon },
];

/** Segmented system / light / dark switch, remembered per browser. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      setTheme((localStorage.getItem(THEME_KEY) as Theme | null) ?? "light");
    } catch {
      // Storage unavailable: stay on system.
    }
  }, []);

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
    setTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // Not persisted; still applied for this visit.
    }
  }, []);

  return (
    <div
      aria-label={m.theme_label()}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border bg-background p-1",
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
}

function ThemeOption({
  option,
  active,
  onPick,
}: {
  option: (typeof OPTIONS)[number];
  active: boolean;
  onPick: (t: Theme) => void;
}) {
  const pick = useCallback(() => onPick(option.value), [onPick, option.value]);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a segmented control; buttons with radio semantics, not native radio inputs
    <button
      aria-checked={active}
      aria-label={option.label()}
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors",
        active
          ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-surface-2"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={pick}
      role="radio"
      title={option.label()}
      type="button"
    >
      <Icon className="size-4" icon={option.icon} />
    </button>
  );
}
