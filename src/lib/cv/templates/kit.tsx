import { ImageAdd01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { type ReactNode, useCallback, useRef } from "react";
import { toast } from "sonner";
import { E, Sel, useEditor } from "#/components/cv/editing";
import { fileToPhoto } from "#/components/editor/photo";
import { Icon } from "#/components/icon";
import { m } from "#/paraglide/messages.js";
import type { Block } from "../engine";
import {
  type CustomKey,
  type CustomSection,
  type CV,
  customKey,
  isCustomKey,
  type OrderKey,
  type SectionKey,
  type SkillItem,
} from "../schema";

/**
 * Sections in the user's chosen order, without the empty built-in ones.
 * Custom sections always show (the user added them on purpose), unless `only`
 * limits the result to some built-in sections.
 */
export function orderedSections(cv: CV, only?: SectionKey[]): OrderKey[] {
  return cv.sectionOrder.filter((k) =>
    isCustomKey(k)
      ? !only && customIndex(cv, k) !== -1
      : cv[k].length > 0 && (!only || only.includes(k))
  );
}

/** Index of a custom section in `cv.custom`, or -1. */
export function customIndex(cv: CV, key: CustomKey) {
  return cv.custom.findIndex((s) => customKey(s.id) === key);
}

/** Where a section's heading lives: `labels.<key>` or `custom.<i>.title`. */
export function sectionLabel(cv: CV, key: OrderKey) {
  if (isCustomKey(key)) {
    const i = customIndex(cv, key);
    return { path: `custom.${i}.title`, value: cv.custom[i]?.title ?? "" };
  }
  return { path: `labels.${key}`, value: cv.labels[key] };
}

/**
 * The blocks of one section: built-in sections from the template's table,
 * custom sections through the template's own entry renderer.
 */
export function sectionBlocks(
  cv: CV,
  key: OrderKey,
  builtin: Partial<Record<SectionKey, (cv: CV) => Block[]>>,
  custom: (section: CustomSection, p: string) => Block[]
): Block[] {
  if (isCustomKey(key)) {
    const i = customIndex(cv, key);
    return i === -1 ? [] : custom(cv.custom[i], `custom.${i}`);
  }
  return builtin[key]?.(cv) ?? [];
}

/** True while the item at `path` (or something inside it) is selected in the editor. */
export function useExpanded(path: string) {
  const ed = useEditor();
  const sel = ed?.selected;
  return Boolean(
    (sel && (sel === path || sel.startsWith(`${path}.`))) || ed?.isBlank?.(path)
  );
}

/**
 * Renders children when `value` is filled in, or while its item is selected
 * in the editor (so empty fields can be typed into). Never shows empty fields in print.
 */
export function Show({
  path,
  value,
  children,
}: {
  path: string;
  value: string;
  children: ReactNode;
}) {
  const expanded = useExpanded(path);
  return value || expanded ? children : null;
}

interface PairField {
  path: string;
  placeholder: string;
  value: string;
}

/** Two fields on one line with a separator, e.g. "Company - City" or "2019 - 2021". */
export function Pair({
  a,
  b,
  item,
  separator,
  className,
}: {
  a: PairField;
  b: PairField;
  item: string;
  separator: string;
  className?: string;
}) {
  const expanded = useExpanded(item);
  const showA = Boolean(a.value) || expanded;
  const showB = Boolean(b.value) || expanded;
  if (!(showA || showB)) {
    return null;
  }
  return (
    <p className={className}>
      {showA ? (
        <E path={a.path} placeholder={a.placeholder} value={a.value} />
      ) : null}
      {showA && showB ? separator : null}
      {showB ? (
        <E path={b.path} placeholder={b.placeholder} value={b.value} />
      ) : null}
    </p>
  );
}

const CONTACT_FIELDS = [
  { key: "email", placeholder: m.cv_ph_email },
  { key: "phone", placeholder: m.cv_ph_phone },
  { key: "location", placeholder: m.cv_ph_location },
  { key: "website", placeholder: m.cv_ph_website },
] as const;

/** Email, phone, location, website and links as an inline list. */
export function Contacts({
  cv,
  className,
  separator,
  itemClassName,
}: {
  cv: CV;
  className?: string;
  separator?: ReactNode;
  itemClassName?: string;
}) {
  const expanded = useExpanded("basics");
  const b = cv.basics;
  const items: { key: string; node: ReactNode }[] = [];
  for (const f of CONTACT_FIELDS) {
    if (b[f.key] || expanded) {
      items.push({
        key: f.key,
        node: (
          <E
            path={`basics.${f.key}`}
            placeholder={f.placeholder()}
            value={b[f.key]}
          />
        ),
      });
    }
  }
  b.links.forEach((l, i) => {
    if (l.url || expanded) {
      items.push({
        key: l.id,
        node: (
          <E
            path={`basics.links.${i}.url`}
            placeholder={m.cv_ph_link()}
            value={l.url}
          />
        ),
      });
    }
  });
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className={className}>
      {items.map((it, i) => (
        <li className={itemClassName ?? "flex items-center"} key={it.key}>
          {i > 0 ? separator : null}
          {it.node}
        </li>
      ))}
    </ul>
  );
}

/** The profile photo. In the editor, click it to upload or replace. */
export function Photo({
  cv,
  className,
  width,
  height,
}: {
  cv: CV;
  className?: string;
  width: number;
  height: number;
}) {
  const ed = useEditor();
  const expanded = useExpanded("basics");
  const input = useRef<HTMLInputElement>(null);
  const { photo } = cv.basics;

  const pick = useCallback(() => input.current?.click(), []);
  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (f && ed) {
        try {
          ed.set("basics.photo", await fileToPhoto(f));
        } catch {
          toast.error(m.settings_photo_failed());
        }
      }
    },
    [ed]
  );

  if (!(photo || (ed && expanded))) {
    return null;
  }
  const img = photo ? (
    <img
      alt=""
      className={`${className ?? ""} object-cover`}
      height={height}
      src={photo}
      width={width}
    />
  ) : (
    <span
      className={`${className ?? ""} flex items-center justify-center border border-[#d4d4d4] border-dashed text-[#a3a3a3]`}
      style={{ width, height }}
    >
      <Icon className="size-5" icon={ImageAdd01Icon} />
    </span>
  );
  if (!ed?.interactive) {
    return img;
  }
  return (
    <>
      <button
        aria-label={photo ? m.cv_photo_replace() : m.cv_photo_add()}
        className="cv-photo shrink-0 cursor-pointer"
        onClick={pick}
        type="button"
      >
        {img}
      </button>
      <input
        accept="image/*"
        hidden
        onChange={onFile}
        ref={input}
        type="file"
      />
    </>
  );
}

/** Start and end date on one line, e.g. "Jul 2020 – Aug 2025". */
export function DateRange({
  p,
  start,
  end,
  className,
  separator = " – ",
}: {
  p: string;
  start: string;
  end: string;
  className?: string;
  separator?: string;
}) {
  return (
    <Pair
      a={{ path: `${p}.start`, value: start, placeholder: m.cv_ph_start() }}
      b={{ path: `${p}.end`, value: end, placeholder: m.cv_ph_end() }}
      className={className}
      item={p}
      separator={separator}
    />
  );
}

/** One skill item as "Title: text", selectable and draggable within its group. */
export function SkillLine({
  group,
  index,
  item,
  className,
  titleClassName,
}: {
  group: string;
  index: number;
  item: SkillItem;
  className?: string;
  titleClassName?: string;
}) {
  const ip = `${group}.items.${index}`;
  const expanded = useExpanded(ip);
  const showTitle = Boolean(item.title) || expanded;
  const showText = Boolean(item.text) || expanded;
  return (
    <Sel
      className={className}
      label={m.cv_sel_skill()}
      list={`${group}.items`}
      path={ip}
    >
      {showTitle ? (
        <span className={titleClassName}>
          <E
            path={`${ip}.title`}
            placeholder={m.cv_ph_title()}
            value={item.title}
          />
          {showText ? ": " : null}
        </span>
      ) : null}
      {showText ? (
        <E
          multiline
          path={`${ip}.text`}
          placeholder={m.cv_ph_skills()}
          rich
          value={item.text}
        />
      ) : null}
    </Sel>
  );
}

/** All languages on one line: "German (native), English (fluent)". */
export function InlineLanguages({
  cv,
  className,
  separator = ", ",
  open = " (",
  close = ")",
  levelClassName,
}: {
  cv: CV;
  className?: string;
  separator?: ReactNode;
  open?: string;
  close?: string;
  levelClassName?: string;
}) {
  return (
    <div className={className}>
      {cv.languages.map((l, i) => (
        <Sel
          className="inline"
          key={l.id}
          label={m.cv_sel_language()}
          list="languages"
          path={`languages.${i}`}
        >
          {i > 0 ? separator : null}
          <E
            path={`languages.${i}.name`}
            placeholder={m.cv_ph_language()}
            value={l.name}
          />
          <Show path={`languages.${i}`} value={l.level}>
            <span className={levelClassName}>
              {open}
              <E
                path={`languages.${i}.level`}
                placeholder={m.cv_ph_level()}
                value={l.level}
              />
              {close}
            </span>
          </Show>
        </Sel>
      ))}
    </div>
  );
}
