import {
  ArrowDown01Icon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useMemo, useRef, useState } from "react";

import { Icon } from "#/components/icon";
import { CvThumb } from "#/components/primitives";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { TEMPLATE_CATEGORIES } from "#/lib/cv/engine";
import type { TemplateCategory } from "#/lib/cv/engine";
import type { CV } from "#/lib/cv/schema";
import { getTemplate, TEMPLATES } from "#/lib/cv/templates";
import {
  categoryLabel,
  templateDescription,
  templateName,
} from "#/lib/cv/templates/copy";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

type Filter = TemplateCategory | "all";

const useFilters = () =>
  useMemo(() => {
    const list: { id: Filter; count: number }[] = [
      { id: "all", count: TEMPLATES.length },
    ];
    for (const c of TEMPLATE_CATEGORIES) {
      const count = TEMPLATES.filter((t) => t.category === c).length;
      if (count > 0) {
        list.push({ id: c, count });
      }
    }
    return list;
  }, []);

const CategoryButton = ({
  id,
  count,
  active,
  onChoose,
  onKeyDown,
}: {
  id: Filter;
  count: number;
  active: boolean;
  onChoose: (f: Filter) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}) => {
  const choose = useCallback(() => onChoose(id), [id, onChoose]);
  return (
    <button
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-foreground/30 flex shrink-0 cursor-pointer items-center justify-between gap-3 rounded-full px-3.5 py-1.5 text-start text-[13.5px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 md:rounded-[10px] md:px-3 md:py-2",
        active
          ? "bg-foreground text-background md:bg-surface-2 md:text-foreground"
          : "bg-surface text-muted-foreground hover:text-foreground md:hover:bg-surface md:bg-transparent"
      )}
      data-filter={id}
      onClick={choose}
      onKeyDown={onKeyDown}
      tabIndex={active ? 0 : -1}
      type="button"
    >
      <span className={active ? "font-medium" : undefined}>
        {categoryLabel(id)}
      </span>
      <span
        className={cn(
          "text-[12px] tabular-nums",
          active ? "opacity-70" : "text-muted-foreground/70"
        )}
      >
        {count}
      </span>
    </button>
  );
};

const CategoryNav = ({
  filters,
  filter,
  onChoose,
}: {
  filters: { id: Filter; count: number }[];
  filter: Filter;
  onChoose: (f: Filter) => void;
}) => {
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const next = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
        e.key
      ];
      if (!next) {
        return;
      }
      e.preventDefault();
      const at = filters.findIndex((f) => f.id === filter);
      const to = filters[(at + next + filters.length) % filters.length];
      onChoose(to.id);
      e.currentTarget.parentElement
        ?.querySelector<HTMLButtonElement>(`[data-filter="${to.id}"]`)
        ?.focus();
    },
    [filters, filter, onChoose]
  );
  return (
    <div
      aria-label={m.picker_categories()}
      className="no-scrollbar scroll-fade-x flex shrink-0 gap-1.5 overflow-x-auto px-5 pt-1 pb-3 sm:px-7 md:w-[212px] md:flex-col md:gap-0.5 md:overflow-visible md:px-4 md:pt-3 md:pb-6"
      role="toolbar"
    >
      {filters.map((f) => (
        <CategoryButton
          active={f.id === filter}
          count={f.count}
          id={f.id}
          key={f.id}
          onChoose={onChoose}
          onKeyDown={onKeyDown}
        />
      ))}
    </div>
  );
};

const TemplateCard = ({
  id,
  name,
  description,
  cv,
  active,
  onPick,
}: {
  id: string;
  name: string;
  description: string;
  cv: CV;
  active: boolean;
  onPick: (id: string) => void;
}) => {
  const pick = useCallback(() => onPick(id), [id, onPick]);
  return (
    <button
      aria-pressed={active}
      className="group flex min-w-0 cursor-pointer flex-col text-left outline-none"
      onClick={pick}
      type="button"
    >
      <div
        className={cn(
          "bg-surface ring-offset-popover group-hover:bg-surface-2 group-focus-visible:ring-foreground/30 relative overflow-hidden rounded-[16px] px-4 pt-4 ring-offset-2 transition-[box-shadow,background-color] group-focus-visible:ring-2 sm:px-5 sm:pt-5",
          active ? "ring-2 ring-[#3d63dd]" : null
        )}
      >
        <div className="translate-y-1 transition-transform duration-200 ease-out group-hover:translate-y-0 motion-reduce:transform-none">
          <CvThumb
            className="rounded-t-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)] transition-shadow duration-200 group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),0_14px_32px_rgba(0,0,0,0.10)]"
            cv={cv}
            template={id}
          />
        </div>
        {active ? (
          <span className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-[#3d63dd] text-white shadow-sm">
            <Icon className="size-3.5" icon={Tick02Icon} strokeWidth={2.25} />
          </span>
        ) : null}
      </div>
      <p className="mt-2.5 truncate px-0.5 text-[14px] font-medium">{name}</p>
      <p className="text-muted-foreground truncate px-0.5 text-[12.5px]">
        {description}
      </p>
    </button>
  );
};

export const TemplatePicker = ({
  cv,
  template,
  onTemplate,
}: {
  cv: CV;
  template: string;
  onTemplate: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [scrolled, setScrolled] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const filters = useFilters();
  const shown = useMemo(
    () =>
      filter === "all"
        ? TEMPLATES
        : TEMPLATES.filter((t) => t.category === filter),
    [filter]
  );

  const choose = useCallback((f: Filter) => {
    setFilter(f);
    scroller.current?.scrollTo({ top: 0 });
  }, []);
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) =>
      setScrolled(e.currentTarget.scrollTop > 0),
    []
  );
  const pick = useCallback(
    (id: string) => {
      onTemplate(id);
      setOpen(false);
    },
    [onTemplate]
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button aria-label={m.picker_choose()} variant="outline">
            {templateName(getTemplate(template))}
            <Icon
              className="text-muted-foreground"
              data-icon="inline-end"
              icon={ArrowDown01Icon}
            />
          </Button>
        }
      />
      <DialogContent
        className="flex h-[calc(100dvh-3rem)] max-h-[860px] flex-col gap-0 overflow-hidden rounded-[24px] p-0 sm:max-w-[1200px]"
        showCloseButton={false}
      >
        <DialogHeader
          className={cn(
            "bg-popover relative shrink-0 gap-1 border-b px-5 pt-6 pb-4 transition-colors sm:px-7",
            scrolled ? "border-border" : "border-transparent"
          )}
        >
          <DialogClose
            render={
              <Button
                aria-label={m.picker_close()}
                className="absolute top-4 right-4"
                size="icon"
                variant="ghost"
              />
            }
          >
            <Icon icon={Cancel01Icon} />
          </DialogClose>
          <DialogTitle className="text-[20px] font-semibold tracking-[-0.02em]">
            {m.picker_title()}
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            {m.picker_lede()}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <CategoryNav filter={filter} filters={filters} onChoose={choose} />
          <div
            className="scroll-fade-y @container min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain px-5 pt-3 pb-8 sm:px-7 md:ps-2"
            onScroll={onScroll}
            ref={scroller}
          >
            <div
              className="fade-in-0 animate-in grid grid-cols-2 items-start gap-x-4 gap-y-6 duration-200 motion-reduce:animate-none @[600px]:grid-cols-3 @[600px]:gap-x-5 @[860px]:grid-cols-4"
              key={filter}
            >
              {shown.map((t) => (
                <TemplateCard
                  active={t.id === template}
                  cv={cv}
                  description={templateDescription(t)}
                  id={t.id}
                  key={t.id}
                  name={templateName(t)}
                  onPick={pick}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
