import {
  Add01Icon,
  Briefcase01Icon,
  DashboardSquareAddIcon,
  Folder01Icon,
  LanguageCircleIcon,
  LayoutTemplateIcon,
  Mortarboard02Icon,
  ScissorIcon,
  StarIcon,
  UndoIcon,
  UserIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { Icon } from "#/components/icon";
import type { IconSvgElement } from "#/components/icon";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { Slider } from "#/components/ui/slider";
import { resolveStyle } from "#/lib/cv/engine";
import type { TemplateDef } from "#/lib/cv/engine";
import { sectionLabel, withLocalLabel } from "#/lib/cv/i18n-labels";
import { addCustomSection, blankFor } from "#/lib/cv/paths";
import {
  customKey,
  emptyCustomSection,
  PAPERS,
  SECTION_KEYS,
} from "#/lib/cv/schema";
import type { CV, CvStyle, Paper, SectionKey } from "#/lib/cv/schema";
import { track } from "#/lib/track";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import type { Locale } from "#/paraglide/runtime.js";

import { ColorPicker } from "./color-picker";
import { CvLanguage } from "./cv-language";
import { ResetField } from "./reset-field";
import { TemplatePicker } from "./template-picker";
import { TypePopover } from "./type-popover";

interface Props {
  clipping: boolean;
  cv: CV;
  def: TemplateDef;
  onChange: (update: (cv: CV) => CV) => void;
  onSelect: (path: string | null) => void;
  onTemplate: (id: string) => void;
  onToggleClip: () => void;
  /** Ask the AI to translate the whole CV into this language. */
  onTranslate: (locale: Locale) => void;
  /** Shown before the tools (the mobile Chat/CV switch). */
  start?: ReactNode;
  template: string;
}

/** Icons for the built-in sections in the "+ Section" menu. */
const SECTION_ICONS: Record<SectionKey | "profile", IconSvgElement> = {
  profile: UserIcon,
  experience: Briefcase01Icon,
  education: Mortarboard02Icon,
  skills: StarIcon,
  projects: Folder01Icon,
  languages: LanguageCircleIcon,
};

const AddProfileItem = ({
  onChange,
  onSelect,
}: {
  onChange: Props["onChange"];
  onSelect: Props["onSelect"];
}) => {
  const add = useCallback(() => {
    onChange((c) =>
      withLocalLabel(
        { ...c, basics: { ...c.basics, summary: m.ed_profile_starter() } },
        "profile"
      )
    );
    track("section_added", { section: "profile" });
    onSelect("basics.summary");
  }, [onChange, onSelect]);
  return (
    <DropdownMenuItem onClick={add}>
      <Icon icon={SECTION_ICONS.profile} /> {sectionLabel("profile")}
    </DropdownMenuItem>
  );
};

const AddSectionItem = ({
  k,
  onChange,
  onSelect,
}: {
  k: SectionKey;
  onChange: Props["onChange"];
  onSelect: Props["onSelect"];
}) => {
  const add = useCallback(() => {
    onChange((c) => withLocalLabel({ ...c, [k]: [blankFor(k)] }, k));
    track("section_added", { section: k });
    onSelect(`${k}.0`);
  }, [k, onChange, onSelect]);
  return (
    <DropdownMenuItem onClick={add}>
      <Icon icon={SECTION_ICONS[k]} /> {sectionLabel(k)}
    </DropdownMenuItem>
  );
};

const focusField = (path: string, tries = 30) => {
  const el = document.querySelector<HTMLElement>(
    `[data-edit-path="${path}"][contenteditable]`
  );
  if (!el) {
    if (tries > 0) {
      requestAnimationFrame(() => focusField(path, tries - 1));
    }
    return;
  }
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};

const AddCustomSectionItem = ({
  cv,
  onChange,
  onSelect,
}: {
  cv: CV;
  onChange: Props["onChange"];
  onSelect: Props["onSelect"];
}) => {
  const add = useCallback(() => {
    const section = emptyCustomSection();
    onChange((c) => addCustomSection(c, section));
    track("section_added", { section: "custom" });
    onSelect(`sections.${customKey(section.id)}`);
    focusField(`custom.${cv.custom.length}.title`);
  }, [cv.custom.length, onChange, onSelect]);
  return (
    <DropdownMenuItem onClick={add}>
      <Icon icon={DashboardSquareAddIcon} /> {m.editor_custom_section()}
    </DropdownMenuItem>
  );
};

/** Message functions, called at render so each request gets its locale. */
const PAPER_LABELS: Record<Paper, () => string> = {
  a4: m.ed_paper_a4,
  letter: m.ed_paper_letter,
};

const PaperButton = ({
  paper,
  active,
  onStyle,
}: {
  paper: Paper;
  active: boolean;
  onStyle: (patch: Partial<CvStyle>) => void;
}) => {
  const pick = useCallback(() => onStyle({ paper }), [paper, onStyle]);
  return (
    <button
      aria-checked={active}
      className={cn(
        "focus-visible:ring-foreground/20 h-7 cursor-pointer rounded-[8px] text-[13px] transition-colors outline-none focus-visible:ring-2",
        active
          ? "bg-background text-foreground ring-foreground/[0.06] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={pick}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- segmented control with radio semantics
      role="radio"
      type="button"
    >
      {PAPER_LABELS[paper]()}
    </button>
  );
};

const MarginSlider = ({
  base,
  label,
  resetLabel,
  prop,
  value,
  onStyle,
}: {
  base: number;
  label: string;
  /** In-sentence name for the reset button, e.g. "top margin". */
  resetLabel: string;
  prop: "padX" | "padTop" | "padBottom";
  value: number;
  onStyle: (patch: Partial<CvStyle>) => void;
}) => {
  const onValue = useCallback(
    (v: number | readonly number[]) =>
      onStyle({ [prop]: Array.isArray(v) ? v[0] : v }),
    [prop, onStyle]
  );
  const onInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      if (Number.isFinite(n)) {
        onStyle({ [prop]: Math.min(96, Math.max(0, Math.round(n))) });
      }
    },
    [prop, onStyle]
  );
  const reset = useCallback(
    () => onStyle({ [prop]: undefined }),
    [prop, onStyle]
  );
  return (
    <div className="grid grid-cols-[76px_1fr_60px] items-center gap-2.5 text-[13px]">
      <span className="text-muted-foreground flex items-center gap-1 whitespace-nowrap">
        {label}
        <ResetField label={resetLabel} onReset={reset} show={value !== base} />
      </span>
      <Slider
        aria-label={m.ed_margin_aria({ side: label })}
        max={96}
        min={0}
        onValueChange={onValue}
        step={1}
        value={[value]}
      />
      <label className="bg-surface text-muted-foreground focus-within:ring-foreground/15 flex h-7 items-center justify-end gap-0.5 rounded-[8px] pr-2 focus-within:ring-2">
        <input
          aria-label={m.ed_margin_px_aria({ side: label })}
          className="text-foreground w-8 [appearance:textfield] bg-transparent text-right tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          inputMode="numeric"
          max={96}
          min={0}
          onChange={onInput}
          type="number"
          value={value}
        />
        {/* oxlint-disable-next-line i18n/jsx-text -- CSS unit, same in every language */}
        px
      </label>
    </div>
  );
};

const PagePopover = ({
  base,
  style,
  onStyle,
}: {
  base: ReturnType<typeof resolveStyle>;
  style: ReturnType<typeof resolveStyle>;
  onStyle: (patch: Partial<CvStyle>) => void;
}) => {
  const reset = useCallback(
    () => onStyle({ padX: undefined, padTop: undefined, padBottom: undefined }),
    [onStyle]
  );
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost">
            <Icon data-icon="inline-start" icon={LayoutTemplateIcon} />{" "}
            {m.ed_page()}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[316px] gap-0">
        <p className="text-[13px] font-medium">{m.ed_paper()}</p>
        <div
          aria-label={m.ed_paper_size()}
          className="bg-surface mt-2 grid grid-cols-2 gap-0.5 rounded-[10px] p-0.5"
          role="radiogroup"
        >
          {PAPERS.map((p) => (
            <PaperButton
              active={style.paper === p}
              key={p}
              onStyle={onStyle}
              paper={p}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[13px] font-medium">{m.ed_margins()}</p>
          <button
            className="text-muted-foreground hover:bg-surface hover:text-foreground -mr-1.5 inline-flex h-6 cursor-pointer items-center gap-1 rounded-md px-1.5 text-[12px] transition-colors"
            onClick={reset}
            type="button"
          >
            <Icon className="size-3.5" icon={UndoIcon} /> {m.ed_reset()}
          </button>
        </div>
        <div className="mt-3 grid gap-3.5">
          <MarginSlider
            base={base.padX}
            label={m.ed_margin_sides()}
            onStyle={onStyle}
            prop="padX"
            resetLabel={m.ed_margin_sides_name()}
            value={style.padX}
          />
          <MarginSlider
            base={base.padTop}
            label={m.ed_margin_top()}
            onStyle={onStyle}
            prop="padTop"
            resetLabel={m.ed_margin_top_name()}
            value={style.padTop}
          />
          <MarginSlider
            base={base.padBottom}
            label={m.ed_margin_bottom()}
            onStyle={onStyle}
            prop="padBottom"
            resetLabel={m.ed_margin_bottom_name()}
            value={style.padBottom}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const StyleBar = ({
  cv,
  def,
  template,
  onTemplate,
  onChange,
  onSelect,
  clipping,
  onToggleClip,
  onTranslate,
  start,
}: Props) => {
  const style = resolveStyle(def, cv);
  // The template's own values, so changed rows can offer a reset.
  const base = resolveStyle(def, { ...cv, style: {} });
  const setStyle = useCallback(
    (patch: Partial<CvStyle>) =>
      onChange((c) => ({ ...c, style: { ...c.style, ...patch } })),
    [onChange]
  );
  const onAccent = useCallback(
    (accent: string) => setStyle({ accent }),
    [setStyle]
  );
  const empty = SECTION_KEYS.filter((k) => cv[k].length === 0);

  return (
    <div className="no-scrollbar scroll-fade-x bg-background flex shrink-0 items-center gap-2 overflow-x-auto border-b px-3 py-2 *:shrink-0">
      {start}
      <TemplatePicker cv={cv} onTemplate={onTemplate} template={template} />
      <CvLanguage cv={cv} onChange={onChange} onTranslate={onTranslate} />
      <TypePopover base={base} onStyle={setStyle} style={style} />
      <ColorPicker accent={style.accent} onPick={onAccent} />
      <PagePopover base={base} onStyle={setStyle} style={style} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost">
              <Icon data-icon="inline-start" icon={Add01Icon} />{" "}
              {m.ed_section()}
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {cv.basics.summary ? null : (
            <AddProfileItem onChange={onChange} onSelect={onSelect} />
          )}
          {empty.map((k) => (
            <AddSectionItem
              k={k}
              key={k}
              onChange={onChange}
              onSelect={onSelect}
            />
          ))}
          {empty.length > 0 || !cv.basics.summary ? (
            <DropdownMenuSeparator />
          ) : null}
          <AddCustomSectionItem
            cv={cv}
            onChange={onChange}
            onSelect={onSelect}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="ml-auto" />
      <Button
        aria-pressed={clipping}
        className={cn(
          clipping && "bg-primary text-primary-foreground hover:bg-primary/85"
        )}
        onClick={onToggleClip}
        title={m.ed_clip_title()}
        variant={clipping ? "default" : "ghost"}
      >
        <Icon data-icon="inline-start" icon={ScissorIcon} /> {m.ed_clip()}
      </Button>
    </div>
  );
};
