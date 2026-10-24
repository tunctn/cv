import {
  ArrowDown01Icon,
  Globe02Icon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback } from "react";

import { Icon } from "#/components/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { ENGLISH_NAMES, LANGUAGE_NAMES } from "#/lib/i18n";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale, locales, setLocale } from "#/paraglide/runtime.js";
import type { Locale } from "#/paraglide/runtime.js";

const LanguageOption = ({
  locale,
  active,
  onPick,
}: {
  locale: Locale;
  active: boolean;
  onPick: (locale: Locale) => void;
}) => {
  const pick = useCallback(() => {
    if (!active) {
      onPick(locale);
    }
  }, [active, locale, onPick]);
  return (
    <li>
      <button
        aria-current={active ? "true" : undefined}
        className={cn(
          "hover:bg-accent focus-visible:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2 text-start transition-colors outline-none",
          active && "bg-accent"
        )}
        onClick={pick}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span
            className="text-foreground block truncate text-sm font-medium"
            lang={locale}
          >
            {LANGUAGE_NAMES[locale]}
          </span>
          <span className="text-muted-foreground block truncate text-[12px]">
            {ENGLISH_NAMES[locale]}
          </span>
        </span>
        {active ? (
          <Icon className="text-foreground size-4 shrink-0" icon={Tick02Icon} />
        ) : null}
      </button>
    </li>
  );
};

export const LanguageGrid = ({
  current,
  onPick,
}: {
  current: Locale;
  onPick: (locale: Locale) => void;
}) => (
  <ul className="grid grid-cols-2 gap-0.5">
    {locales.map((locale) => (
      <LanguageOption
        active={locale === current}
        key={locale}
        locale={locale}
        onPick={onPick}
      />
    ))}
  </ul>
);

export const LanguageSelect = ({ className }: { className?: string }) => {
  const current = getLocale();
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            aria-label={m.language_current({
              language: LANGUAGE_NAMES[current],
            })}
            className={cn(
              "bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 data-popup-open:text-foreground inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-full border ps-3 pe-2.5 text-sm transition-colors outline-none focus-visible:ring-3",
              className
            )}
            type="button"
          >
            <Icon className="size-4" icon={Globe02Icon} />
            {LANGUAGE_NAMES[current]}
            <Icon className="size-3.5" icon={ArrowDown01Icon} />
          </button>
        }
      />
      <PopoverContent
        align="end"
        aria-label={m.language_label()}
        className="max-h-(--available-height) w-[min(400px,calc(100vw-32px))] [scrollbar-width:thin] gap-0 overflow-y-auto p-1.5"
        side="top"
        sideOffset={8}
      >
        <LanguageGrid current={current} onPick={setLocale} />
      </PopoverContent>
    </Popover>
  );
};
