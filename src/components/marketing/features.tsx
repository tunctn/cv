import {
  ArrowUp02Icon,
  Link02Icon,
  SparklesIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { Icon } from "#/components/icon";

import { Reveal } from "#/components/marketing/reveal";
import { SectionHeading } from "#/components/marketing/section-heading";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

const FONT_SAMPLES = [
  { name: "Inter", short: "Inter", family: '"Inter", sans-serif' },
  { name: "Source Serif", short: "Serif", family: '"Source Serif 4", serif' },
  { name: "Lora", short: "Lora", family: '"Lora", serif' },
  {
    name: "IBM Plex Mono",
    short: "Mono",
    family: '"IBM Plex Mono", monospace',
  },
];

const FORMAT_ICONS = [
  { key: "bold", icon: TextBoldIcon },
  { key: "italic", icon: TextItalicIcon },
  { key: "underline", icon: TextUnderlineIcon },
  { key: "link", icon: Link02Icon },
];

const SWATCHES = ["#525252", "#2563eb", "#0f766e", "#b45309", "#be123c"];

const sheet =
  "rounded-2xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-none dark:ring-1 dark:ring-border";

function Card({
  title,
  body,
  className,
  delay = 0,
  children,
}: {
  title: string;
  body: string;
  className?: string;
  /** Stagger offset for the scroll reveal, in ms. */
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-[28px] bg-surface",
        className
      )}
      delay={delay}
    >
      {/* Hover nudges the illustration, not the card, so the target stays put. */}
      <div className="relative flex h-[250px] items-center justify-center px-6 pt-8 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover/card:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover/card:translate-y-0 sm:h-[270px] sm:px-8">
        {children}
      </div>
      <div className="px-6 pt-6 pb-7 sm:px-8 sm:pb-8">
        <h3 className="font-semibold text-[17px] tracking-[-0.01em]">
          {title}
        </h3>
        <p className="mt-1.5 max-w-[440px] text-[15px] text-muted-foreground leading-relaxed">
          {body}
        </p>
      </div>
    </Reveal>
  );
}

/** Placeholder text lines, like a CV seen from a distance. */
function Lines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-2">
      {widths.map((w, i) => (
        <div
          className="h-2 rounded-full bg-foreground/[0.08]"
          // biome-ignore lint/suspicious/noArrayIndexKey: static decoration
          key={i}
          style={{ width: w }}
        />
      ))}
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="grid w-full max-w-[640px] gap-4 sm:grid-cols-[1fr_200px]">
      <div className={cn(sheet, "flex flex-col gap-3 p-4")}>
        <p className="ms-auto max-w-[85%] rounded-2xl rounded-ee-md bg-foreground px-3.5 py-2 text-[13px] text-background leading-snug">
          {m.features_chat_user()}
        </p>
        <div className="flex max-w-[92%] flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-medium text-[12px] text-muted-foreground">
            <Icon className="size-3.5 text-emerald-600" icon={Tick02Icon} />
            {m.features_chat_edited()}
          </span>
          <p className="text-[13px] leading-snug">{m.features_chat_reply()}</p>
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-full border border-border py-1.5 ps-4 pe-1.5">
          <span className="text-[13px] text-muted-foreground">
            {m.features_chat_placeholder()}
          </span>
          <span className="ms-auto flex size-7 items-center justify-center rounded-full bg-foreground text-background">
            <Icon className="size-3.5" icon={ArrowUp02Icon} />
          </span>
        </div>
      </div>
      <div className={cn(sheet, "hidden flex-col gap-4 p-5 sm:flex")}>
        <div className="h-2.5 w-2/3 rounded-full bg-foreground/80" />
        <div className="-mx-2 rounded-lg bg-emerald-500/10 p-2 ring-1 ring-emerald-500/30">
          <Lines widths={["100%", "92%", "60%"]} />
        </div>
        <Lines widths={["45%", "100%", "88%", "94%"]} />
        <Lines widths={["40%", "96%", "70%"]} />
      </div>
    </div>
  );
}

function InlineVisual() {
  return (
    <div className="relative w-full max-w-[300px]">
      <div className="absolute -top-11 left-2 z-10 flex items-center gap-0.5 rounded-full bg-foreground p-1 text-background shadow-lg">
        {FORMAT_ICONS.map(({ key, icon }) => (
          <span
            className="flex size-7 items-center justify-center rounded-full"
            key={key}
          >
            <Icon className="size-3.5" icon={icon} />
          </span>
        ))}
        <span className="mx-1 h-4 w-px bg-background/20" />
        <span className="flex items-center gap-1 rounded-full px-2.5 font-medium text-[12px]">
          <Icon className="size-3.5" icon={SparklesIcon} />
          {m.features_ask_ai()}
        </span>
      </div>
      <div className={cn(sheet, "p-5")}>
        <p className="text-[13px] leading-snug">
          <span className="rounded-sm bg-blue-500/20">
            {m.features_inline_line()}
          </span>
          <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />
        </p>
        <div className="mt-4">
          <Lines widths={["90%", "75%"]} />
        </div>
      </div>
    </div>
  );
}

function ClipVisual() {
  return (
    <div className={cn(sheet, "relative w-full max-w-[300px] p-5")}>
      <Lines widths={["55%", "100%", "84%"]} />
      <div className="relative -mx-2 mt-4 rounded-md border-[1.5px] border-blue-500 border-dashed bg-blue-500/5 p-2">
        <Lines widths={["40%", "96%", "78%"]} />
        <span className="absolute -right-2 -bottom-4 flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 font-medium text-[12px] text-background shadow-md">
          <Icon className="size-3" icon={SparklesIcon} />
          {m.features_clip_ask()}
        </span>
      </div>
      <div className="mt-6">
        <Lines widths={["100%", "66%"]} />
      </div>
    </div>
  );
}

function StyleVisual() {
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-3">
      <div className={cn(sheet, "grid grid-cols-4 divide-x divide-border")}>
        {FONT_SAMPLES.map((f) => (
          <div className="flex flex-col items-center gap-2 py-3" key={f.name}>
            <span
              className="text-[22px] leading-none"
              style={{ fontFamily: f.family }}
            >
              {"Aa"}
            </span>
            <span className="text-[10px] text-muted-foreground">{f.short}</span>
          </div>
        ))}
      </div>
      <div className={cn(sheet, "flex items-center justify-between p-3")}>
        {SWATCHES.map((c, i) => (
          <span
            className={cn(
              "size-7 rounded-full",
              i === 1 && "ring-2 ring-foreground ring-offset-2"
            )}
            key={c}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function PaperVisual() {
  return (
    <div className="flex items-end gap-4">
      {[
        { label: "A4", ratio: "794 / 1123" },
        { label: m.features_paper_letter(), ratio: "816 / 1056" },
      ].map((p) => (
        <div className="flex flex-col items-center gap-2" key={p.label}>
          <div
            className={cn(sheet, "w-[104px] rounded-md p-3")}
            style={{ aspectRatio: p.ratio }}
          >
            <div className="h-1.5 w-1/2 rounded-full bg-foreground/80" />
            <div className="mt-3">
              <Lines widths={["100%", "85%", "92%", "60%"]} />
            </div>
          </div>
          <span className="font-medium text-[12px] text-muted-foreground">
            {p.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <section className="pt-24 sm:pt-36">
      <Reveal>
        <SectionHeading lede={m.features_lede()} title={m.features_title()} />
      </Reveal>
      <div className="mt-12 grid gap-4 sm:mt-14 md:grid-cols-2 lg:grid-cols-3">
        <Card
          body={m.features_chat_body()}
          className="md:col-span-2"
          title={m.features_chat_title()}
        >
          <ChatVisual />
        </Card>
        <Card
          body={m.features_inline_body()}
          delay={80}
          title={m.features_inline_title()}
        >
          <div className="pt-10">
            <InlineVisual />
          </div>
        </Card>
        <Card
          body={m.features_clip_body()}
          delay={0}
          title={m.features_clip_title()}
        >
          <ClipVisual />
        </Card>
        <Card
          body={m.features_style_body()}
          delay={80}
          title={m.features_style_title()}
        >
          <StyleVisual />
        </Card>
        <Card
          body={m.features_paper_body()}
          delay={160}
          title={m.features_paper_title()}
        >
          <PaperVisual />
        </Card>
      </div>
    </section>
  );
}
