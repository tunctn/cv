import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft02Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  CheckmarkCircle02Icon,
  CloudSavingDone01Icon,
  Download01Icon,
  LayoutTemplateIcon,
  MinusSignIcon,
  MoreHorizontalIcon,
  Redo03Icon,
  ScissorIcon,
  Share08Icon,
  TextFontIcon,
  Undo03Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "#/components/icon";
import { CvThumb } from "#/components/primitives";
import { FileType } from "#/components/reui/file-type";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import {
  Trace,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "#/components/ui/trace";
import { resolveStyle } from "#/lib/cv/engine";
import type { CV } from "#/lib/cv/schema";
import { getTemplate } from "#/lib/cv/templates";
import { templateName } from "#/lib/cv/templates/copy";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

/** The demo rewrites the first bullet of the first job; "**Label:** text". */
const LEAD = /^\*\*(.+?)\*\*\s*/;
/** When the reply lands and the bullet changes, after the window settles. */
const EDIT_AT_MS = 1700;

type Phase = "before" | "after";

/**
 * Plays the one edit once: the reply appears in the chat and the matching
 * bullet on the page is rewritten with a brief highlight. Reduced motion
 * shows the finished state straight away.
 */
function useEditPhase() {
  const [phase, setPhase] = useState<Phase>("before");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("after");
      return;
    }
    const t = window.setTimeout(() => setPhase("after"), EDIT_AT_MS);
    return () => window.clearTimeout(t);
  }, []);
  return phase;
}

/** The bold lead of the bullet the demo rewrites, used to find it on the page. */
function bulletLead(sample: CV) {
  const first = sample.experience?.[0]?.highlights?.[0] ?? "";
  return LEAD.exec(first)?.[1] ?? "";
}

/** The sample CV with that bullet swapped for a weaker one. */
function useBeforeCv(sample: CV) {
  return useMemo(() => {
    const cv = structuredClone(sample);
    const job = cv.experience?.[0];
    if (job?.highlights?.length) {
      const lead = bulletLead(sample);
      job.highlights[0] = `${lead ? `**${lead}** ` : ""}${m.hero_bullet_before()}`;
    }
    return cv;
  }, [sample]);
}

/** Lays a fixed-size virtual screen out at its own pixels and scales it to fit. */
function useFit(width: number) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(([e]) =>
      setScale(e.contentRect.width / width)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return { box, scale };
}

/** Briefly highlights the rewritten bullet inside the rendered page. */
function useBulletHighlight(phase: Phase, lead: string) {
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== "after" || !page.current || !lead) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const strong = [...(page.current?.querySelectorAll("strong") ?? [])].find(
        (s) => s.textContent?.includes(lead)
      );
      const row = strong?.closest("li, p, div");
      row?.classList.add("hero-hl");
    });
    return () => cancelAnimationFrame(frame);
  }, [phase, lead]);
  return page;
}

const SHEET =
  "rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_10px_30px_rgba(0,0,0,0.08)]";

function Page({
  cv,
  label,
  pageRef,
  className,
}: {
  cv: CV;
  label: string;
  pageRef: React.Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-[12px] text-muted-foreground">{label}</p>
      <div dir="ltr" ref={pageRef}>
        <CvThumb className={SHEET} cv={cv} template="classic" />
      </div>
    </div>
  );
}

/** The demo upload's type and size; its name comes from the sample person. */
const DEMO_FILE_META = "PDF · 84 KB";

function demoFileName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "cv"}-cv.pdf`;
}

const FILE_CARD =
  "m-px flex w-fit max-w-full items-center gap-3 rounded-2xl bg-background p-2 pe-4 text-start shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.08]";

/** The import that came before the edit, so the chat looks lived-in. */
function EarlierExchange({ name }: { name: string }) {
  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        <div className={FILE_CARD}>
          <FileType className="shrink-0" size="default" type="pdf" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-[13px]">
              {demoFileName(name)}
            </span>
            <span className="block text-[12px] text-muted-foreground tracking-wide">
              {DEMO_FILE_META}
            </span>
          </span>
        </div>
        <Bubble align="end" className="max-w-[88%]" variant="muted">
          <BubbleContent className="rounded-[20px] px-4 py-2.5 text-[15px] text-foreground">
            {m.chat_here_is_my_cv()}
          </BubbleContent>
        </Bubble>
      </div>
      <div className="flex flex-col gap-3">
        <Trace>
          <TraceLine>
            <TraceIcon>
              <Icon icon={CheckmarkCircle02Icon} />
            </TraceIcon>
            <TraceTitle>{m.chat_edited_cv()}</TraceTitle>
            <TraceDescription>
              {m.chat_changes_other({ count: 14 })}
            </TraceDescription>
          </TraceLine>
        </Trace>
        <p className="text-[15px] text-foreground leading-relaxed">
          {m.hero_chat_import_reply({
            template: templateName(getTemplate("classic")),
          })}
        </p>
      </div>
    </>
  );
}

function Chat({
  phase,
  compact,
  name,
}: {
  phase: Phase;
  compact?: boolean;
  name: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5", compact ? "px-4" : "px-5")}>
      {compact ? null : <EarlierExchange name={name} />}
      <Bubble align="end" className="max-w-[88%]" variant="muted">
        <BubbleContent className="rounded-[20px] px-4 py-2.5 text-[15px] text-foreground">
          {m.hero_chat_user()}
        </BubbleContent>
      </Bubble>
      <div
        className={cn(
          "flex flex-col gap-3 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]",
          phase === "after" ? "opacity-100" : "translate-y-1 opacity-0"
        )}
      >
        <Trace>
          <TraceLine>
            <TraceIcon>
              <Icon icon={CheckmarkCircle02Icon} />
            </TraceIcon>
            <TraceTitle>{m.chat_edited_cv()}</TraceTitle>
            <TraceDescription>
              {m.chat_changes_one({ count: 1 })}
            </TraceDescription>
          </TraceLine>
        </Trace>
        <p className="text-[15px] text-foreground leading-relaxed">
          {m.hero_chat_reply()}
        </p>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <div className="rounded-[16px] bg-surface">
      <p className="min-h-14 px-4 pt-3 pb-1 text-[15px] text-muted-foreground">
        {m.chat_placeholder()}
      </p>
      <div className="flex items-center px-2 pb-2">
        <span className="flex size-8 items-center justify-center text-muted-foreground">
          <Icon className="size-4" icon={Attachment01Icon} />
        </span>
        <span className="ms-auto flex size-8 items-center justify-center rounded-full bg-foreground/40 text-background">
          <Icon className="size-4" icon={ArrowUp02Icon} />
        </span>
      </div>
    </div>
  );
}

function ToolPill({
  icon,
  children,
  outline,
}: {
  icon?: typeof Add01Icon;
  children: React.ReactNode;
  outline?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-medium text-[14px]",
        outline && "border"
      )}
    >
      {icon ? <Icon className="size-4" icon={icon} /> : null}
      {children}
    </span>
  );
}

const DESKTOP_W = 1440;
const DESKTOP_H = 860;

/** The editor at desktop size: header, style bar, canvas, chat dock, page. */
function DesktopApp({ sample }: { sample: CV }) {
  const phase = useEditPhase();
  const before = useBeforeCv(sample);
  const pageRef = useBulletHighlight(phase, bulletLead(sample));
  const { box, scale } = useFit(DESKTOP_W);
  const template = getTemplate("classic");
  return (
    <div
      className="relative w-full overflow-hidden rounded-[20px] bg-background shadow-[0_2px_4px_rgba(0,0,0,0.04),0_30px_80px_-20px_rgba(0,0,0,0.25)] ring-1 ring-foreground/[0.08] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
      ref={box}
      style={{ aspectRatio: `${DESKTOP_W} / ${DESKTOP_H}` }}
    >
      <div
        className={cn(
          "absolute top-0 left-0 origin-top-left transition-opacity duration-300",
          scale > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: DESKTOP_W,
          height: DESKTOP_H,
          transform: `scale(${scale})`,
        }}
      >
        <div className="flex h-14 items-center gap-1 border-b px-3">
          <span className="flex size-9 items-center justify-center">
            <Icon
              className="size-[18px] rtl:-scale-x-100"
              icon={ArrowLeft02Icon}
            />
          </span>
          <span className="flex size-9 items-center justify-center text-muted-foreground">
            <Icon className="size-[18px]" icon={CloudSavingDone01Icon} />
          </span>
          <span className="ms-2 font-medium text-[15px]">
            {sample.basics.name}
          </span>
          <span className="ms-auto flex items-center gap-1 text-muted-foreground">
            <span className="flex size-9 items-center justify-center">
              <Icon className="size-[18px]" icon={Undo03Icon} />
            </span>
            <span className="flex size-9 items-center justify-center">
              <Icon className="size-[18px]" icon={Redo03Icon} />
            </span>
            <span className="flex size-9 items-center justify-center">
              <Icon className="size-[18px]" icon={Share08Icon} />
            </span>
          </span>
          <span className="ms-1 inline-flex h-9 items-center gap-1.5 rounded-full border px-4 font-medium text-[14px]">
            <Icon className="size-4" icon={Download01Icon} />
            {m.ed_download()}
          </span>
        </div>
        <div className="flex h-[52px] items-center gap-1 border-b px-3">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 font-medium text-[14px]">
            {templateName(template)}
            <Icon
              className="size-4 text-muted-foreground"
              icon={ArrowDown01Icon}
            />
          </span>
          <ToolPill icon={TextFontIcon}>
            {/* biome-ignore lint/plugin: font family name */}
            Inter
          </ToolPill>
          <ToolPill>
            <span
              className="size-4 rounded-full"
              style={{
                background: resolveStyle(template, sample).accent,
              }}
            />
            {m.ed_colour()}
          </ToolPill>
          <ToolPill icon={LayoutTemplateIcon}>{m.ed_page()}</ToolPill>
          <ToolPill icon={Add01Icon}>{m.ed_section()}</ToolPill>
          <span className="ms-auto">
            <ToolPill icon={ScissorIcon}>{m.ed_clip()}</ToolPill>
          </span>
        </div>
        <div className="relative h-[calc(100%-108px)] overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="absolute top-3 bottom-3 left-3 flex w-[380px] flex-col overflow-hidden rounded-[24px] bg-background ring-1 ring-foreground/[0.07]">
            <div className="flex h-12 items-center gap-1 border-b ps-2 pe-2">
              <span className="inline-flex h-8 items-center rounded-full bg-surface px-3 font-medium text-[14px]">
                {m.ed_chat()}
              </span>
              <span className="inline-flex h-8 items-center px-3 text-[14px] text-muted-foreground">
                {m.chat_tab_history()}
              </span>
              <span className="ms-auto flex items-center text-muted-foreground">
                <span className="flex size-8 items-center justify-center">
                  <Icon className="size-4" icon={MoreHorizontalIcon} />
                </span>
                <span className="flex size-8 items-center justify-center">
                  <Icon className="size-4" icon={MinusSignIcon} />
                </span>
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-4 pb-3">
              <Chat name={sample.basics.name} phase={phase} />
              <div className="px-3">
                <Composer />
              </div>
            </div>
          </div>
          <Page
            className="absolute top-8 left-[500px] w-[760px]"
            cv={phase === "after" ? sample : before}
            label={m.ed_page_n({ page: 1 })}
            pageRef={pageRef}
          />
        </div>
      </div>
    </div>
  );
}

const MOBILE_W = 390;
const MOBILE_H = 640;

/** Phone crop: the page under a compact header, chat as a bottom sheet. */
function MobileApp({ sample }: { sample: CV }) {
  const phase = useEditPhase();
  const before = useBeforeCv(sample);
  const pageRef = useBulletHighlight(phase, bulletLead(sample));
  const { box, scale } = useFit(MOBILE_W);
  return (
    <div
      className="relative w-full overflow-hidden rounded-[28px] bg-background shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)] ring-1 ring-foreground/[0.08]"
      ref={box}
      style={{ aspectRatio: `${MOBILE_W} / ${MOBILE_H}` }}
    >
      <div
        className={cn(
          "absolute top-0 left-0 origin-top-left transition-opacity duration-300",
          scale > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: MOBILE_W,
          height: MOBILE_H,
          transform: `scale(${scale})`,
        }}
      >
        <div className="flex h-12 items-center gap-1 border-b px-2">
          <span className="flex size-9 items-center justify-center">
            <Icon
              className="size-[18px] rtl:-scale-x-100"
              icon={ArrowLeft02Icon}
            />
          </span>
          <span className="font-medium text-[15px]">{sample.basics.name}</span>
          <span className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-medium text-[13px]">
            <Icon className="size-4" icon={Download01Icon} />
            {m.ed_download()}
          </span>
        </div>
        <div className="relative h-[calc(100%-48px)] overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <Page
            className="absolute top-4 right-4 left-4"
            cv={phase === "after" ? sample : before}
            label={m.ed_page_n({ page: 1 })}
            pageRef={pageRef}
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-t-[24px] bg-background pt-2 pb-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ring-1 ring-foreground/[0.07]">
            <span className="mx-auto h-1 w-10 rounded-full bg-foreground/15" />
            <Chat compact name={sample.basics.name} phase={phase} />
            <div className="px-3">
              <Composer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The real editor, drawn with the app's own components and type ramp at its
 * own pixel size, then scaled down as one window. One thing happens: the
 * reply lands in the chat and the matching bullet on the page is rewritten.
 */
export function HeroApp({ sample }: { sample: CV }) {
  return (
    // A picture of the app, not the app: no selecting, clicking or focus.
    <div
      aria-hidden
      className="hero-window pointer-events-none mx-auto w-full max-w-[1120px] select-none"
      inert
    >
      <div className="hidden sm:block">
        <DesktopApp sample={sample} />
      </div>
      <div className="mx-auto max-w-[420px] sm:hidden">
        <MobileApp sample={sample} />
      </div>
    </div>
  );
}
