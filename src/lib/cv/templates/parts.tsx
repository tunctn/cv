import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import type { Block } from "../engine";
import { isCustomKey } from "../schema";
import type { CustomSection, CV, OrderKey } from "../schema";
import { customIndex, Show, useExpanded } from "./kit";

export const Field = ({
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
}) => (
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

export const Description = ({
  p,
  value,
  className,
}: {
  p: string;
  value: string;
  className?: string;
}) => (
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

export const Bullets = ({
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
}) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className={className}>
      {items.map((h, j) => (
        <Sel
          as="li"
          className={itemClassName}
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
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
};

export const Dates = ({
  p,
  start,
  end,
  separator = " – ",
}: {
  p: string;
  start: string;
  end: string;
  separator?: string;
}) => {
  const expanded = useExpanded(p);
  return (
    <>
      <Field field="start" p={p} placeholder={m.cv_ph_start()} value={start} />
      {(start && end) || expanded ? separator : null}
      <Field field="end" p={p} placeholder={m.cv_ph_end()} value={end} />
    </>
  );
};

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

export const experienceEntries = (cv: CV): EntryModel[] =>
  cv.experience.map((e, i) => ({
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

export const educationEntries = (cv: CV): EntryModel[] =>
  cv.education.map((e, i) => ({
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

export const projectEntries = (cv: CV): EntryModel[] =>
  cv.projects.map((pr, i) => ({
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

export const customEntries = (
  section: CustomSection,
  list: string
): EntryModel[] =>
  section.items.map((it, i) => ({
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

export const EntryText = ({
  e,
  which,
  className,
  before,
}: {
  e: EntryModel;
  which: "title" | "sub";
  className?: string;
  before?: ReactNode;
}) => {
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
};

export const EntryDates = ({
  e,
  separator,
}: {
  e: EntryModel;
  separator?: string;
}) => {
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
};

export const hasDates = (e: EntryModel) =>
  Boolean(e.dates ? e.dates.start || e.dates.end : e.date);

export const EntryLocation = ({
  e,
  className,
  before,
}: {
  e: EntryModel;
  className?: string;
  before?: ReactNode;
}) => {
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
};

export const sectionEntries = (cv: CV, key: OrderKey): EntryModel[] | null => {
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
};

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

export const sectionStream = (
  cv: CV,
  keys: OrderKey[],
  r: SectionRenderers
): Block[] => {
  const blocks: Block[] = [];
  for (const [n, key] of keys.entries()) {
    blocks.push(r.heading(key, n));
    const entries = sectionEntries(cv, key);
    if (entries) {
      blocks.push(...entries.map((e, i) => r.entry(e, i, entries, key)));
    } else if (key === "skills") {
      blocks.push(...r.skills(cv));
    } else if (key === "languages") {
      blocks.push(...r.languages(cv));
    }
  }
  return blocks;
};
