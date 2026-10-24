import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CustomItem, CustomSection, CV, SectionKey } from "../schema";
import {
  Contacts,
  DateRange,
  orderedSections,
  Photo,
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
} from "./kit";

const GRID = "grid grid-cols-[118px_1fr] gap-x-5";
const DATES =
  "pt-[1px] text-[11.2px] text-[#5d6b6a] tabular-nums leading-[1.45]";
const ORG = "text-[color-mix(in_srgb,var(--cv-accent)_70%,#1f2933)]";

/** Dates (or another short label) in the left column, the entry on the right. */
function Row({ side, children }: { side?: ReactNode; children: ReactNode }) {
  return (
    <div className={GRID}>
      <div className={DATES}>{side}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[4px] space-y-[2px] text-[#33404a]">
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
          <span className="absolute top-[0.62em] left-0 h-[5px] w-[5px] rounded-full bg-[var(--cv-accent)] opacity-70" />
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
      <p className="mt-[3px] text-[#33404a]">
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

/** "Organisation, Place" under the entry title. */
function Org({
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
      <p className={ORG}>
        <span className="font-medium">
          <E path={`${p}.${field}`} placeholder={placeholder} value={value} />
        </span>
        <Show path={p} value={location}>
          <span className="text-[#5d6b6a]">
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

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 15,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Row side={<DateRange end={e.end} p={p} start={e.start} />}>
            <p className="font-semibold text-[#111c24]">
              <E
                path={`${p}.role`}
                placeholder={m.cv_ph_job_title()}
                value={e.role}
              />
            </p>
            <Org
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
      gap: i === 0 ? 10 : 13,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Row side={<DateRange end={e.end} p={p} start={e.start} />}>
            <p className="font-semibold text-[#111c24]">
              <E
                path={`${p}.degree`}
                placeholder={m.cv_ph_degree()}
                value={e.degree}
              />
            </p>
            <Org
              field="school"
              location={e.location}
              p={p}
              placeholder={m.cv_ph_institution()}
              value={e.school}
            />
            <Description p={p} value={e.description} />
          </Row>
        </Sel>
      ),
    };
  });
}

function skillBlocks(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Row
            side={
              <Show path={p} value={s.name}>
                <span className="font-medium text-[#33404a]">
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
                  className="text-[#33404a]"
                  group={p}
                  index={j}
                  item={it}
                  key={it.id}
                  titleClassName="font-semibold text-[#111c24]"
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
            <p className="font-semibold text-[#111c24]">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_project_name()}
                value={pr.name}
              />
            </p>
            <Show path={p} value={pr.url}>
              <p className={ORG}>
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

function languageBlocks(cv: CV): Block[] {
  return [
    {
      key: "languages",
      gap: 10,
      node: (
        <Row>
          <ul className="grid grid-cols-3 gap-x-6 gap-y-[4px]">
            {cv.languages.map((l, i) => (
              <Sel
                as="li"
                key={l.id}
                label={m.cv_sel_language()}
                list="languages"
                path={`languages.${i}`}
              >
                <p className="font-semibold text-[#111c24]">
                  <E
                    path={`languages.${i}.name`}
                    placeholder={m.cv_ph_language()}
                    value={l.name}
                  />
                </p>
                <Show path={`languages.${i}`} value={l.level}>
                  <p className="text-[#5d6b6a]">
                    <E
                      path={`languages.${i}.level`}
                      placeholder={m.cv_ph_level()}
                      value={l.level}
                    />
                  </p>
                </Show>
              </Sel>
            ))}
          </ul>
        </Row>
      ),
    },
  ];
}

/** Referees and other contact-style entries: no date, no bullets. */
function isContactCard(it: CustomItem) {
  return !(it.date || it.highlights.length > 0);
}

/** One referee: name, role and organisation, then contact details. */
function Card({ it, p, list }: { it: CustomItem; p: string; list: string }) {
  return (
    <Sel
      className="rounded-[6px] border border-[#dde5e4] px-[12px] py-[9px]"
      label={m.cv_sel_entry()}
      list={list}
      path={p}
    >
      <p className="font-semibold text-[#111c24]">
        <E path={`${p}.title`} placeholder={m.cv_ph_title()} value={it.title} />
      </p>
      <Show path={p} value={it.subtitle}>
        <p className={ORG}>
          <E
            path={`${p}.subtitle`}
            placeholder={m.cv_ph_subtitle()}
            value={it.subtitle}
          />
        </p>
      </Show>
      <Show path={p} value={it.location}>
        <p className="text-[#5d6b6a]">
          <E
            path={`${p}.location`}
            placeholder={m.cv_ph_location()}
            value={it.location}
          />
        </p>
      </Show>
      <Show path={p} value={it.description}>
        <p className="mt-[2px] text-[#33404a] text-[11.4px]">
          <E
            multiline
            path={`${p}.description`}
            placeholder={m.cv_ph_description()}
            rich
            value={it.description}
          />
        </p>
      </Show>
    </Sel>
  );
}

/**
 * Custom sections. Licences, rotations or courses get the date column;
 * a section of undated entries without bullets (referees) is set as cards,
 * two per row.
 */
function customBlocks(section: CustomSection, list: string): Block[] {
  const { items } = section;
  if (items.length > 0 && items.every(isContactCard)) {
    const rows: Block[] = [];
    for (let i = 0; i < items.length; i += 2) {
      const pair = items.slice(i, i + 2);
      rows.push({
        key: pair.map((it) => it.id).join("+"),
        gap: 10,
        node: (
          <Row>
            <div className="grid grid-cols-2 gap-[10px]">
              {pair.map((it, k) => (
                <Card
                  it={it}
                  key={it.id}
                  list={`${list}.items`}
                  p={`${list}.items.${i + k}`}
                />
              ))}
            </div>
          </Row>
        ),
      });
    }
    return rows;
  }
  return items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 10 : 12,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Row
            side={
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
            <p className="font-semibold text-[#111c24]">
              <E
                path={`${p}.title`}
                placeholder={m.cv_ph_title()}
                value={it.title}
              />
            </p>
            <Org
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

/** "3  Title ————" with the section number in a tinted box. */
function Heading({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-[10px] font-semibold text-[#111c24] text-[14px]">
      <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[4px] bg-[color-mix(in_srgb,var(--cv-accent)_12%,white)] px-[5px] text-[11px] text-[var(--cv-accent)] tabular-nums">
        {n}
      </span>
      <span>{children}</span>
      <span className="h-px flex-1 bg-[#d6e0df]" />
    </h2>
  );
}

/**
 * For medicine, nursing and allied health: numbered sections, a date column,
 * room for registrations, licences and rotations (as custom sections) and
 * referees set as contact cards.
 */
export const clinical: TemplateDef = {
  id: "clinical",
  category: "academic",
  name: "Clinical",
  description:
    "Numbered sections and a date column. Registrations and referees fit in.",
  defaults: {
    font: "ibm-plex-sans",
    accent: "#0f766e",
    padX: 50,
    padTop: 46,
    padBottom: 40,
  },
  sheetClassName: "text-[12px] leading-[1.5] text-[#1f2933]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <div className="flex items-start justify-between gap-6 border-[var(--cv-accent)] border-b-2 pb-[14px]">
              <div className="min-w-0">
                <h1 className="font-semibold text-[#0b1a22] text-[27px] leading-[1.15] tracking-[-0.01em]">
                  <E
                    path="basics.name"
                    placeholder={m.cv_ph_your_name()}
                    value={b.name}
                  />
                </h1>
                <Show path="basics" value={b.headline}>
                  <p className="mt-[3px] font-medium text-[13.4px] text-[var(--cv-accent)]">
                    <E
                      path="basics.headline"
                      placeholder={m.cv_ph_headline()}
                      value={b.headline}
                    />
                  </p>
                </Show>
                <Contacts
                  className="mt-[8px] flex flex-wrap gap-x-[14px] gap-y-[1px] text-[#4a5862] text-[11.4px]"
                  cv={cv}
                  itemClassName="min-w-0 break-words"
                />
              </div>
              <Photo
                className="h-[96px] w-[80px] rounded-[6px]"
                cv={cv}
                height={96}
                width={80}
              />
            </div>
          </Sel>
        ),
      },
    ];
    let n = 0;
    if (b.summary) {
      n += 1;
      blocks.push({
        key: "summary",
        gap: 18,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <Heading n={n}>
              <E
                path="labels.profile"
                placeholder={m.cv_ph_profile()}
                value={cv.labels.profile}
              />
            </Heading>
            <div className="mt-[8px]">
              <Row>
                <p className="text-[#33404a]">
                  <E
                    multiline
                    path="basics.summary"
                    placeholder={m.cv_ph_summary()}
                    rich
                    value={b.summary}
                  />
                </p>
              </Row>
            </div>
          </Sel>
        ),
      });
    }
    for (const key of orderedSections(cv)) {
      n += 1;
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
            <Heading n={n}>
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
