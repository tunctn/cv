import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CustomSection, CV, SectionKey } from "../schema";
import {
  Contacts,
  DateRange,
  InlineLanguages,
  orderedSections,
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
} from "./kit";

const DATES =
  "font-semibold text-[11.6px] text-[var(--cv-accent)] tabular-nums uppercase tracking-[0.04em]";
const SQUARE =
  "absolute top-[0.6em] left-[1px] h-[5px] w-[5px] bg-[var(--cv-accent)]";

/** Company in caps (and place) on the left, dates on the right. */
function Head({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <p className="min-w-0">{left}</p>
      {right ? <div className="shrink-0 text-right">{right}</div> : null}
    </div>
  );
}

function Place({ p, value }: { p: string; value: string }) {
  return (
    <Show path={p} value={value}>
      <span className="text-[#777]">
        {"  ·  "}
        <E
          path={`${p}.location`}
          placeholder={m.cv_ph_location()}
          value={value}
        />
      </span>
    </Show>
  );
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[3px] space-y-[2px]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[15px]"
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className={SQUARE} />
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
          placeholder={m.cv_ph_scope()}
          rich
          value={value}
        />
      </p>
    </Show>
  );
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 18,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            left={
              <>
                <span className="font-bold uppercase tracking-[0.03em]">
                  <E
                    path={`${p}.company`}
                    placeholder={m.cv_ph_company()}
                    value={e.company}
                  />
                </span>
                <Place p={p} value={e.location} />
              </>
            }
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
            }
          />
          <p className="font-semibold text-[13px] text-[var(--cv-accent)]">
            <E
              path={`${p}.role`}
              placeholder={m.cv_ph_job_title()}
              value={e.role}
            />
          </p>
          <Description p={p} value={e.description} />
          <Bullets items={e.highlights} list={`${p}.highlights`} />
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
      gap: 10,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            left={
              <>
                <span className="font-bold">
                  <E
                    path={`${p}.degree`}
                    placeholder={m.cv_ph_degree()}
                    value={e.degree}
                  />
                </span>
                <Show path={p} value={e.school}>
                  <span>
                    {", "}
                    <E
                      path={`${p}.school`}
                      placeholder={m.cv_ph_school()}
                      value={e.school}
                    />
                  </span>
                </Show>
                <Place p={p} value={e.location} />
              </>
            }
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
            }
          />
          <Description p={p} value={e.description} />
        </Sel>
      ),
    };
  });
}

/** Skill groups as "core competencies": items in two columns. */
function skillBlocks(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="font-semibold text-[#333]">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
          </Show>
          <div className="mt-[3px] grid grid-cols-2 gap-x-8 gap-y-[3px]">
            {s.items.map((it, j) => (
              <SkillLine
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="font-semibold"
              />
            ))}
          </div>
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
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Head
            left={
              <span className="font-bold">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_project_name()}
                  value={pr.name}
                />
              </span>
            }
            right={
              <Show path={p} value={pr.url}>
                <span className="text-[#777] text-[11.6px]">
                  <E
                    path={`${p}.url`}
                    placeholder={m.cv_ph_link()}
                    value={pr.url}
                  />
                </span>
              </Show>
            }
          />
          <Description p={p} value={pr.description} />
          <Bullets items={pr.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });
}

function languageBlocks(cv: CV): Block[] {
  return [{ key: "languages", gap: 10, node: <InlineLanguages cv={cv} /> }];
}

function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
            left={
              <>
                <span className="font-bold">
                  <E
                    path={`${p}.title`}
                    placeholder={m.cv_ph_title()}
                    value={it.title}
                  />
                </span>
                <Show path={p} value={it.subtitle}>
                  <span>
                    {", "}
                    <E
                      path={`${p}.subtitle`}
                      placeholder={m.cv_ph_subtitle()}
                      value={it.subtitle}
                    />
                  </span>
                </Show>
                <Place p={p} value={it.location} />
              </>
            }
            right={
              <Show path={p} value={it.date}>
                <span className={DATES}>
                  <E
                    path={`${p}.date`}
                    placeholder={m.cv_ph_date()}
                    value={it.date}
                  />
                </span>
              </Show>
            }
          />
          <Description p={p} value={it.description} />
          <Bullets items={it.highlights} list={`${p}.highlights`} />
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

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-[color-mix(in_srgb,var(--cv-accent)_35%,white)] border-b pb-[3px] font-bold text-[13px] text-[var(--cv-accent)] uppercase tracking-[0.12em]">
      {children}
    </h2>
  );
}

/**
 * A senior-level résumé: name and headline over an accent rule, a short
 * executive profile, competencies in two columns and company-first entries.
 */
export const executive: TemplateDef = {
  id: "executive",
  category: "professional",
  name: "Executive",
  description: "Confident header, competencies grid. For senior roles.",
  defaults: {
    font: "inter",
    accent: "#1f3a5f",
    padX: 54,
    padTop: 50,
    padBottom: 42,
  },
  sheetClassName: "text-[12.3px] leading-[1.5] text-[#1f1f1f]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="font-bold text-[30px] text-[var(--cv-accent)] uppercase leading-[1.1] tracking-[0.04em]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-[6px] font-medium text-[#444] text-[13px] uppercase tracking-[0.14em]">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <div className="mt-3 h-[3px] bg-[var(--cv-accent)]" />
            <Contacts
              className="mt-[7px] flex flex-wrap text-[#444] text-[11.8px]"
              cv={cv}
              separator={<span className="mx-[9px] text-[#bbb]">|</span>}
            />
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 20,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <Heading>
              <E
                path="labels.profile"
                placeholder={m.cv_ph_executive_profile()}
                value={cv.labels.profile}
              />
            </Heading>
            <p className="mt-[6px] text-[12.8px]">
              <E
                multiline
                path="basics.summary"
                placeholder={m.cv_ph_summary()}
                rich
                value={b.summary}
              />
            </p>
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
