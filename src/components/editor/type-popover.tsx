import { TextFontIcon, UndoIcon } from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useState } from "react";
import type { KeyboardEvent } from "react";

import { Icon } from "#/components/icon";
import { Button } from "#/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Slider } from "#/components/ui/slider";
import type { TemplateStyle } from "#/lib/cv/engine";
import { FONTS, fontFamily } from "#/lib/cv/fonts";
import type { FontOption } from "#/lib/cv/fonts";
import type { CvStyle } from "#/lib/cv/schema";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

import { ResetField } from "./reset-field";

type OnStyle = (patch: Partial<CvStyle>) => void;

type NumberKey = "fontScale" | "lineHeight" | "letterSpacing" | "headingScale";

/**
 * Each setting is shown in percent: the stored value times `factor`, so a
 * 1.05 text scale reads 105% and 0.01em of letter spacing reads 1%.
 */
interface Range {
  factor: number;
  /** Message functions, called at render so each request gets its locale. */
  label: () => string;
  max: number;
  min: number;
  /** Accessible name, when the visible label repeats in another group. */
  name?: () => string;
  /** In-sentence name for the reset button, e.g. "text size". */
  resetName: () => string;
  step: number;
}

const RANGES: Record<NumberKey, Range> = {
  fontScale: {
    label: m.ed_size,
    name: m.ed_text_size,
    resetName: m.ed_text_size_name,
    min: 80,
    max: 130,
    step: 1,
    factor: 100,
  },
  lineHeight: {
    label: m.ed_line_height,
    resetName: m.ed_line_height_name,
    min: 80,
    max: 150,
    step: 1,
    factor: 100,
  },
  letterSpacing: {
    label: m.ed_spacing,
    resetName: m.ed_spacing_name,
    min: -5,
    max: 10,
    step: 0.5,
    factor: 100,
  },
  headingScale: {
    label: m.ed_size,
    name: m.ed_heading_size,
    resetName: m.ed_heading_size_name,
    min: 70,
    max: 150,
    step: 1,
    factor: 100,
  },
};

const WEIGHTS = [
  { value: 400, name: m.ed_weight_regular },
  { value: 500, name: m.ed_weight_medium },
  { value: 600, name: m.ed_weight_semibold },
  { value: 700, name: m.ed_weight_bold },
];

const RESET: Partial<CvStyle> = {
  fontScale: undefined,
  lineHeight: undefined,
  letterSpacing: undefined,
  headingScale: undefined,
  headingWeight: undefined,
};

const FontTile = ({
  font,
  active,
  onStyle,
}: {
  font: FontOption;
  active: boolean;
  onStyle: OnStyle;
}) => {
  const pick = useCallback(() => onStyle({ font: font.id }), [font, onStyle]);
  return (
    <button
      aria-checked={active}
      className={cn(
        "focus-visible:ring-foreground/20 flex h-[62px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] transition-[background-color,box-shadow] outline-none focus-visible:ring-2",
        active
          ? "bg-background ring-foreground focus-visible:ring-foreground ring-2"
          : "bg-surface hover:bg-surface-2"
      )}
      onClick={pick}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- tiles with radio semantics
      role="radio"
      style={{ fontFamily: fontFamily(font.id) }}
      type="button"
    >
      <span className="text-[20px] leading-none">
        {/* oxlint-disable-next-line i18n/jsx-text -- type specimen, not a word */}
        Aa
      </span>
      <span className="text-muted-foreground max-w-full truncate px-0.5 text-[11px] leading-none">
        {font.name}
      </span>
    </button>
  );
};

const WeightButton = ({
  weight,
  name,
  family,
  active,
  onStyle,
}: {
  weight?: number;
  name?: string;
  family: string;
  active: boolean;
  onStyle: OnStyle;
}) => {
  const pick = useCallback(
    () => onStyle({ headingWeight: weight }),
    [weight, onStyle]
  );
  return (
    <button
      aria-checked={active}
      aria-label={name ?? m.ed_template_default()}
      className={cn(
        "focus-visible:ring-foreground/20 h-7 cursor-pointer rounded-[8px] text-[13px] transition-colors outline-none focus-visible:ring-2",
        active
          ? "bg-background text-foreground ring-foreground/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={pick}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- segmented control with radio semantics
      role="radio"
      style={weight ? { fontFamily: family, fontWeight: weight } : undefined}
      title={name ?? m.ed_template_default()}
      type="button"
    >
      {weight ? "Aa" : m.ed_auto()}
    </button>
  );
};

const round = (n: number) => Math.round(n * 1000) / 1000;

const TypeSlider = ({
  base,
  prop,
  value,
  onStyle,
}: {
  base: number;
  prop: NumberKey;
  value: number;
  onStyle: OnStyle;
}) => {
  const reset = useCallback(
    () => onStyle({ [prop]: undefined }),
    [prop, onStyle]
  );
  const r = RANGES[prop];
  const shown = round(value * r.factor);
  const set = useCallback(
    (display: number) =>
      onStyle({
        [prop]: round(Math.min(r.max, Math.max(r.min, display)) / r.factor),
      }),
    [prop, r, onStyle]
  );
  const onValue = useCallback(
    (v: number | readonly number[]) => set(Array.isArray(v) ? v[0] : v),
    [set]
  );

  // Typed values are kept as a draft and only applied on Enter or blur, so
  // typing "110" doesn't clamp to the minimum after the first digit.
  const [draft, setDraft] = useState<string | null>(null);
  const onInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    []
  );
  const commit = useCallback(() => {
    if (draft !== null && draft.trim() !== "") {
      const n = Number(draft);
      if (Number.isFinite(n)) {
        set(n);
      }
    }
    setDraft(null);
  }, [draft, set]);
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        commit();
      }
    },
    [commit]
  );

  return (
    <div className="grid grid-cols-[96px_1fr_60px] items-center gap-2.5 text-[13px]">
      <span className="text-muted-foreground flex items-center gap-1 whitespace-nowrap">
        {r.label()}
        <ResetField
          label={r.resetName()}
          onReset={reset}
          show={value !== base}
        />
      </span>
      <Slider
        aria-label={(r.name ?? r.label)()}
        max={r.max}
        min={r.min}
        onValueChange={onValue}
        step={r.step}
        value={[shown]}
      />
      <label className="bg-surface text-muted-foreground focus-within:ring-foreground/15 flex h-7 items-center justify-end gap-0.5 rounded-[8px] pr-2 focus-within:ring-2">
        <input
          aria-label={m.ed_in_percent({ name: (r.name ?? r.label)() })}
          className="text-foreground w-8 bg-transparent text-right tabular-nums outline-none"
          inputMode="decimal"
          onBlur={commit}
          onChange={onInput}
          onKeyDown={onKeyDown}
          value={draft ?? String(shown)}
        />
        %
      </label>
    </div>
  );
};

export const TypePopover = ({
  base,
  style,
  onStyle,
}: {
  /** The template's own values, to tell which rows were changed. */
  base: TemplateStyle;
  style: TemplateStyle;
  onStyle: OnStyle;
}) => {
  const font = FONTS.find((f) => f.id === style.font) ?? FONTS[0];
  const reset = useCallback(() => onStyle(RESET), [onStyle]);
  const resetFont = useCallback(() => onStyle({ font: undefined }), [onStyle]);
  const resetWeight = useCallback(
    () => onStyle({ headingWeight: undefined }),
    [onStyle]
  );
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={m.ed_typography_aria({ font: font.name })}
            variant="ghost"
          >
            <Icon data-icon="inline-start" icon={TextFontIcon} />
            <span style={{ fontFamily: font.family }}>{font.name}</span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[340px] gap-0">
        <div className="flex h-6 items-center gap-1">
          <p className="text-[13px] font-medium">{m.ed_font()}</p>
          <ResetField
            label={m.ed_font_name()}
            onReset={resetFont}
            show={style.font !== base.font}
          />
        </div>
        <div
          aria-label={m.ed_font()}
          className="mt-2 grid grid-cols-3 gap-1.5"
          role="radiogroup"
        >
          {FONTS.map((f) => (
            <FontTile
              active={f.id === font.id}
              font={f}
              key={f.id}
              onStyle={onStyle}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[13px] font-medium">{m.ed_text()}</p>
          <button
            className="text-muted-foreground hover:bg-surface hover:text-foreground -mr-1.5 inline-flex h-6 cursor-pointer items-center gap-1 rounded-md px-1.5 text-[12px] transition-colors"
            onClick={reset}
            type="button"
          >
            <Icon className="size-3.5" icon={UndoIcon} /> {m.ed_reset()}
          </button>
        </div>
        <div className="mt-3 grid gap-3.5">
          <TypeSlider
            base={base.fontScale}
            onStyle={onStyle}
            prop="fontScale"
            value={style.fontScale}
          />
          <TypeSlider
            base={base.lineHeight}
            onStyle={onStyle}
            prop="lineHeight"
            value={style.lineHeight}
          />
          <TypeSlider
            base={base.letterSpacing}
            onStyle={onStyle}
            prop="letterSpacing"
            value={style.letterSpacing}
          />
        </div>
        <p className="mt-5 text-[13px] font-medium">{m.ed_headings()}</p>
        <div className="mt-3 grid gap-3.5">
          <TypeSlider
            base={base.headingScale}
            onStyle={onStyle}
            prop="headingScale"
            value={style.headingScale}
          />
          <div className="grid grid-cols-[96px_1fr] items-center gap-2.5 text-[13px]">
            <span className="text-muted-foreground flex items-center gap-1 whitespace-nowrap">
              {m.ed_weight()}
              <ResetField
                label={m.ed_heading_weight_name()}
                onReset={resetWeight}
                show={style.headingWeight !== base.headingWeight}
              />
            </span>
            <div
              aria-label={m.ed_heading_weight()}
              className="bg-surface grid grid-cols-5 gap-0.5 rounded-[10px] p-0.5"
              role="radiogroup"
            >
              <WeightButton
                active={style.headingWeight === undefined}
                family={font.family}
                onStyle={onStyle}
              />
              {WEIGHTS.map((w) => (
                <WeightButton
                  active={style.headingWeight === w.value}
                  family={font.family}
                  key={w.value}
                  name={w.name()}
                  onStyle={onStyle}
                  weight={w.value}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
