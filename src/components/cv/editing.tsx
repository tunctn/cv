import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DragDropVerticalIcon } from "@hugeicons-pro/core-stroke-rounded";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { Icon } from "#/components/icon";
import type { Path } from "#/lib/cv/paths";
import { Rich } from "#/lib/cv/templates/shared";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

const TRAILING_NEWLINE = /\n$/u;

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

export const useEditor = () => useContext(EditorContext);

const caretOffset = (el: HTMLElement) => {
  const sel = window.getSelection();
  if (!sel?.rangeCount) {
    return 0;
  }
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return range.toString().length;
};

const placeCaret = (el: HTMLElement, offset: number) => {
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
};

interface FieldSelection {
  el: HTMLElement;
  end: number;
  path: string;
  start: number;
  text: string;
}

const richSelection = (): FieldSelection | null => {
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
    text: el.textContent,
    start,
    end: start + range.toString().length,
  };
};

export type Mark = "bold" | "italic" | "underline";

const MARKERS: Record<Mark, string> = {
  bold: "**",
  italic: "*",
  underline: "__",
};

const isWrapped = (s: FieldSelection, marker: string) => {
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
};

export const activeMarks = (): Record<Mark, boolean> | null => {
  const s = richSelection();
  if (!s) {
    return null;
  }
  return {
    bold: isWrapped(s, "**"),
    italic: isWrapped(s, "*"),
    underline: isWrapped(s, "__"),
  };
};

export const saveSelection = () => richSelection();

export const applyLink = (ed: EditorApi, s: FieldSelection, url: string) => {
  const inner = s.text.slice(s.start, s.end);
  const next = `${s.text.slice(0, s.start)}[${inner}](${url.trim()})${s.text.slice(s.end)}`;
  s.el.textContent = next;
  ed.set(s.path, next);
};

export type { FieldSelection };

export const toggleMark = (ed: EditorApi, mark: Mark) => {
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
};

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

const Display = ({
  value,
  rich,
  multiline,
  placeholder,
  className,
}: FieldProps) => {
  const content = rich ? <Rich text={value} /> : value;
  return (
    <span
      className={cn(multiline ? "whitespace-pre-line" : null, className)}
      data-placeholder={placeholder}
    >
      {content}
    </span>
  );
};

const LiveField = ({
  path,
  value,
  rich,
  multiline,
  placeholder,
  className,
  ed,
}: FieldProps & { ed: EditorApi }) => {
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
    if (el.textContent.replace(TRAILING_NEWLINE, "") !== value) {
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
    ed.set(path, el.textContent.replace(TRAILING_NEWLINE, ""));
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
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- a contentEditable text field; focus/blur/input are its native interactions
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
};

export const E = (props: FieldProps) => {
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
};

interface SelProps {
  as?: "div" | "li" | "section" | "article" | "header";
  children: ReactNode;
  className?: string;
  label: string;
  /** The list this element can be dragged within ("experience", "experience.0.highlights", "sections"). */
  list?: string;
  path: Path;
}

const LiveSel = ({
  path,
  list,
  label,
  className,
  children,
  as,
  ed,
}: SelProps & { ed: EditorApi }) => {
  const Tag = as ?? "div";
  const data = { list, label };
  const {
    attributes: dragAttributes,
    isDragging,
    listeners: dragListeners,
    setNodeRef: setDragRef,
  } = useDraggable({ id: path, data, disabled: !list });
  const { setNodeRef: setDropRef } = useDroppable({
    id: path,
    data,
    disabled: !list,
  });
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
      data-dragging={isDragging || undefined}
      data-sel={path}
      data-selected={selected || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      ref={setDropRef}
    >
      {list ? (
        <button
          aria-label={m.cv_drag({ label })}
          className="cv-handle"
          ref={setDragRef}
          type="button"
          {...dragListeners}
          {...dragAttributes}
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
};

export const Sel = (props: SelProps) => {
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
};
