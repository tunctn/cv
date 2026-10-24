import {
  ArrowRight01Icon,
  FileUploadIcon,
  FlashIcon,
  Target02Icon,
  UserEdit01Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useRef } from "react";

import { Icon, type IconSvgElement } from "#/components/icon";
import { m } from "#/paraglide/messages.js";

interface Start {
  hint: () => string;
  icon: IconSvgElement;
  id: string;
  /** Text put in the composer; null opens the file picker instead. */
  prompt: (() => string) | null;
  title: () => string;
}

const STARTS: Start[] = [
  {
    id: "import",
    icon: FileUploadIcon,
    title: m.chat_start_import,
    hint: m.chat_start_import_hint,
    prompt: null,
  },
  {
    id: "tailor",
    icon: Target02Icon,
    title: m.chat_start_tailor,
    hint: m.chat_start_tailor_hint,
    prompt: m.chat_start_tailor_prompt,
  },
  {
    id: "bullets",
    icon: FlashIcon,
    title: m.chat_start_bullets,
    hint: m.chat_start_bullets_hint,
    prompt: m.chat_suggest_bullets,
  },
  {
    id: "profile",
    icon: UserEdit01Icon,
    title: m.chat_start_profile,
    hint: m.chat_start_profile_hint,
    prompt: m.chat_suggest_summary,
  },
];

/**
 * A new chat: a short greeting and four ways to start, as a list of rows
 * sitting right above the composer.
 */
export function ChatEmpty({
  onPrompt,
  onFiles,
}: {
  onPrompt: (text: string) => void;
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pickFiles = useCallback(() => input.current?.click(), []);
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        onFiles(Array.from(e.target.files));
        onPrompt(m.chat_start_import_prompt());
      }
      e.target.value = "";
    },
    [onFiles, onPrompt]
  );

  return (
    <div className="cv-fade-in flex h-full flex-col justify-end gap-5 px-3 pb-3">
      <div className="flex flex-col gap-1 px-2">
        <h2 className="font-semibold text-[20px] tracking-[-0.02em]">
          {m.chat_start_title()}
        </h2>
        <p className="text-[14px] text-muted-foreground">
          {m.chat_start_body()}
        </p>
      </div>
      <ul className="flex flex-col overflow-hidden rounded-[18px] bg-surface p-1">
        {STARTS.map((s) => (
          <StartRow
            key={s.id}
            onFiles={pickFiles}
            onPrompt={onPrompt}
            start={s}
          />
        ))}
      </ul>
      <input
        accept="application/pdf,image/*,text/plain"
        className="hidden"
        multiple
        onChange={onChange}
        ref={input}
        type="file"
      />
    </div>
  );
}

function StartRow({
  start,
  onPrompt,
  onFiles,
}: {
  start: Start;
  onPrompt: (text: string) => void;
  onFiles: () => void;
}) {
  const run = useCallback(() => {
    if (start.prompt) {
      onPrompt(start.prompt());
    } else {
      onFiles();
    }
  }, [onFiles, onPrompt, start]);
  return (
    <li>
      <button
        className="group flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-background hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        onClick={run}
        type="button"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-foreground/[0.06]">
          <Icon className="size-4" icon={start.icon} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium text-[14px]">{start.title()}</span>
          <span className="truncate text-[12.5px] text-muted-foreground">
            {start.hint()}
          </span>
        </span>
        <Icon
          className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
          icon={ArrowRight01Icon}
        />
      </button>
    </li>
  );
}
