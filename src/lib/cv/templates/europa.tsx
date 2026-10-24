import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CustomSection, CV, SectionKey } from "../schema";
import {
  DateRange,
  orderedSections,
  Photo,
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
  useExpanded,
} from "./kit";

/** Label column on the left (right-aligned, accent), content on the right. */
const GRID = "grid grid-cols-[148px_1fr] gap-x-[22px]";
const LABEL =
  "text-right text-[11.2px] text-[var(--cv-accent)] leading-[1.6] tabular-nums";

function Row({
  label,
  children,
  className,
}: {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${GRID} ${className ?? ""}`}>
      <div className={LABEL}>{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[3px] space-y-[2px] text-[#333]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[13px]"
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="absolute top-[0.6em] left-[1px] h-[5px] w-[5px] bg-[var(--cv-accent)]" />
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

function Description({ p, value }: { p: string; value: string }) {
  return (
    <Show path={p} value={value}>
      <p className="mt-[3px] text-[#333]">
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

/** "Organisation, Place" in grey under the entry title. */
function Where({
  p,
  field,
  value,
  placeholder,
  location,
}: {
  p: string;
  field: string;
  value: string;
  placeholder: string;
  location: string;
}) {
  return (
    <Show path={p} value={value || location}>
      <p className="text-[#555]">
        <E path={`${p}.${field}`} placeholder={placeholder} value={value} />
        <Show path={p} value={location}>
          <span>
            {", "}
            <E
              path={`${p}.location`}
              placeholder={m.cv_ph_location()}
              value={location}
            />
          </span>
        </Show>
      </p>
    </Show>
  );
}

const TITLE = "font-semibold text-[13.2px] text-[var(--cv-accent)]";

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Row label={<DateRange end={e.end} p={p} start={e.start} />}>
            <p className={TITLE}>
              <E
                path={`${p}.role`}
                placeholder={m.cv_ph_job_title()}
                value={e.role}
              />
            </p>
            <Where
              field="company"
              location={e.location}
              p={p}
              placeholder={m.cv_ph_company()}
              value={e.company}
            />
            <Description p={p} value={e.description} />
            <Bullets items={e.highlights} list={`${p}.highlights`} />
          </Row>
        </Sel>
      ),
    };
  });
}

function educationBlocks(cv: CV): Block[] {
  return cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Row label={<DateRange end={e.end} p={p} start={e.start} />}>
            <p className={TITLE}>
              <E
                path={`${p}.degree`}
                placeholder={m.cv_ph_degree()}
                value={e.degree}
              />
            </p>
            <Where
              field="school"
              location={e.location}
              p={p}
              placeholder={m.cv_ph_school()}
              value={e.school}
            />
            <Description p={p} value={e.description} />
          </Row>
        </Sel>
      ),
    };
  });
}

/** Each skill group is a labelled row, like the competence rows of a European CV. */
function skillBlocks(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Row
            label={
              <Show path={p} value={s.name}>
                <span>
                  <E
                    path={`${p}.name`}
                    placeholder={m.cv_ph_group_name()}
                    value={s.name}
                  />
                </span>
              </Show>
            }
          >
            <div className="space-y-[3px]">
              {s.items.map((it, j) => (
                <SkillLine
                  className="text-[#333]"
                  group={p}
                  index={j}
                  item={it}
                  key={it.id}
                  titleClassName="font-semibold text-[#222]"
                />
              ))}
            </div>
          </Row>
        </Sel>
      ),
    };
  });
}

function projectBlocks(cv: CV): Block[] {
  return cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Row>
            <p className={TITLE}>
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_project_name()}
                value={pr.name}
              />
            </p>
            <Show path={p} value={pr.url}>
              <p className="text-[#555]">
                <E
                  path={`${p}.url`}
                  placeholder={m.cv_ph_link()}
                  value={pr.url}
                />
              </p>
            </Show>
            <Description p={p} value={pr.description} />
            <Bullets items={pr.highlights} list={`${p}.highlights`} />
          </Row>
        </Sel>
      ),
    };
  });
}

/** One row per language: the language as the label, its level on the right. */
function languageBlocks(cv: CV): Block[] {
  return [
    {
      key: "languages",
      gap: 10,
      node: (
        <ul className="space-y-[3px]">
          {cv.languages.map((l, i) => (
            <Sel
              as="li"
              key={l.id}
              label={m.cv_sel_language()}
              list="languages"
              path={`languages.${i}`}
            >
              <Row
                label={
                  <span className="font-semibold">
                    <E
                      path={`languages.${i}.name`}
                      placeholder={m.cv_ph_language()}
                      value={l.name}
                    />
                  </span>
                }
              >
                <p className="text-[#333]">
                  <E
                    path={`languages.${i}.level`}
                    placeholder={m.cv_ph_level()}
                    value={l.level}
                  />
                </p>
              </Row>
            </Sel>
          ))}
        </ul>
      ),
    },
  ];
}

function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Row
            label={
              <Show path={p} value={it.date}>
                <span>
                  <E
                    path={`${p}.date`}
                    placeholder={m.cv_ph_date()}
                    value={it.date}
                  />
                </span>
              </Show>
            }
          >
            <p className={TITLE}>
              <E
                path={`${p}.title`}
                placeholder={m.cv_ph_title()}
                value={it.title}
              />
            </p>
            <Where
              field="subtitle"
              location={it.location}
              p={p}
              placeholder={m.cv_ph_subtitle()}
              value={it.subtitle}
            />
            <Description p={p} value={it.description} />
            <Bullets items={it.highlights} list={`${p}.highlights`} />
          </Row>
        </Sel>
      ),
    };
  });
}

const SECTION_BLOCKS: Record<SectionKey, (cv: CV) => Block[]> = {
  experience: experienceBlocks,
  education: educationBlocks,
  skills: skillBlocks,
  projects: projectBlocks,
  languages: languageBlocks,
};

/** Section title in the label column, a hairline running across the content column. */
function Heading({ children }: { children: ReactNode }) {
  return (
    <div className={`${GRID} items-center`}>
      <h2 className="text-right font-semibold text-[11.6px] text-[var(--cv-accent)] uppercase leading-[1.3] tracking-[0.06em]">
        {children}
      </h2>
      <span className="h-px bg-[color-mix(in_srgb,var(--cv-accent)_45%,white)]" />
    </div>
  );
}

const CONTACT_FIELDS = [
  { key: "email", label: m.cv_ph_email },
  { key: "phone", label: m.cv_ph_phone },
  { key: "location", label: m.cv_ph_location },
  { key: "website", label: m.cv_ph_website },
] as const;

/** Contact details as labelled lines: "Email   name@example.com". */
function ContactRows({ cv }: { cv: CV }) {
  const expanded = useExpanded("basics");
  const b = cv.basics;
  const rows: { key: string; label: string; node: ReactNode }[] = [];
  for (const f of CONTACT_FIELDS) {
    if (b[f.key] || expanded) {
      rows.push({
        key: f.key,
        label: f.label(),
        node: (
          <E
            path={`basics.${f.key}`}
            placeholder={f.label()}
            value={b[f.key]}
          />
        ),
      });
    }
  }
  b.links.forEach((l, i) => {
    if (l.url || expanded) {
      rows.push({
        key: l.id,
        label: l.label || m.cv_ph_link(),
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
  if (rows.length === 0) {
    return null;
  }
  return (
    <dl className="mt-[10px] grid grid-cols-[auto_1fr] gap-x-[14px] gap-y-[1px] text-[11.6px]">
      {rows.map((r) => (
        <div className="contents" key={r.key}>
          <dt className="text-[#777]">{r.label}</dt>
          <dd className="min-w-0 break-words text-[#222]">{r.node}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A European-style CV: a label column on the left in the accent colour
 * (section titles, dates, skill groups and languages) and the content on
 * the right, with labelled personal details at the top.
 */
export const europa: TemplateDef = {
  id: "europa",
  category: "simple",
  name: "Europa",
  description: "European layout: labels on the left, details on the right.",
  defaults: {
    font: "inter",
    accent: "#1d4f91",
    padX: 42,
    padTop: 46,
    padBottom: 38,
  },
  sheetClassName: "text-[12px] leading-[1.5] text-[#222]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <div className={GRID}>
              <div className="flex justify-end">
                <Photo
                  className="h-[132px] w-[108px]"
                  cv={cv}
                  height={132}
                  width={108}
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-[#1a1a1a] text-[28px] leading-[1.15] tracking-[-0.01em]">
                  <E
                    path="basics.name"
                    placeholder={m.cv_ph_your_name()}
                    value={b.name}
                  />
                </h1>
                <Show path="basics" value={b.headline}>
                  <p className="mt-[2px] text-[13.4px] text-[var(--cv-accent)]">
                    <E
                      path="basics.headline"
                      placeholder={m.cv_ph_headline()}
                      value={b.headline}
                    />
                  </p>
                </Show>
                <ContactRows cv={cv} />
              </div>
            </div>
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 22,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <Heading>
              <E
                path="labels.profile"
                placeholder={m.cv_ph_profile()}
                value={cv.labels.profile}
              />
            </Heading>
            <Row className="mt-[8px]">
              <p className="text-[#333]">
                <E
                  multiline
                  path="basics.summary"
                  placeholder={m.cv_ph_summary()}
                  rich
                  value={b.summary}
                />
              </p>
            </Row>
          </Sel>
        ),
      });
    }
    for (const key of orderedSections(cv)) {
      blocks.push({
        key: `title-${key}`,
        gap: 22,
        keepWithNext: true,
        node: (
          <Sel
            label={m.cv_sel_section()}
            list="sections"
            path={`sections.${key}`}
          >
            <Heading>
              <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
            </Heading>
          </Sel>
        ),
      });
      blocks.push(...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks));
    }
    return { main: blocks };
  },
};
