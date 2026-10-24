import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block } from "../engine";
import {
  type CustomSection,
  type CV,
  isCustomKey,
  type OrderKey,
} from "../schema";
import { customIndex, Show, useExpanded } from "./kit";

/**
 * Small building blocks shared by the newer templates. Each template still
 * sets its own type, spacing and markers through the class props.
 */

/** One optional text field of an item, hidden when empty (shown while editing). */
export function Field({
  p,
  field,
  value,
  placeholder,
  className,
  rich,
  multiline,
  before,
  after,
}: {
  p: string;
  field: string;
  value: string;
  placeholder: string;
  className?: string;
  rich?: boolean;
  multiline?: boolean;
  before?: ReactNode;
  after?: ReactNode;
}) {
  return (
    <Show path={p} value={value}>
      <span className={className}>
        {before}
        <E
          multiline={multiline}
          path={`${p}.${field}`}
          placeholder={placeholder}
          rich={rich}
          value={value}
        />
        {after}
      </span>
    </Show>
  );
}

/** The free-text description of an item as a paragraph. */
export function Description({
  p,
  value,
  className,
}: {
  p: string;
  value: string;
  className?: string;
}) {
  return (
    <Show path={p} value={value}>
      <p className={className}>
        <E
          multiline
          path={`${p}.description`}
          placeholder={m.cv_ph_description()}
          rich
          value={value}
        />
      </p>
    </Show>
  );
}

/** Bullet points; `marker` is drawn before each one (or use list-disc classes). */
export function Bullets({
  list,
  items,
  className,
  itemClassName,
  marker,
}: {
  list: string;
  items: string[];
  className?: string;
  itemClassName?: string;
  marker?: ReactNode;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className={className}>
      {items.map((h, j) => (
        <Sel
          as="li"
          className={itemClassName}
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          {marker}
          <E
            path={`${list}.${j}`}
            placeholder={m.cv_ph_bullet()}
            rich
            value={h}
          />
        </Sel>
      ))}
    </ul>
  );
}

/** "Start – End" inline (no wrapping element), empty parts left out. */
export function Dates({
  p,
  start,
  end,
  separator = " – ",
}: {
  p: string;
  start: string;
  end: string;
  separator?: string;
}) {
  const expanded = useExpanded(p);
  return (
    <>
      <Field field="start" p={p} placeholder={m.cv_ph_start()} value={start} />
      {(start && end) || expanded ? separator : null}
      <Field field="end" p={p} placeholder={m.cv_ph_end()} value={end} />
    </>
  );
}

interface TextField {
  field: string;
  placeholder: string;
  value: string;
}

/**
 * Jobs, education, projects and custom-section entries in one shape, so a
 * template can draw them all with a single entry renderer.
 */
export interface EntryModel {
  /** A single free-text date (custom sections). */
  date?: string;
  dates?: { start: string; end: string };
  description: string;
  highlights?: string[];
  id: string;
  label: string;
  list: string;
  location?: string;
  p: string;
  /** Company, school, link or subtitle. */
  sub?: TextField;
  title: TextField;
}

export function experienceEntries(cv: CV): EntryModel[] {
  return cv.experience.map((e, i) => ({
    id: e.id,
    p: `experience.${i}`,
    list: "experience",
    label: m.cv_sel_job(),
    title: { field: "role", value: e.role, placeholder: m.cv_ph_job_title() },
    sub: { field: "company", value: e.company, placeholder: m.cv_ph_company() },
    location: e.location,
    dates: { start: e.start, end: e.end },
    description: e.description,
    highlights: e.highlights,
  }));
}

export function educationEntries(cv: CV): EntryModel[] {
  return cv.education.map((e, i) => ({
    id: e.id,
    p: `education.${i}`,
    list: "education",
    label: m.cv_sel_education(),
    title: { field: "degree", value: e.degree, placeholder: m.cv_ph_degree() },
    sub: { field: "school", value: e.school, placeholder: m.cv_ph_school() },
    location: e.location,
    dates: { start: e.start, end: e.end },
    description: e.description,
  }));
}

export function projectEntries(cv: CV): EntryModel[] {
  return cv.projects.map((pr, i) => ({
    id: pr.id,
    p: `projects.${i}`,
    list: "projects",
    label: m.cv_sel_project(),
    title: {
      field: "name",
      value: pr.name,
      placeholder: m.cv_ph_project_name(),
    },
    sub: { field: "url", value: pr.url, placeholder: m.cv_ph_link() },
    description: pr.description,
    highlights: pr.highlights,
  }));
}

export function customEntries(
  section: CustomSection,
  list: string
): EntryModel[] {
  return section.items.map((it, i) => ({
    id: it.id,
    p: `${list}.items.${i}`,
    list: `${list}.items`,
    label: m.cv_sel_entry(),
    title: { field: "title", value: it.title, placeholder: m.cv_ph_title() },
    sub: {
      field: "subtitle",
      value: it.subtitle,
      placeholder: m.cv_ph_subtitle(),
    },
    location: it.location,
    date: it.date,
    description: it.description,
    highlights: it.highlights,
  }));
}

/** Title (or subtitle) of an entry as an inline editable field. */
export function EntryText({
  e,
  which,
  className,
  before,
}: {
  e: EntryModel;
  which: "title" | "sub";
  className?: string;
  before?: ReactNode;
}) {
  const f = which === "title" ? e.title : e.sub;
  if (!f) {
    return null;
  }
  if (which === "title") {
    return (
      <span className={className}>
        <E
          path={`${e.p}.${f.field}`}
          placeholder={f.placeholder}
          value={f.value}
        />
      </span>
    );
  }
  return (
    <Field
      before={before}
      className={className}
      field={f.field}
      p={e.p}
      placeholder={f.placeholder}
      value={f.value}
    />
  );
}

/** The entry's dates: a range, or the single date of a custom entry. */
export function EntryDates({
  e,
  separator,
}: {
  e: EntryModel;
  separator?: string;
}) {
  if (e.dates) {
    return (
      <Dates
        end={e.dates.end}
        p={e.p}
        separator={separator}
        start={e.dates.start}
      />
    );
  }
  if (e.date === undefined) {
    return null;
  }
  return (
    <Field field="date" p={e.p} placeholder={m.cv_ph_date()} value={e.date} />
  );
}

/** True when the entry has any date to show (or is being edited). */
export function hasDates(e: EntryModel) {
  return Boolean(e.dates ? e.dates.start || e.dates.end : e.date);
}

/** The entry's location, if it has one. */
export function EntryLocation({
  e,
  className,
  before,
}: {
  e: EntryModel;
  className?: string;
  before?: ReactNode;
}) {
  if (e.location === undefined) {
    return null;
  }
  return (
    <Field
      before={before}
      className={className}
      field="location"
      p={e.p}
      placeholder={m.cv_ph_location()}
      value={e.location}
    />
  );
}

/** Entries of an entry-style section, or null for skills and languages. */
export function sectionEntries(cv: CV, key: OrderKey): EntryModel[] | null {
  if (isCustomKey(key)) {
    const i = customIndex(cv, key);
    return i === -1 ? [] : customEntries(cv.custom[i], `custom.${i}`);
  }
  if (key === "experience") {
    return experienceEntries(cv);
  }
  if (key === "education") {
    return educationEntries(cv);
  }
  if (key === "projects") {
    return projectEntries(cv);
  }
  return null;
}

export interface SectionRenderers {
  /** Blocks for one entry-style item. */
  entry: (
    e: EntryModel,
    index: number,
    all: EntryModel[],
    key: OrderKey
  ) => Block;
  /** Section heading block. */
  heading: (key: OrderKey, n: number) => Block;
  languages: (cv: CV) => Block[];
  skills: (cv: CV) => Block[];
}

/** Heading plus items for each section in order, drawn by the template's renderers. */
export function sectionStream(
  cv: CV,
  keys: OrderKey[],
  r: SectionRenderers
): Block[] {
  const blocks: Block[] = [];
  keys.forEach((key, n) => {
    blocks.push(r.heading(key, n));
    const entries = sectionEntries(cv, key);
    if (entries) {
      blocks.push(...entries.map((e, i) => r.entry(e, i, entries, key)));
    } else if (key === "skills") {
      blocks.push(...r.skills(cv));
    } else if (key === "languages") {
      blocks.push(...r.languages(cv));
    }
  });
  return blocks;
}
