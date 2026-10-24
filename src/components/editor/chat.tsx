import { useChat } from "@ai-sdk/react";
import { Cancel01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Icon } from "#/components/icon";
import { openSignupGate } from "#/components/signup-gate";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "#/components/ui/message-scroller";
import { attachType, withAttachType } from "#/lib/attachments";
import { type CV, newId } from "#/lib/cv/schema";
import { clearChat } from "#/lib/cv/share";
import type { TemplateId } from "#/lib/cv/templates";
import { ensureDeviceId } from "#/lib/device-id";
import { isGuestLimit, type LimitKind, limitOf } from "#/lib/guest";
import { track, trackOnce } from "#/lib/track";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

import { Composer } from "./chat/composer";
import { ChatEmpty } from "./chat/empty";
import { ChatHeader, type DockTab } from "./chat/header";
import { type ChatContext, contextText, toFileParts } from "./chat/shared";
import { ChatMessage, Thinking } from "./chat/thread";

// biome-ignore lint/performance/noBarrelFile: src/routes/cv.$id.tsx imports these from here; the definitions live next to the chat parts
export { type ChatContext, CONTEXT_MARK } from "./chat/shared";

export function ChatPanel({
  cvId,
  initialMessages,
  getState,
  onRemoteChange,
  contexts,
  onRemoveContext,
  onClearContexts,
  focusKey,
  pendingPrompt,
  onPendingPromptSent,
  title,
  onShare,
  onAiTurn,
  history,
  guestAiLeft = null,
  limitKind = null,
}: {
  /** Free AI messages a guest has left; null when signed up. */
  guestAiLeft?: number | null;
  /** Why the free limits apply (guest or unconfirmed email). */
  limitKind?: LimitKind | null;
  /** The History tab's content, shown in place of the chat. */
  history?: ReactNode;
  cvId: string;
  /** A message is being sent: the AI's edits in its reply form one step. */
  onAiTurn?: (prompt: string) => void;
  /** CV name, used for the exported chat's file name. */
  title: string;
  onShare: () => void;
  initialMessages: UIMessage[];
  getState: () => { cv: CV; template: TemplateId };
  onRemoteChange: (next: { cv: CV; template: TemplateId }) => void;
  contexts: ChatContext[];
  onRemoveContext: (id: string) => void;
  onClearContexts: () => void;
  /** Changes whenever the chat input should take focus (e.g. after "Ask AI"). */
  focusKey: number;
  /** One-click prompt (e.g. "Shorten") to send with the current contexts. */
  pendingPrompt?: { id: string; text: string; files?: FileUIPart[] } | null;
  onPendingPromptSent?: () => void;
}) {
  const [input, setInput] = useState("");
  const lastInput = useRef("");
  const [tab, setTab] = useState<DockTab>("chat");
  const [files, setFiles] = useState<File[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const stateRef = useRef(getState);
  stateRef.current = getState;
  const remoteRef = useRef(onRemoteChange);
  remoteRef.current = onRemoteChange;

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    id: cvId,
    messages: initialMessages,
    // A reply still streaming when the page reloads picks up where it is.
    resume: true,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => {
        const s = stateRef.current();
        return { cvId, cv: s.cv, template: s.template, locale: getLocale() };
      },
      prepareReconnectToStreamRequest: () => ({
        api: `/api/chat-stream/${cvId}`,
      }),
    }),
    onError: (e) => {
      // The server refused: the guest is out of free messages. Take the
      // question back out of the thread and put it in the box again.
      const limit = limitOf(e);
      if (limit) {
        setAiLeft(0);
        setMessages((list) =>
          list.at(-1)?.role === "user" ? list.slice(0, -1) : list
        );
        setInput(lastInput.current);
        openSignupGate("ai", limit);
      } else {
        track("ai_error", {
          reason: (e.message || "error").slice(0, 80),
          guest: guestAiLeft !== null,
        });
      }
    },
    onData: (part) => {
      if (part.type === "data-cv") {
        trackOnce(`edit:${cvId}`, "first_edit", { how: "ai" });
        remoteRef.current(part.data as { cv: CV; template: TemplateId });
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (focusKey > 0) {
      textarea.current?.focus();
    }
  }, [focusKey]);

  const canSend = Boolean(input.trim() || files.length || contexts.length);
  const [aiLeft, setAiLeft] = useState(guestAiLeft);
  useEffect(() => {
    if (guestAiLeft !== null) {
      ensureDeviceId();
    }
  }, [guestAiLeft]);
  /** Guests out of free messages are asked to sign up instead. */
  const spendAiMessage = useCallback(() => {
    if (aiLeft === null) {
      return true;
    }
    if (aiLeft <= 0) {
      openSignupGate("ai", limitKind ?? "guest");
      return false;
    }
    setAiLeft(aiLeft - 1);
    return true;
  }, [aiLeft, limitKind]);

  // Messages typed while a reply is streaming wait here and go out in
  // order, one per finished reply.
  const [queue, setQueue] = useState<Queued[]>([]);
  const submit = useCallback(async () => {
    if (!canSend) {
      return;
    }
    const text = input;
    const parts = buildParts(contexts, await toFileParts(files, cvId), text);
    setInput("");
    setFiles([]);
    onClearContexts();
    if (busy || queue.length > 0) {
      setQueue((q) => [...q, { id: newId(), text, parts }]);
      return;
    }
    if (!spendAiMessage()) {
      setInput(text);
      return;
    }
    lastInput.current = text;
    onAiTurn?.(text || m.chat_improve_turn());
    track("ai_message_sent", {
      how: contexts.length > 0 ? "clip" : "typed",
      guest: guestAiLeft !== null,
      files: files.length,
    });
    sendMessage({ role: "user", parts });
  }, [
    busy,
    queue.length,
    canSend,
    contexts,
    cvId,
    files,
    input,
    onAiTurn,
    onClearContexts,
    sendMessage,
    spendAiMessage,
    guestAiLeft,
  ]);

  useEffect(() => {
    const [next] = queue;
    if (!next || busy || pendingPrompt) {
      return;
    }
    setQueue((q) => q.slice(1));
    if (!spendAiMessage()) {
      setInput(next.text);
      return;
    }
    lastInput.current = next.text;
    onAiTurn?.(next.text || m.chat_improve_turn());
    track("ai_message_sent", { how: "typed", guest: guestAiLeft !== null });
    sendMessage({ role: "user", parts: next.parts });
  }, [
    queue,
    busy,
    pendingPrompt,
    spendAiMessage,
    onAiTurn,
    sendMessage,
    guestAiLeft,
  ]);
  const unqueue = useCallback(
    (id: string) => setQueue((q) => q.filter((x) => x.id !== id)),
    []
  );

  // Canvas "Ask AI" actions: send the prompt with the current contexts as
  // soon as no reply is streaming. The typed draft and attached files stay.
  const sentPrompt = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingPrompt || busy || sentPrompt.current === pendingPrompt.id) {
      return;
    }
    sentPrompt.current = pendingPrompt.id;
    if (!spendAiMessage()) {
      onPendingPromptSent?.();
      return;
    }
    onAiTurn?.(pendingPrompt.text);
    track("ai_message_sent", {
      how: pendingPrompt.files?.length ? "import" : "quick",
      guest: guestAiLeft !== null,
    });
    sendMessage({
      role: "user",
      parts: buildParts(
        contexts,
        pendingPrompt.files ?? [],
        pendingPrompt.text
      ),
    });
    onClearContexts();
    onPendingPromptSent?.();
  }, [
    pendingPrompt,
    busy,
    contexts,
    sendMessage,
    spendAiMessage,
    onAiTurn,
    onClearContexts,
    onPendingPromptSent,
    guestAiLeft,
  ]);

  const pickSuggestion = useCallback((s: string) => {
    setInput(s.endsWith("\n") ? s : `${s} `);
    textarea.current?.focus();
  }, []);
  const addFiles = useCallback(
    (added: File[]) => setFiles((cur) => [...cur, ...added]),
    []
  );
  const removeFile = useCallback(
    (file: File) => setFiles((cur) => cur.filter((f) => f !== file)),
    []
  );
  const handleStop = useCallback(() => {
    stop();
    // The server keeps generating for reloads; tell it to stop as well.
    fetch(`/api/chat-stream/${cvId}`, { method: "DELETE" }).catch(() => {
      // Nothing to do: the reply ends on its own.
    });
  }, [cvId, stop]);

  // Files dragged onto the chat card are attached, like the paperclip.
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) {
      return;
    }
    e.preventDefault();
    depth.current += 1;
    setDragging(true);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);
  const onDragLeave = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) {
      setDragging(false);
    }
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) {
        return;
      }
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      const ok = dropped
        .filter((f) => attachType(f) !== null)
        .map(withAttachType);
      if (ok.length < dropped.length) {
        toast.error(m.chat_drop_unsupported());
      }
      if (ok.length > 0) {
        setTab("chat");
        addFiles(ok);
        textarea.current?.focus();
      }
    },
    [addFiles]
  );
  const exportChat = useCallback(
    () =>
      downloadText(
        `${m.chat_export_filename({ title: title || m.chat_export_untitled() })}.md`,
        chatMarkdown(messages)
      ),
    [messages, title]
  );
  const clear = useCallback(async () => {
    stop();
    setMessages([]);
    try {
      await clearChat({ data: { id: cvId } });
    } catch {
      toast.error(m.chat_clear_failed());
    }
  }, [cvId, setMessages, stop]);
  const lastId = messages.at(-1)?.id;

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <DropZone
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {dragging ? <DropOverlay /> : null}
        <ChatHeader
          hasMessages={messages.length > 0}
          onClear={clear}
          onExport={exportChat}
          onShare={onShare}
          onTab={setTab}
          tab={tab}
        />
        {tab === "history" ? (
          <div className="min-h-0 flex-1">{history}</div>
        ) : null}
        <div
          className={cn(
            "relative min-h-0 flex-1",
            tab === "history" && "hidden"
          )}
        >
          {messages.length === 0 ? (
            <ChatEmpty onFiles={addFiles} onPrompt={pickSuggestion} />
          ) : (
            <MessageScroller className="cv-fade-in">
              <MessageScrollerViewport>
                <MessageScrollerContent
                  aria-busy={busy}
                  className="gap-6 px-4 py-5"
                >
                  {messages.map((msg) => (
                    <MessageScrollerItem
                      key={msg.id}
                      messageId={msg.id}
                      scrollAnchor={msg.role === "user"}
                    >
                      <ChatMessage
                        message={msg}
                        streaming={busy && msg.id === lastId}
                      />
                    </MessageScrollerItem>
                  ))}
                  {status === "submitted" ? (
                    <MessageScrollerItem>
                      <Thinking />
                    </MessageScrollerItem>
                  ) : null}
                  {error && !isGuestLimit(error) ? (
                    <MessageScrollerItem>
                      <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-destructive text-sm">
                        {error.message || m.chat_error_generic()}
                      </p>
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <ScrollToEndWhenShown />
              <MessageScrollerButton className="size-8 border-0 shadow-[0_2px_10px_rgb(0_0_0/0.12)]" />
            </MessageScroller>
          )}
        </div>

        <div className={cn("p-2 pt-1", tab === "history" && "hidden")}>
          {queue.length > 0 ? (
            <QueueList items={queue} onRemove={unqueue} />
          ) : null}
          {aiLeft === null ? null : (
            <GuestMeter kind={limitKind ?? "guest"} left={aiLeft} />
          )}
          <Composer
            busy={busy}
            canSend={canSend}
            contexts={contexts}
            files={files}
            onAddFiles={addFiles}
            onChange={setInput}
            onRemoveContext={onRemoveContext}
            onRemoveFile={removeFile}
            onStop={handleStop}
            onSubmit={submit}
            textareaRef={textarea}
            value={input}
          />
        </div>
      </DropZone>
    </MessageScrollerProvider>
  );
}

/** The chat as Markdown: what each side wrote, with links to attached files. */
function chatMarkdown(messages: UIMessage[]) {
  const { origin } = window.location;
  return messages
    .map((msg) => {
      const text = msg.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text.trim())
        .filter(Boolean)
        .join("\n\n");
      const files = msg.parts
        .filter((p) => p.type === "file")
        .map((p) => {
          const name = p.filename || m.chat_export_file();
          // Inline images (clips) have no address to link to.
          return p.url.startsWith("data:")
            ? `- ${name}`
            : `- [${name}](${new URL(p.url, origin).href})`;
        });
      const body = [text, files.length ? files.join("\n") : ""]
        .filter(Boolean)
        .join("\n\n");
      const who =
        msg.role === "user" ? m.chat_export_you() : m.chat_export_ai();
      return body ? `**${who}:**\n\n${body}` : "";
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/markdown;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[\\/:*?"<>|]+/g, "");
  a.click();
  URL.revokeObjectURL(url);
}

/** The chat card as a drop target for files (the paperclip is the
 * keyboard-accessible way to attach). rr-block: the chat's text never
 * appears in session replays. */
function DropZone(props: React.ComponentProps<"div">) {
  return (
    <div
      className="rr-block relative flex h-full min-h-0 flex-col"
      {...props}
    />
  );
}

function DropOverlay() {
  return (
    <div className="fade-in-0 pointer-events-none absolute inset-2 z-30 flex animate-in flex-col items-center justify-center gap-1 rounded-[18px] bg-background/90 ring-2 ring-dashed ring-foreground/15 backdrop-blur-[2px] duration-150">
      <span className="font-medium text-[15px]">{m.chat_drop_title()}</span>
      <span className="text-[13px] text-muted-foreground">
        {m.chat_drop_hint()}
      </span>
    </div>
  );
}

interface Queued {
  id: string;
  parts: UIMessage["parts"];
  text: string;
}

function QueueList({
  items,
  onRemove,
}: {
  items: Queued[];
  onRemove: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1 px-1 pb-1.5">
      {items.map((q) => (
        <QueueRow item={q} key={q.id} onRemove={onRemove} />
      ))}
    </ul>
  );
}

function QueueRow({
  item,
  onRemove,
}: {
  item: Queued;
  onRemove: (id: string) => void;
}) {
  const remove = useCallback(() => onRemove(item.id), [item.id, onRemove]);
  return (
    <li className="fade-in-0 slide-in-from-bottom-1 flex animate-in items-center gap-2 rounded-[12px] bg-surface py-1.5 pr-1 pl-3 text-[13px] duration-150">
      <span className="shrink-0 text-[12px] text-muted-foreground">
        {m.chat_queued()}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {item.text || m.chat_improve_turn()}
      </span>
      <button
        aria-label={m.chat_queue_remove()}
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
        onClick={remove}
        type="button"
      >
        <Icon className="size-3.5" icon={Cancel01Icon} />
      </button>
    </li>
  );
}

function GuestMeter({ left, kind }: { left: number; kind: LimitKind }) {
  const openGate = useCallback(() => openSignupGate("ai", kind), [kind]);
  return (
    <div className="flex items-center justify-between gap-2 px-2 pb-1.5 text-[12px]">
      <span
        className={left === 0 ? "text-foreground" : "text-muted-foreground"}
      >
        {left === 0
          ? m.chat_guest_out()
          : (left === 1 ? m.chat_guest_left_one : m.chat_guest_left_other)({
              count: left,
            })}
      </span>
      <button
        className="font-medium text-foreground underline-offset-2 hover:underline"
        onClick={openGate}
        type="button"
      >
        {kind === "verify" ? m.chat_verify_link() : m.chat_guest_signup()}
      </button>
    </div>
  );
}

function buildParts(
  contexts: ChatContext[],
  fileParts: FileUIPart[],
  text: string
) {
  const parts: UIMessage["parts"] = [];
  if (contexts.length > 0) {
    parts.push({ type: "text", text: contextText(contexts) });
    for (const c of contexts) {
      if (c.image) {
        parts.push({
          type: "file",
          mediaType: "image/png",
          filename: `${c.label}.png`,
          url: c.image,
        });
      }
    }
  }
  parts.push(...fileParts);
  parts.push({
    type: "text",
    text:
      text.trim() ||
      (contexts.length ? m.chat_improve_part() : m.chat_here_is_my_cv()),
  });
  return parts;
}

/**
 * On mobile the chat tab is display:none when the editor loads, so the
 * scroller can't measure. Jump to the newest message once it becomes visible.
 */
function ScrollToEndWhenShown() {
  const { scrollToEnd } = useMessageScroller();
  const probe = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = probe.current?.parentElement;
    if (!el) {
      return;
    }
    let visible = el.offsetHeight > 0;
    let frame = 0;
    // Items use content-visibility:auto, so heights settle over a few frames.
    const settle = (left: number) => {
      scrollToEnd({ behavior: "instant" });
      if (left > 0) {
        frame = requestAnimationFrame(() => settle(left - 1));
      }
    };
    const ro = new ResizeObserver(() => {
      const now = el.offsetHeight > 0;
      if (now && !visible) {
        settle(8);
      }
      visible = now;
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [scrollToEnd]);
  return <span hidden ref={probe} />;
}
