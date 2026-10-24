import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "#/components/icon";
import { CvThumb } from "#/components/primitives";
import type { TemplateDef } from "#/lib/cv/engine";
import type { CV } from "#/lib/cv/schema";
import type { TemplateId } from "#/lib/cv/templates";
import { templateDescription, templateName } from "#/lib/cv/templates/copy";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

export type StartCv = (
  key: string,
  opts: { template?: TemplateId; sample?: boolean }
) => void;

const ArrowButton = ({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof ArrowLeft01Icon;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    aria-label={label}
    className="bg-background text-foreground hover:bg-surface focus-visible:ring-ring/50 flex size-10 cursor-pointer items-center justify-center rounded-full border transition-[opacity,scale,background-color] duration-150 ease-out outline-none focus-visible:ring-3 active:scale-[0.97] disabled:cursor-default disabled:opacity-35"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <Icon className="size-4 rtl:-scale-x-100" icon={icon} />
  </button>
);

const TemplateCard = ({
  template,
  sample,
  busy,
  onStart,
}: {
  template: TemplateDef;
  sample: CV;
  busy: string | null;
  onStart: StartCv;
}) => {
  const start = useCallback(
    () => onStart(template.id, { template: template.id, sample: true }),
    [onStart, template.id]
  );
  return (
    <li className="w-[74%] max-w-[320px] shrink-0 snap-start sm:w-[270px] sm:even:mt-10 lg:w-[290px]">
      <button
        className="group focus-visible:ring-ring/50 block w-full cursor-pointer rounded-[12px] text-start outline-none focus-visible:ring-3 disabled:cursor-wait"
        disabled={!!busy}
        onClick={start}
        type="button"
      >
        {/* The sheet lifts, not the button, so the hover target never moves. */}
        <span
          className="relative block rounded-[10px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_30px_-6px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06] transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-1.5 group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(0,0,0,0.22)] motion-reduce:transition-shadow motion-reduce:group-hover:translate-y-0 dark:ring-white/10"
          dir="ltr"
        >
          <CvThumb
            className="rounded-[10px]"
            cv={sample}
            template={template.id}
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span
              className={cn(
                "bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium shadow-lg transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]",
                busy === template.id
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
              )}
            >
              {busy === template.id ? m.common_creating() : m.home_use_this()}
            </span>
          </span>
        </span>
        <span className="mt-4 block px-0.5">
          <span className="block text-[15px] font-medium tracking-[-0.01em]">
            {templateName(template)}
          </span>
          <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
            {templateDescription(template)}
          </span>
        </span>
      </button>
    </li>
  );
};

export const TemplateCarousel = ({
  templates,
  sample,
  busy,
  onStart,
}: {
  templates: TemplateDef[];
  sample: CV;
  busy: string | null;
  onStart: StartCv;
}) => {
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    // scrollLeft is negative in RTL; compare magnitudes.
    const left = Math.abs(el.scrollLeft);
    setEdges({
      start: left < 4,
      end: left + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const page = useCallback((direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    const rtl = getComputedStyle(el).direction === "rtl";
    const card = el.querySelector("li");
    const step = card
      ? Math.max(card.clientWidth, el.clientWidth - card.clientWidth)
      : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    el.scrollBy({
      left: step * direction * (rtl ? -1 : 1),
      behavior: reduce.matches ? "auto" : "smooth",
    });
  }, []);
  const prev = useCallback(() => page(-1), [page]);
  const next = useCallback(() => page(1), [page]);

  return (
    <section
      aria-label={m.home_templates()}
      className="relative scroll-mt-24"
      id="templates"
    >
      {/* A soft band behind the lower half of the sheets anchors the row. */}
      <div
        aria-hidden
        className="bg-surface absolute inset-x-0 top-[38%] bottom-0"
      />
      <ul
        className="scroll-fade-x relative flex snap-x snap-mandatory scroll-px-[max(16px,calc((100%-1232px)/2))] [scrollbar-width:none] items-start gap-4 overflow-x-auto overscroll-x-contain px-[max(16px,calc((100%-1232px)/2))] pt-4 pb-6 [--scroll-fade-size:56px] sm:gap-6 sm:pb-8 [&::-webkit-scrollbar]:hidden"
        ref={scroller}
      >
        {templates.map((t) => (
          <TemplateCard
            busy={busy}
            key={t.id}
            onStart={onStart}
            sample={sample}
            template={t}
          />
        ))}
      </ul>
      <div className="relative mx-auto flex max-w-[1280px] items-center justify-end gap-2 px-4 pb-10 sm:px-6 sm:pb-14">
        <ArrowButton
          disabled={edges.start}
          icon={ArrowLeft01Icon}
          label={m.home_templates_prev()}
          onClick={prev}
        />
        <ArrowButton
          disabled={edges.end}
          icon={ArrowRight01Icon}
          label={m.home_templates_next()}
          onClick={next}
        />
      </div>
    </section>
  );
};
