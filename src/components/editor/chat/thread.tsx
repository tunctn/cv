import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  LoaderCircleIcon,
  PencilEdit01Icon,
  SparklesIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import type { UIMessage } from "ai";
import { memo, useState } from "react";
import Markdown from "react-markdown";
import { Icon } from "#/components/icon";
import { FileType, getFileType } from "#/components/reui/file-type";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Message, MessageContent } from "#/components/ui/message";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "#/components/ui/trace";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import {
  CONTEXT_MARK,
  type ContextSummary,
  filePartBytes,
  formatBytes,
  parseContexts,
  TOOL_LABELS,
} from "./shared";

type Part = UIMessage["parts"][number];

interface ToolStep {
  label: string;
  /** A web search, not a change to the CV. */
  search: boolean;
  state: "running" | "done" | "error";
}

type Segment =
  | { kind: "text"; text: string }
  | { kind: "steps"; tools: ToolStep[]; thoughts: Part[] };

function isToolPart(part: Part) {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function toolStep(part: Part): ToolStep {
  const name =
    part.type === "dynamic-tool" && "toolName" in part
      ? String(part.toolName)
      : part.type.slice(5);
  const state = "state" in part ? part.state : undefined;
  let s: ToolStep["state"] = "running";
  if (state === "output-available") {
    s = "done";
  } else if (state === "output-error" || state === "output-denied") {
    s = "error";
  }
  return {
    label: toolLabel(name, part),
    search: name === "web_search",
    state: s,
  };
}

function toolLabel(name: string, part: Part) {
  if (name === "web_search") {
    // The hosted search reports what it looked up in its output.
    const output = ("output" in part ? part.output : undefined) as
      | { action?: { queries?: string[]; query?: string } }
      | undefined;
    const action = output?.action;
    const query = action?.queries?.[0] ?? action?.query;
    return query
      ? m.chat_tool_web_search_query({ query })
      : m.chat_tool_web_search();
  }
  return TOOL_LABELS[name]?.() ?? name.replaceAll("_", " ");
}

/** Pages the AI read while searching, once each, in the order found. */
function sourcesOf(parts: Part[]) {
  // One chip per site: the first page read from each.
  const seen = new Set<string>();
  const out: { url: string; title?: string }[] = [];
  for (const p of parts) {
    if (p.type === "source-url" && !seen.has(hostOf(p.url))) {
      seen.add(hostOf(p.url));
      out.push({ url: p.url, title: p.title });
    }
  }
  return out;
}

const WWW = /^www\./;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(WWW, "");
  } catch {
    return url;
  }
}

function Sources({ sources }: { sources: { url: string; title?: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-muted-foreground">
        {m.chat_sources()}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {sources.slice(0, 8).map((s) => (
          <a
            className="max-w-[220px] truncate rounded-full bg-surface px-2.5 py-1 text-[12px] text-foreground/80 transition-colors hover:bg-surface-2 hover:text-foreground"
            href={s.url}
            key={s.url}
            rel="noopener noreferrer"
            target="_blank"
            title={s.title || s.url}
          >
            {hostOf(s.url)}
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * Folds an assistant message into text blocks plus ONE steps group (all tool
 * calls and reasoning), placed where the first step happened.
 */
function segments(parts: Part[]) {
  const out: Segment[] = [];
  let steps: Extract<Segment, { kind: "steps" }> | null = null;
  for (const part of parts) {
    if (part.type === "text") {
      if (!part.text) {
        continue;
      }
      const last = out.at(-1);
      if (last?.kind === "text") {
        last.text += `\n\n${part.text}`;
      } else {
        out.push({ kind: "text", text: part.text });
      }
    } else if (isToolPart(part) || part.type === "reasoning") {
      if (!steps) {
        steps = { kind: "steps", tools: [], thoughts: [] };
        out.push(steps);
      }
      if (part.type === "reasoning") {
        if (part.text) {
          steps.thoughts.push(part);
        }
      } else {
        steps.tools.push(toolStep(part));
      }
    }
  }
  return out;
}

export const ChatMessage = memo(function ChatMessageView({
  message,
  streaming,
}: {
  message: UIMessage;
  /** True while this message is the one being streamed. */
  streaming: boolean;
}) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  const segs = segments(message.parts);
  const sources = sourcesOf(message.parts);
  const lastPart = message.parts.at(-1);
  const toolsStillGoing =
    streaming && lastPart !== undefined && lastPart.type !== "text";
  return (
    <Message>
      <MessageContent className="gap-3">
        {segs.map((seg, i) =>
          seg.kind === "text" ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are derived from append-only parts, so the index is stable
            <Reply key={i} text={seg.text} />
          ) : (
            <Steps
              // biome-ignore lint/suspicious/noArrayIndexKey: there is at most one steps group per message
              key={i}
              running={toolsStillGoing}
              streaming={streaming}
              thoughts={seg.thoughts}
              tools={seg.tools}
            />
          )
        )}
        {sources.length > 0 && !streaming ? (
          <Sources sources={sources} />
        ) : null}
      </MessageContent>
    </Message>
  );
});

const PNG_EXT = /\.png$/;

function UserMessage({ message }: { message: UIMessage }) {
  // A clip arrives as a context part plus its screenshot ("<label>.png");
  // show them together as one card.
  const contexts = message.parts.flatMap((p) =>
    p.type === "text" && p.text.startsWith(CONTEXT_MARK)
      ? parseContexts(p.text)
      : []
  );
  const shots = new Map(
    message.parts.flatMap((p) =>
      p.type === "file" && p.mediaType === "image/png" && p.filename
        ? [[p.filename.replace(PNG_EXT, ""), p.url] as const]
        : []
    )
  );
  return (
    <Message align="end">
      <MessageContent className="items-end gap-1.5">
        {contexts.length > 0 ? (
          <div className="flex max-w-[88%] flex-wrap justify-end gap-1.5">
            {contexts.map((c, i) => (
              <ContextCard
                context={c}
                image={shots.get(c.label)}
                // biome-ignore lint/suspicious/noArrayIndexKey: contexts are a fixed list per message
                key={i}
              />
            ))}
          </div>
        ) : null}
        {message.parts.map((part, i) =>
          part.type === "file" &&
          part.filename &&
          shots.has(part.filename.replace(PNG_EXT, "")) &&
          contexts.some((c) => `${c.label}.png` === part.filename) ? null : (
            // biome-ignore lint/suspicious/noArrayIndexKey: message parts have no ids and are only ever appended, so the index is stable
            <UserPart key={i} part={part} />
          )
        )}
      </MessageContent>
    </Message>
  );
}

const CARD =
  "m-px flex w-fit max-w-full items-center gap-3 rounded-2xl bg-background p-2 pr-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.08]";

/** A part of the CV the user pointed at: thumbnail (or icon), label, field count. */
function ContextCard({
  context,
  image,
}: {
  context: ContextSummary;
  image?: string;
}) {
  const n = context.fields.length;
  return (
    <div className={CARD}>
      {image ? (
        <img
          alt=""
          className="size-11 shrink-0 rounded-[10px] bg-white object-cover object-top ring-1 ring-foreground/[0.06]"
          height={44}
          src={image}
          width={44}
        />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-surface">
          <Icon className="size-5 text-muted-foreground" icon={SparklesIcon} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium text-[13px]">
          {context.label}
        </span>
        <span className="block truncate text-[12px] text-muted-foreground">
          {n > 0
            ? (n === 1
                ? m.chat_fields_from_cv_one
                : m.chat_fields_from_cv_other)({ count: n })
            : m.chat_part_of_cv()}
        </span>
      </span>
    </div>
  );
}

/** An attached file: type badge, name, type and size. */
function FileCard({
  name,
  mediaType,
  url,
}: {
  name: string;
  mediaType: string;
  url: string;
}) {
  const kind = getFileType(name || mediaType);
  const bytes = filePartBytes(url);
  const size = bytes === null ? null : formatBytes(bytes);
  return (
    <div className={CARD}>
      <FileType className="shrink-0" size="default" type={kind} />
      <span className="min-w-0">
        <span className="block max-w-[220px] truncate font-medium text-[13px]">
          {name}
        </span>
        <span className="block text-[12px] text-muted-foreground uppercase tracking-wide">
          {String(kind)}
          {size ? (
            <span className="normal-case tracking-normal"> · {size}</span>
          ) : null}
        </span>
      </span>
    </div>
  );
}

function UserPart({ part }: { part: Part }) {
  if (part.type === "text") {
    if (!part.text || part.text.startsWith(CONTEXT_MARK)) {
      return null;
    }
    return (
      <Bubble align="end" className="max-w-[88%]">
        <BubbleContent className="whitespace-pre-wrap rounded-[20px] px-4 py-2.5 text-[15px]">
          {part.text.length > 600 ? `${part.text.slice(0, 600)}…` : part.text}
        </BubbleContent>
      </Bubble>
    );
  }
  if (part.type === "file") {
    if (part.mediaType.startsWith("image/") && part.url.startsWith("data:")) {
      return (
        <img
          alt={part.filename ?? ""}
          className="max-h-40 w-auto max-w-[70%] rounded-2xl object-contain ring-1 ring-foreground/[0.08]"
          height={160}
          src={part.url}
          width={280}
        />
      );
    }
    return (
      <FileCard
        mediaType={part.mediaType}
        name={part.filename ?? m.chat_attachment()}
        url={part.url}
      />
    );
  }
  return null;
}

const MD_CLASS = cn(
  "text-[15px] text-foreground leading-relaxed",
  "[&>*+*]:mt-3 [&_li+li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_strong]:font-semibold",
  "[&_a]:underline [&_a]:underline-offset-2",
  "[&_code]:rounded-md [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-surface [&_pre]:p-3"
);

const Reply = memo(function ReplyView({ text }: { text: string }) {
  return (
    <div className={MD_CLASS}>
      <Markdown>{text}</Markdown>
    </div>
  );
});

/** Same label repeated (e.g. 5× "Updated experience") collapses to one row. */
function groupSteps(tools: ToolStep[]) {
  const map = new Map<
    string,
    { label: string; count: number; running: boolean; failed: boolean }
  >();
  for (const t of tools) {
    const row = map.get(t.label) ?? {
      label: t.label,
      count: 0,
      running: false,
      failed: false,
    };
    row.count += 1;
    row.running ||= t.state === "running";
    row.failed ||= t.state === "error";
    map.set(t.label, row);
  }
  return [...map.values()];
}

function Steps({
  tools,
  thoughts,
  running,
  streaming,
}: {
  tools: ToolStep[];
  thoughts: Part[];
  running: boolean;
  streaming: boolean;
}) {
  return (
    <Trace>
      {thoughts.map((t, i) => (
        <Thought
          // biome-ignore lint/suspicious/noArrayIndexKey: reasoning parts are append-only
          key={i}
          running={streaming && "state" in t && t.state === "streaming"}
          text={"text" in t ? String(t.text) : ""}
        />
      ))}
      {tools.length > 0 ? (
        <ToolGroup running={running} streaming={streaming} tools={tools} />
      ) : null}
    </Trace>
  );
}

function ToolGroup({
  tools,
  running,
  streaming,
}: {
  tools: ToolStep[];
  running: boolean;
  streaming: boolean;
}) {
  const rows = groupSteps(tools);
  const failed = tools.filter((t) => t.state === "error").length;
  // A step that never finished and the stream is over was cut off.
  const pending = tools.some((t) => t.state === "running");
  const busy = running || (streaming && pending);
  const searches = tools.filter((t) => t.search).length;
  const edits = tools.length - searches;
  const onlySearch = edits === 0;
  let title = onlySearch ? m.chat_tool_web_search() : m.chat_edited_cv();
  if (busy) {
    title = onlySearch ? m.chat_searching_web() : m.chat_editing_cv();
  } else if (failed === tools.length) {
    title = m.chat_edit_failed();
  }
  const counts = [
    edits > 0
      ? (edits === 1 ? m.chat_changes_one : m.chat_changes_other)({
          count: edits,
        })
      : "",
    searches > 0
      ? (searches === 1 ? m.chat_searches_one : m.chat_searches_other)({
          count: searches,
        })
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  let icon = <Icon icon={CheckmarkCircle02Icon} />;
  if (busy) {
    icon = <Icon className="animate-spin" icon={LoaderCircleIcon} />;
  } else if (failed > 0) {
    icon = <Icon icon={AlertCircleIcon} />;
  }
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine status={busy ? "running" : undefined}>
          <TraceIcon>{icon}</TraceIcon>
          <TraceTitle className={cn(busy && "animate-pulse")}>
            {title}
          </TraceTitle>
          <TraceDescription>
            {counts}
            {failed > 0 ? ` · ${m.chat_failed_count({ count: failed })}` : ""}
          </TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="flex flex-col gap-1.5 py-0.5">
        {rows.map((r) => (
          <TraceLine
            key={r.label}
            status={r.failed && !r.running ? "error" : undefined}
          >
            <TraceIcon>
              {r.running && busy ? (
                <Icon
                  className="size-3.5 animate-spin"
                  icon={LoaderCircleIcon}
                />
              ) : (
                <Icon className="size-3.5" icon={PencilEdit01Icon} />
              )}
            </TraceIcon>
            <TraceTitle>{r.label}</TraceTitle>
            {r.count > 1 ? (
              <TraceDescription>×{r.count}</TraceDescription>
            ) : null}
          </TraceLine>
        ))}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

function Thought({ text, running }: { text: string; running: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  return (
    <TraceCollapsible onOpenChange={setOpen} open={open ?? running}>
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? "running" : undefined}>
          <TraceIcon>
            {running ? (
              <Icon className="animate-spin" icon={LoaderCircleIcon} />
            ) : (
              <Icon icon={CheckmarkCircle02Icon} />
            )}
          </TraceIcon>
          <TraceTitle className={cn(running && "animate-pulse")}>
            {running ? m.chat_thinking() : m.chat_thought()}
          </TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-wrap">
        {text}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

export function Thinking() {
  return (
    <Trace>
      <TraceLine status="running">
        <TraceIcon>
          <Icon className="animate-spin" icon={LoaderCircleIcon} />
        </TraceIcon>
        <TraceTitle className="animate-pulse">{m.chat_thinking()}</TraceTitle>
      </TraceLine>
    </Trace>
  );
}
