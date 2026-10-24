import {
  ArrowUp02Icon,
  Attachment01Icon,
  Cancel01Icon,
  SparklesIcon,
  StopIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useRef } from "react";

import { Icon } from "#/components/icon";
import { FileType, getFileType } from "#/components/reui/file-type";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "#/components/ui/input-group";
import { ATTACH_ACCEPT } from "#/lib/attachments";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

import { formatBytes } from "./shared";
import type { ChatContext } from "./shared";

const ChipCard = ({
  media,
  title,
  meta,
  onRemove,
  removeLabel,
}: {
  media: React.ReactNode;
  title: string;
  meta: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) => (
  <div className="group/chip bg-background ring-foreground/[0.08] relative flex max-w-[260px] items-center gap-2.5 rounded-[12px] p-1.5 pr-7 ring-1">
    {media}
    <span className="min-w-0">
      <span className="block truncate text-[12.5px] leading-tight font-medium">
        {title}
      </span>
      <span className="text-muted-foreground block truncate text-[11.5px] leading-tight">
        {meta}
      </span>
    </span>
    <button
      aria-label={removeLabel}
      className="text-muted-foreground hover:bg-surface hover:text-foreground absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-colors"
      onClick={onRemove}
      type="button"
    >
      <Icon className="size-3.5" icon={Cancel01Icon} />
    </button>
  </div>
);

const TILE = "size-8 shrink-0 rounded-[8px]";

const ContextChip = ({
  context,
  onRemove,
}: {
  context: ChatContext;
  onRemove: (id: string) => void;
}) => {
  const remove = useCallback(
    () => onRemove(context.id),
    [context.id, onRemove]
  );
  const n = context.fields.length;
  return (
    <ChipCard
      media={
        context.image ? (
          <img
            alt=""
            className={`${TILE} ring-foreground/[0.06] bg-white object-cover object-top ring-1`}
            height={32}
            src={context.image}
            width={32}
          />
        ) : (
          <span
            className={`${TILE} bg-surface flex items-center justify-center`}
          >
            <Icon
              className="text-muted-foreground size-4"
              icon={SparklesIcon}
            />
          </span>
        )
      }
      meta={
        n > 0
          ? (n === 1 ? m.chat_fields_one : m.chat_fields_other)({ count: n })
          : m.chat_part_of_cv()
      }
      onRemove={remove}
      removeLabel={m.chat_remove({ name: context.label })}
      title={context.label}
    />
  );
};

const FileChip = ({
  file,
  onRemove,
}: {
  file: File;
  onRemove: (file: File) => void;
}) => {
  const remove = useCallback(() => onRemove(file), [file, onRemove]);
  const preview = file.type.startsWith("image/");
  // The object URL lives exactly as long as the <img> showing it.
  const previewRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) {
        return;
      }
      const url = URL.createObjectURL(file);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [file]
  );
  const kind = getFileType(file.name || file.type);
  return (
    <ChipCard
      media={
        preview ? (
          <img
            alt=""
            className={`${TILE} object-cover`}
            height={32}
            ref={previewRef}
            width={32}
          />
        ) : (
          <FileType className="shrink-0" size="sm" type={kind} />
        )
      }
      meta={
        <>
          <span className="tracking-wide uppercase">{String(kind)}</span> ·{" "}
          {formatBytes(file.size)}
        </>
      }
      onRemove={remove}
      removeLabel={m.chat_remove({ name: file.name })}
      title={file.name}
    />
  );
};

export const Composer = ({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  canSend,
  contexts,
  onRemoveContext,
  files,
  onAddFiles,
  onRemoveFile,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  canSend: boolean;
  contexts: ChatContext[];
  onRemoveContext: (id: string) => void;
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (file: File) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const pickFiles = useCallback(() => fileInput.current?.click(), []);
  const handleFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onAddFiles([...e.target.files]);
      }
      e.target.value = "";
    },
    [onAddFiles]
  );
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange]
  );
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  const hasChips = contexts.length > 0 || files.length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <input
        accept={ATTACH_ACCEPT}
        className="sr-only"
        multiple
        onChange={handleFiles}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      />
      <InputGroup className="bg-surface focus-within:bg-surface-2 has-disabled:bg-surface rounded-[16px] border-transparent transition-colors has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0">
        {hasChips ? (
          <InputGroupAddon
            align="block-start"
            className="flex-wrap gap-1.5 px-3 pt-3"
          >
            {contexts.map((c) => (
              <ContextChip context={c} key={c.id} onRemove={onRemoveContext} />
            ))}
            {files.map((f) => (
              <FileChip
                file={f}
                key={`${f.name}-${f.size}-${f.lastModified}`}
                onRemove={onRemoveFile}
              />
            ))}
          </InputGroupAddon>
        ) : null}
        <InputGroupTextarea
          aria-label={m.chat_message()}
          className="max-h-48 min-h-14 px-4 pt-3 pb-1 text-[15px] focus-visible:bg-transparent md:text-[15px]"
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            contexts.length
              ? m.chat_placeholder_context()
              : m.chat_placeholder()
          }
          ref={textareaRef}
          value={value}
        />
        <InputGroupAddon align="block-end" className="px-2 pb-2">
          <InputGroupButton
            aria-label={m.chat_attach()}
            className="text-muted-foreground hover:text-foreground rounded-full hover:bg-black/5"
            onClick={pickFiles}
            size="icon-sm"
            title={m.chat_attach_title()}
          >
            <Icon icon={Attachment01Icon} />
          </InputGroupButton>
          {busy && canSend ? (
            <InputGroupButton
              aria-label={m.chat_queue_send()}
              className="ml-auto rounded-full"
              size="icon-sm"
              type="submit"
              variant="secondary"
            >
              <Icon icon={ArrowUp02Icon} />
            </InputGroupButton>
          ) : null}
          {busy ? (
            <InputGroupButton
              aria-label={m.chat_stop()}
              className={cn("rounded-full", !canSend && "ml-auto")}
              onClick={onStop}
              size="icon-sm"
              variant="default"
            >
              <Icon className="size-3 fill-current" icon={StopIcon} />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              aria-label={m.chat_send()}
              className="ml-auto rounded-full"
              disabled={!canSend}
              size="icon-sm"
              type="submit"
              variant="default"
            >
              <Icon icon={ArrowUp02Icon} />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
