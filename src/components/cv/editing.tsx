import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DragDropVerticalIcon } from "@hugeicons-pro/core-stroke-rounded";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "#/components/icon";

import type { Path } from "#/lib/cv/paths";
import { Rich } from "#/lib/cv/templates/shared";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

const TRAILING_NEWLINE = /\n$/;

export interface DropTarget {
  after: boolean;
  path: Path;
}

/**
 * Shared by everything rendered inside a CV sheet. Absent (null) when the CV is
 * printed or shown as a thumbnail: then fields render as plain text.
 */
export interface EditorApi {
  /** Field being typed in, so focus survives the block moving to another page. */
  active: { path: Path; caret: number } | null;
  drop: DropTarget | null;
  /** Real, clickable editor (false for the hidden measuring copy). */
  interactive: boolean;
  /** True for an entry with nothing filled in yet (just added): its empty
   * fields show their hints even when it isn't selected. */
  isBlank?: (path: Path) => boolean;
  select: (path: Path | null) => void;
  selected: Path | null;
  set: (path: Path, value: string) => void;
  setActive: (active: { path: Path; caret: number } | null) => void;
}

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor() {
  return useContext(EditorContext);
}

function caretOffset(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) {
    return 0;
  }
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
}

function placeCaret(el: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let left = offset;
  let node = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (left <= len) {
      const range = document.createRange();
      range.setStart(node, left);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }
    left -= len;
    node = walker.nextNode();
  }
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

interface FieldSelection {
  el: HTMLElement;
  end: number;
  path: string;
  start: number;
  text: string;
}

/** The text selection inside a rich (formattable) field, if there is one. */
function richSelection(): FieldSelection | null {
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  const el = (
    node instanceof HTMLElement ? node : node?.parentElement
  )?.closest<HTMLElement>("[data-edit-path][data-rich]");
  if (!(sel?.rangeCount && el) || sel.isCollapsed) {
    return null;
  }
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  return {
    el,
    path: el.dataset.editPath ?? "",
    text: el.innerText,
    start,
    end: start + range.toString().length,
  };
}

export type Mark = "bold" | "italic" | "underline";
const MARKERS: Record<Mark, string> = {
  bold: "**",
  italic: "*",
  underline: "__",
};

function isWrapped(s: FieldSelection, marker: string) {
  const before = s.text.slice(s.start - marker.length, s.start);
  const after = s.text.slice(s.end, s.end + marker.length);
  if (before !== marker || after !== marker) {
    return false;
  }
  // "*" next to "**" is bold, not italic.
  if (marker === "*") {
    return s.text[s.start - 2] !== "*" && s.text[s.end + 1] !== "*";
  }
  return true;
}

/** Which marks the current selection already has (for toolbar active states). */
export function activeMarks(): Record<Mark, boolean> | null {
  const s = richSelection();
  if (!s) {
    return null;
  }
  return {
    bold: isWrapped(s, "**"),
    italic: isWrapped(s, "*"),
    underline: isWrapped(s, "__"),
  };
}

/** A saved selection, so it survives focus moving to e.g. a link URL input. */
export function saveSelection() {
  return richSelection();
}

/** Turns the saved selection into a markdown link `[text](url)`. */
export function applyLink(ed: EditorApi, s: FieldSelection, url: string) {
  const inner = s.text.slice(s.start, s.end);
  const next = `${s.text.slice(0, s.start)}[${inner}](${url.trim()})${s.text.slice(s.end)}`;
  s.el.textContent = next;
  ed.set(s.path, next);
}

export type { FieldSelection };

/**
 * Wraps (or unwraps) the selected text of the focused rich field in markdown
 * markers and writes it back. Returns false when there is nothing to format.
 */
export function toggleMark(ed: EditorApi, mark: Mark) {
  const s = richSelection();
  if (!s) {
    return false;
  }
  const marker = MARKERS[mark];
  const { text, start, end } = s;
  const inner = text.slice(start, end);
  const wrapped = isWrapped(s, marker);
  const next = wrapped
    ? text.slice(0, start - marker.length) +
      inner +
      text.slice(end + marker.length)
    : `${text.slice(0, start)}${marker}${inner}${marker}${text.slice(end)}`;
  s.el.textContent = next;
  // Keep the same words selected after the change.
  const from = wrapped ? start - marker.length : start + marker.length;
  placeCaret(s.el, from);
  const range = window.getSelection()?.getRangeAt(0);
  if (range) {
    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    placeCaret(s.el, from + inner.length);
    const endRange = window.getSelection()?.getRangeAt(0);
    if (endRange) {
      tail.setEnd(endRange.startContainer, endRange.startOffset);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(tail);
    }
  }
  ed.setActive({ path: s.path, caret: from + inner.length });
  ed.set(s.path, next);
  return true;
}

interface FieldProps {
  className?: string;
  /** Allow line breaks (summary, descriptions). */
  multiline?: boolean;
  path: Path;
  placeholder?: string;
  /** Render `**bold**` when not being edited. */
  rich?: boolean;
  value: string;
}

/** An editable text field on the CV. Plain text when printed. */
export function E(props: FieldProps) {
  const ed = useEditor();
  if (!ed) {
    return props.value ? (
      <Display className={props.className} {...props} />
    ) : null;
  }
  if (!ed.interactive) {
    return (
      <Display
        {...props}
        className={cn("cv-ph", props.className)}
        placeholder={props.placeholder}
      />
    );
  }
  return <LiveField {...props} ed={ed} />;
}

function Display({
  value,
  rich,
  multiline,
  placeholder,
  className,
}: FieldProps) {
  const content = rich ? <Rich text={value} /> : value;
  return (
    <span
      className={cn(multiline ? "whitespace-pre-line" : null, className)}
      data-placeholder={placeholder}
    >
      {content}
    </span>
  );
}

function LiveField({
  path,
  value,
  rich,
  multiline,
  placeholder,
  className,
  ed,
}: FieldProps & { ed: EditorApi }) {
  const ref = useRef<HTMLSpanElement>(null);
  // While typing, React must not touch the DOM text, so the children are frozen.
  const [frozen, setFrozen] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const isActive = ed.active?.path === path;

  // The block may have moved to another page and remounted: take focus back.
  useLayoutEffect(() => {
    const el = ref.current;
    if (isActive && el && document.activeElement !== el && ed.active) {
      el.focus({ preventScroll: true });
      placeCaret(el, ed.active.caret);
    }
  });

  // Undo, redo or the AI changed this field while it has focus: the frozen
  // DOM text is stale, so write the new value in and keep the caret nearby.
  useLayoutEffect(() => {
    const el = ref.current;
    if (frozen === null || !el) {
      return;
    }
    if (el.innerText.replace(TRAILING_NEWLINE, "") !== value) {
      const caret = Math.min(caretOffset(el), value.length);
      el.textContent = value;
      if (document.activeElement === el) {
        placeCaret(el, caret);
      }
    }
  }, [value, frozen]);

  const onFocus = useCallback(() => {
    setFrozen(value);
    const el = ref.current;
    if (el) {
      ed.setActive({ path, caret: caretOffset(el) });
    }
  }, [ed, path, value]);

  const onInput = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    ed.setActive({ path, caret: caretOffset(el) });
    ed.set(path, el.innerText.replace(TRAILING_NEWLINE, ""));
  }, [ed, path]);

  const onBlur = useCallback(() => {
    setFrozen(null);
    setVersion((v) => v + 1);
    if (ed.active?.path === path) {
      ed.setActive(null);
    }
  }, [ed, path]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const shortcut: Record<string, Mark> = {
        b: "bold",
        i: "italic",
        u: "underline",
      };
      if (rich && mod && shortcut[key]) {
        e.preventDefault();
        toggleMark(ed, shortcut[key]);
        return;
      }
      if (e.key === "Escape" || (e.key === "Enter" && !multiline)) {
        e.preventDefault();
        ref.current?.blur();
      }
    },
    [ed, multiline, rich]
  );

  const showRich = frozen === null && rich;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a contentEditable text field; focus/blur/input are its native interactions
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: same as above
    <span
      className={cn(
        "cv-ph cv-field",
        multiline && "whitespace-pre-line",
        className
      )}
      contentEditable="plaintext-only"
      data-edit-path={path}
      data-placeholder={placeholder}
      data-rich={rich || undefined}
      key={version}
      onBlur={onBlur}
      onFocus={onFocus}
      onInput={onInput}
      onKeyDown={onKeyDown}
      ref={ref}
      spellCheck
      suppressContentEditableWarning
    >
      {showRich ? <Rich text={value} /> : (frozen ?? value)}
    </span>
  );
}

interface SelProps {
  as?: "div" | "li" | "section" | "article" | "header";
  children: ReactNode;
  className?: string;
  label: string;
  /** The list this element can be dragged within ("experience", "experience.0.highlights", "sections"). */
  list?: string;
  path: Path;
}

/** A selectable (and, with `list`, draggable) region of the CV. */
export function Sel(props: SelProps) {
  const ed = useEditor();
  const Tag = props.as ?? "div";
  if (!ed?.interactive) {
    return (
      <Tag className={props.className} data-sel={ed ? props.path : undefined}>
        {props.children}
      </Tag>
    );
  }
  return <LiveSel {...props} ed={ed} />;
}

function LiveSel({
  path,
  list,
  label,
  className,
  children,
  as,
  ed,
}: SelProps & { ed: EditorApi }) {
  const Tag = as ?? "div";
  const data = { list, label };
  const drag = useDraggable({ id: path, data, disabled: !list });
  const drop = useDroppable({ id: path, data, disabled: !list });
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      drop.setNodeRef(el);
    },
    [drop.setNodeRef]
  );
  // Only stop the canvas from deselecting here. Selecting happens on click,
  // after the browser has placed the caret: selecting can reveal empty fields
  // and shift the layout, which must not move the click target mid-press.
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      ed.select(path);
    },
    [ed, path]
  );
  const selected = ed.selected === path;
  const indicator = ed.drop?.path === path ? ed.drop : null;

  return (
    <Tag
      className={cn("cv-sel group/sel relative", className)}
      data-dragging={drag.isDragging || undefined}
      data-sel={path}
      data-selected={selected || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      ref={setRef}
    >
      {list ? (
        <button
          aria-label={m.cv_drag({ label })}
          className="cv-handle"
          ref={drag.setNodeRef}
          type="button"
          {...drag.listeners}
          {...drag.attributes}
        >
          <Icon icon={DragDropVerticalIcon} />
        </button>
      ) : null}
      {indicator ? (
        <span
          className={cn("cv-drop", indicator.after ? "-bottom-1" : "-top-1")}
        />
      ) : null}
      {children}
    </Tag>
  );
}
