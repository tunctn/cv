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
import {
  getLocale,
  type Locale,
  locales,
  setLocale,
} from "#/paraglide/runtime.js";

/**
 * Language picker for the footer: a non-modal popover with a two-column grid,
 * each language in its own name. Picking one stores it in the
 * PARAGLIDE_LOCALE cookie and reloads, so the server renders the new language.
 */
export function LanguageSelect({ className }: { className?: string }) {
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
              "inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-full border bg-background ps-3 pe-2.5 text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground",
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
        className="max-h-(--available-height) w-[min(400px,calc(100vw-32px))] gap-0 overflow-y-auto p-1.5 [scrollbar-width:thin]"
        side="top"
        sideOffset={8}
      >
        <LanguageGrid current={current} onPick={setLocale} />
      </PopoverContent>
    </Popover>
  );
}

/** Every language in a two-column grid, each in its own name. */
export function LanguageGrid({
  current,
  onPick,
}: {
  current: Locale;
  onPick: (locale: Locale) => void;
}) {
  return (
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
}

function LanguageOption({
  locale,
  active,
  onPick,
}: {
  locale: Locale;
  active: boolean;
  onPick: (locale: Locale) => void;
}) {
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
          "flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2 text-start outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
          active && "bg-accent"
        )}
        onClick={pick}
        type="button"
      >
        <span className="min-w-0 flex-1">
          <span
            className="block truncate font-medium text-foreground text-sm"
            lang={locale}
          >
            {LANGUAGE_NAMES[locale]}
          </span>
          <span className="block truncate text-[12px] text-muted-foreground">
            {ENGLISH_NAMES[locale]}
          </span>
        </span>
        {active ? (
          <Icon className="size-4 shrink-0 text-foreground" icon={Tick02Icon} />
        ) : null}
      </button>
    </li>
  );
}
