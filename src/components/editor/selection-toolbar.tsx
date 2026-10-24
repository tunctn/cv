import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowShrink02Icon,
  ArrowUp02Icon,
  Briefcase01Icon,
  Copy01Icon,
  Delete02Icon,
  FlashIcon,
  LayoutTwoColumnIcon,
  Link02Icon,
  ListPlusIcon,
  Message01Icon,
  PencilEdit01Icon,
  SparklesIcon,
  SpellCheckIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  activeMarks,
  applyLink,
  type EditorApi,
  type FieldSelection,
  type Mark,
  saveSelection,
  toggleMark,
  useEditor,
} from "#/components/cv/editing";
import { Icon, type IconSvgElement } from "#/components/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { sectionLabel } from "#/lib/cv/i18n-labels";
import {
  blankFor,
  duplicateAt,
  getIn,
  insertAt,
  moveIn,
  type Path,
  removeAt,
  removeCustomSection,
  setIn,
  splitIndex,
} from "#/lib/cv/paths";
import {
  type CustomKey,
  type CV,
  customKey,
  isCustomKey,
  newId,
  type OrderKey,
  SECTION_KEYS,
  type SectionKey,
} from "#/lib/cv/schema";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

import { useAnchor } from "./canvas";

interface Action {
  danger?: boolean;
  disabled?: boolean;
  icon: IconSvgElement;
  key: string;
  label: string;
  run: () => void;
}

/** One-click AI rewrites, sent to the chat with the selected part as context. */
const AI_ACTIONS: {
  key: string;
  label: () => string;
  prompt: () => string;
  icon: IconSvgElement;
}[] = [
  {
    key: "rewrite",
    label: m.ed_ai_rewrite,
    prompt: m.ed_ai_rewrite_prompt,
    icon: PencilEdit01Icon,
  },
  {
    key: "shorten",
    label: m.ed_ai_shorten,
    prompt: m.ed_ai_shorten_prompt,
    icon: ArrowShrink02Icon,
  },
  {
    key: "stronger",
    label: m.ed_ai_stronger,
    prompt: m.ed_ai_stronger_prompt,
    icon: FlashIcon,
  },
  {
    key: "formal",
    label: m.ed_ai_formal,
    prompt: m.ed_ai_formal_prompt,
    icon: Briefcase01Icon,
  },
  {
    key: "grammar",
    label: m.ed_ai_grammar,
    prompt: m.ed_ai_grammar_prompt,
    icon: SpellCheckIcon,
  },
];

const MARKS: {
  mark: Mark;
  label: () => string;
  shortcut: string;
  icon: IconSvgElement;
}[] = [
  { mark: "bold", label: m.ed_bold, shortcut: "⌘B", icon: TextBoldIcon },
  { mark: "italic", label: m.ed_italic, shortcut: "⌘I", icon: TextItalicIcon },
  {
    mark: "underline",
    label: m.ed_underline,
    shortcut: "⌘U",
    icon: TextUnderlineIcon,
  },
];

/** What one item of each list is called, and its "Add …" action. */
const ITEM_NAMES: Record<string, { name: () => string; add: () => string }> = {
  experience: { name: m.cv_sel_job, add: m.ed_add_job },
  education: { name: m.cv_sel_education, add: m.ed_add_education },
  skills: { name: m.cv_sel_skill_group, add: m.ed_add_skill_group },
  projects: { name: m.cv_sel_project, add: m.ed_add_project },
  languages: { name: m.cv_sel_language, add: m.ed_add_language },
};

function describe(path: Path): string {
  if (path === "basics") {
    return m.cv_sel_details();
  }
  if (path === "basics.summary") {
    return m.cv_sel_profile();
  }
  if (path.startsWith("sections.")) {
    const key = path.slice(9);
    return SECTION_KEYS.includes(key as SectionKey)
      ? sectionLabel(key as SectionKey)
      : m.cv_sel_section();
  }
  if (path.includes(".highlights.")) {
    return m.cv_sel_bullet();
  }
  if (path.startsWith("custom.")) {
    return m.cv_sel_entry();
  }
  if (path.includes(".items.")) {
    return m.cv_sel_skill();
  }
  const [top] = path.split(".");
  return ITEM_NAMES[top]?.name() ?? m.ed_drag_item();
}

type Change = (update: (cv: CV) => CV) => void;
type Select = (path: Path | null) => void;

/** Move up / move down for an item at `index` in a list of `length`. */
function moveActions(
  length: number,
  index: number,
  move: (to: number) => void
): Action[] {
  return [
    {
      key: "up",
      label: m.ed_move_up(),
      icon: ArrowUp02Icon,
      disabled: index <= 0,
      run: () => move(index - 1),
    },
    {
      key: "down",
      label: m.ed_move_down(),
      icon: ArrowDown02Icon,
      disabled: index >= length - 1,
      run: () => move(index + 1),
    },
  ];
}

/** "Add entry" and "Delete section" for a section the user made. */
function customSectionActions(
  cv: CV,
  key: CustomKey,
  onChange: Change,
  onSelect: Select
): Action[] {
  const i = cv.custom.findIndex((s) => customKey(s.id) === key);
  if (i === -1) {
    return [];
  }
  return [
    {
      key: "add",
      label: m.editor_add_entry(),
      icon: Add01Icon,
      run: () => {
        const at = cv.custom[i].items.length;
        const list = `custom.${i}.items`;
        onChange((c) => insertAt(c, list, at, blankFor(list)));
        onSelect(`${list}.${at}`);
      },
    },
    {
      key: "del",
      label: m.editor_delete_section(),
      icon: Delete02Icon,
      danger: true,
      run: () => {
        onChange((c) => removeCustomSection(c, key));
        onSelect(null);
      },
    },
  ];
}

/** Structural actions for the selected element: add, duplicate, delete… */
function itemActions(
  cv: CV,
  path: Path,
  onChange: Change,
  onSelect: Select
): Action[] {
  if (path === "basics") {
    return [
      {
        key: "link",
        label: m.ed_add_link(),
        icon: Add01Icon,
        run: () =>
          onChange((c) =>
            setIn(c, "basics.links", [
              ...c.basics.links,
              { id: newId(), label: "", url: "" },
            ])
          ),
      },
    ];
  }
  if (path === "basics.summary") {
    return [
      {
        key: "clear",
        label: m.ed_remove_profile(),
        icon: Delete02Icon,
        danger: true,
        run: () => {
          onChange((c) => setIn(c, "basics.summary", ""));
          onSelect(null);
        },
      },
    ];
  }
  if (path.startsWith("sections.")) {
    const key = path.slice(9) as OrderKey;
    const order = cv.sectionOrder.indexOf(key);
    const move = moveActions(cv.sectionOrder.length, order, (to) =>
      onChange((c) => moveIn(c, "sectionOrder", order, to))
    );
    if (isCustomKey(key)) {
      return [...move, ...customSectionActions(cv, key, onChange, onSelect)];
    }
    return [
      ...move,
      {
        key: "add",
        label: ITEM_NAMES[key].add(),
        icon: Add01Icon,
        run: () => {
          const at = cv[key].length;
          onChange((c) => insertAt(c, key, at, blankFor(key)));
          onSelect(`${key}.${at}`);
        },
      },
    ];
  }
  const loc = splitIndex(path);
  if (!loc) {
    return [];
  }
  const { list, index } = loc;
  const item = getIn(cv, path);
  const siblings = getIn(cv, list);
  const actions: Action[] = Array.isArray(siblings)
    ? moveActions(siblings.length, index, (to) => {
        onChange((c) => moveIn(c, list, index, to));
        onSelect(`${list}.${to}`);
      })
    : [];
  if (item && typeof item === "object" && "highlights" in item) {
    const n = (item.highlights as string[]).length;
    actions.push({
      key: "bullet",
      label: m.ed_add_bullet(),
      icon: ListPlusIcon,
      run: () => {
        onChange((c) => insertAt(c, `${path}.highlights`, n, ""));
        onSelect(`${path}.highlights.${n}`);
      },
    });
  }
  if (
    item &&
    typeof item === "object" &&
    "items" in item &&
    "columns" in item
  ) {
    const n = (item.items as unknown[]).length;
    actions.push(
      {
        key: "skill",
        label: m.ed_add_skill(),
        icon: ListPlusIcon,
        run: () => {
          onChange((c) =>
            insertAt(c, `${path}.items`, n, blankFor(`${path}.items`))
          );
          onSelect(`${path}.items.${n}`);
        },
      },
      {
        key: "cols",
        label: item.columns === 2 ? m.ed_show_1_col() : m.ed_show_2_cols(),
        icon: LayoutTwoColumnIcon,
        run: () =>
          onChange((c) =>
            setIn(c, `${path}.columns`, item.columns === 2 ? 1 : 2)
          ),
      }
    );
  }
  actions.push(
    {
      key: "below",
      label: m.ed_add_below(),
      icon: Add01Icon,
      run: () => {
        onChange((c) => insertAt(c, list, index + 1, blankFor(list)));
        onSelect(`${list}.${index + 1}`);
      },
    },
    {
      key: "dup",
      label: m.ed_duplicate(),
      icon: Copy01Icon,
      run: () => {
        onChange((c) => duplicateAt(c, list, index));
        onSelect(`${list}.${index + 1}`);
      },
    },
    {
      key: "del",
      label: m.common_delete(),
      icon: Delete02Icon,
      danger: true,
      run: () => {
        onChange((c) => removeAt(c, list, index));
        onSelect(null);
      },
    }
  );
  return actions;
}

/** Re-reads which marks the text selection has whenever the selection moves. */
function useMarks() {
  const [marks, setMarks] = useState<Record<Mark, boolean> | null>(null);
  useEffect(() => {
    const update = () => setMarks(activeMarks());
    update();
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);
  return marks;
}

export function SelectionToolbar({
  container,
  cv,
  path,
  onChange,
  onSelect,
  onAsk,
}: {
  container: RefObject<HTMLDivElement | null>;
  cv: CV;
  path: Path;
  onChange: Change;
  onSelect: Select;
  onAsk: (path: Path, label: string, text: string, prompt?: string) => void;
}) {
  const pos = useAnchor(container, path, [cv]);
  const editor = useEditor();
  const marks = useMarks();
  const [linking, setLinking] = useState<FieldSelection | null>(null);

  // Keep the text selection inside the field when a toolbar button is pressed.
  const keepSelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
    }
  }, []);

  const label = describe(path);
  const ask = useCallback(
    (prompt?: string) => {
      const el = container.current?.querySelector<HTMLElement>(
        `.cv-sheet [data-sel="${CSS.escape(path)}"]`
      );
      onAsk(path, label, el?.innerText.trim() ?? "", prompt);
    },
    [container, label, onAsk, path]
  );

  const startLink = useCallback(() => {
    const s = saveSelection();
    if (s) {
      setLinking(s);
    } else {
      toast(m.ed_select_text_first());
    }
  }, []);

  if (!pos) {
    return null;
  }
  const above = pos.top > 48;
  const actions = itemActions(cv, path, onChange, onSelect);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: only keeps the text selection and stops the canvas from deselecting
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: same as above
    <div
      className="cv-toolbar absolute z-20 flex items-center gap-0.5 rounded-full bg-background p-1 shadow-[0_4px_20px_rgba(0,0,0,0.08)] ring-1 ring-foreground/[0.07]"
      onMouseDown={keepSelection}
      style={{
        top: above ? pos.top - 46 : pos.top + 8,
        left: Math.max(8, pos.left - 4),
      }}
    >
      {linking && editor ? (
        <LinkInput editor={editor} onDone={setLinking} selection={linking} />
      ) : (
        <>
          {editor
            ? MARKS.map((mk) => (
                <MarkButton
                  active={Boolean(marks?.[mk.mark])}
                  editor={editor}
                  key={mk.mark}
                  spec={mk}
                />
              ))
            : null}
          <IconButton
            icon={Link02Icon}
            label={m.ed_link()}
            onClick={startLink}
          />
          <Divider />
          <AskMenu onAsk={ask} />
          {actions.length > 0 ? <Divider /> : null}
          {actions.map((a) => (
            <IconButton
              danger={a.danger}
              disabled={a.disabled}
              icon={a.icon}
              key={a.key}
              label={a.label}
              onClick={a.run}
            />
          ))}
        </>
      )}
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-4 w-px bg-border" />;
}

function IconButton({
  icon,
  label,
  onClick,
  active,
  danger,
  shortcut,
  disabled,
}: {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "inline-flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-35",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              danger && "text-destructive hover:bg-destructive/10"
            )}
            disabled={disabled}
            onClick={onClick}
            type="button"
          />
        }
      >
        <Icon className="size-3.5" icon={icon} />
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? (
          <span className="ml-1.5 opacity-60">{shortcut}</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

function MarkButton({
  spec,
  active,
  editor,
}: {
  spec: (typeof MARKS)[number];
  active: boolean;
  editor: EditorApi;
}) {
  const run = useCallback(() => {
    if (!toggleMark(editor, spec.mark)) {
      toast(m.ed_select_text_first());
    }
  }, [editor, spec.mark]);
  return (
    <IconButton
      active={active}
      icon={spec.icon}
      label={spec.label()}
      onClick={run}
      shortcut={spec.shortcut}
    />
  );
}

function AskMenu({ onAsk }: { onAsk: (prompt?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const askFree = useCallback(() => onAsk(), [onAsk]);
  const onDraft = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    []
  );
  // Typing goes to the field, not the menu's type-ahead; Enter sends it.
  const onDraftKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        return;
      }
      e.stopPropagation();
      if (e.key === "Enter" && draft.trim()) {
        e.preventDefault();
        onAsk(draft.trim());
        setDraft("");
        setOpen(false);
      }
    },
    [draft, onAsk]
  );
  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        render={
          <button
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-primary pr-2 pl-2.5 font-medium text-[12px] text-primary-foreground transition-colors hover:bg-primary/85"
            type="button"
          />
        }
      >
        <Icon className="size-3.5" icon={SparklesIcon} />
        {m.ed_ask_ai()}
        <Icon className="size-3 opacity-70" icon={ArrowDown01Icon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <div className="mb-1 flex items-center gap-2 rounded-[8px] bg-surface px-2.5">
          <Icon
            className="size-4 shrink-0 text-muted-foreground"
            icon={SparklesIcon}
          />
          <input
            aria-label={m.ed_ask_ai_aria()}
            autoFocus
            className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            onChange={onDraft}
            onKeyDown={onDraftKey}
            placeholder={m.ed_ask_anything()}
            value={draft}
          />
        </div>
        {AI_ACTIONS.map((a) => (
          <AiItem
            icon={a.icon}
            key={a.key}
            label={a.label()}
            onAsk={onAsk}
            prompt={a.prompt()}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={askFree}>
          <Icon icon={Message01Icon} /> {m.ed_discuss_in_chat()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AiItem({
  label,
  prompt,
  icon,
  onAsk,
}: {
  label: string;
  prompt: string;
  icon: IconSvgElement;
  onAsk: (prompt?: string) => void;
}) {
  const run = useCallback(() => onAsk(prompt), [onAsk, prompt]);
  return (
    <DropdownMenuItem onClick={run}>
      <Icon icon={icon} /> {label}
    </DropdownMenuItem>
  );
}

function LinkInput({
  editor,
  selection,
  onDone,
}: {
  editor: EditorApi;
  selection: FieldSelection;
  onDone: (s: null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const url = e.currentTarget.value.trim();
        if (url) {
          applyLink(editor, selection, url);
        }
        onDone(null);
      } else if (e.key === "Escape") {
        onDone(null);
      }
    },
    [editor, selection, onDone]
  );
  return (
    <span className="flex items-center gap-1.5 px-2">
      <Icon className="size-3.5 text-muted-foreground" icon={Link02Icon} />
      <input
        aria-label={m.ed_link_url()}
        className="h-7 w-56 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        onKeyDown={onKeyDown}
        placeholder={m.ed_link_placeholder()}
        ref={input}
      />
    </span>
  );
}
