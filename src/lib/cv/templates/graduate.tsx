import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type {
  CustomSection,
  CV,
  OrderKey,
  Project,
  SectionKey,
} from "../schema";
import {
  Contacts,
  DateRange,
  InlineLanguages,
  orderedSections,
  Photo,
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
} from "./kit";

const DATES =
  "shrink-0 whitespace-nowrap text-right text-[11px] text-[#667085] tabular-nums";
const MUTED = "text-[#667085]";

function Head({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">{left}</div>
      {right}
    </div>
  );
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[2px] list-disc pl-[15px] text-[#344054] marker:text-[var(--cv-accent)]">
      {items.map((h, j) => (
        <Sel
          as="li"
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
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
      <p className="mt-[2px] text-[#344054]">
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

function Place({ p, value }: { p: string; value: string }) {
  return (
    <Show path={p} value={value}>
      <span>
        {" · "}
        <E
          path={`${p}.location`}
          placeholder={m.cv_ph_location()}
          value={value}
        />
      </span>
    </Show>
  );
}

/** Education leads: the degree large, school and place under it. */
function educationBlocks(cv: CV): Block[] {
  return cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 8 : 10,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            left={
              <p className="font-bold text-[#101828] text-[13.2px]">
                <E
                  path={`${p}.degree`}
                  placeholder={m.cv_ph_degree()}
                  value={e.degree}
                />
              </p>
            }
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
            }
          />
          <p className="text-[#344054]">
            <span className="font-medium text-[var(--cv-accent)]">
              <E
                path={`${p}.school`}
                placeholder={m.cv_ph_school()}
                value={e.school}
              />
            </span>
            <Place p={p} value={e.location} />
          </p>
          <Description p={p} value={e.description} />
        </Sel>
      ),
    };
  });
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 8 : 10,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            left={
              <p>
                <span className="font-semibold text-[#101828]">
                  <E
                    path={`${p}.role`}
                    placeholder={m.cv_ph_job_title()}
                    value={e.role}
                  />
                </span>
                <Show path={p} value={e.company}>
                  <span className="text-[var(--cv-accent)]">
                    {" · "}
                    <E
                      path={`${p}.company`}
                      placeholder={m.cv_ph_company()}
                      value={e.company}
                    />
                  </span>
                </Show>
                <Show path={p} value={e.location}>
                  <span className={MUTED}>
                    {" · "}
                    <E
                      path={`${p}.location`}
                      placeholder={m.cv_ph_location()}
                      value={e.location}
                    />
                  </span>
                </Show>
              </p>
            }
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
            }
          />
          <Description p={p} value={e.description} />
          <Bullets items={e.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });
}

function ProjectCard({ pr, p }: { pr: Project; p: string }) {
  return (
    <Sel
      className="border-[var(--cv-accent)] border-l-2 pl-[10px]"
      label={m.cv_sel_project()}
      list="projects"
      path={p}
    >
      <p className="font-semibold text-[#101828]">
        <E
          path={`${p}.name`}
          placeholder={m.cv_ph_project_name()}
          value={pr.name}
        />
      </p>
      <Show path={p} value={pr.url}>
        <p className={`text-[10.8px] ${MUTED}`}>
          <E path={`${p}.url`} placeholder={m.cv_ph_link()} value={pr.url} />
        </p>
      </Show>
      <Description p={p} value={pr.description} />
      <Bullets items={pr.highlights} list={`${p}.highlights`} />
    </Sel>
  );
}

/** Projects side by side, two per row. */
function projectBlocks(cv: CV): Block[] {
  const rows: Block[] = [];
  for (let i = 0; i < cv.projects.length; i += 2) {
    const pair = cv.projects.slice(i, i + 2);
    rows.push({
      key: pair.map((pr) => pr.id).join("+"),
      gap: i === 0 ? 8 : 12,
      node: (
        <div className="grid grid-cols-2 gap-x-6">
          {pair.map((pr, k) => (
            <ProjectCard key={pr.id} p={`projects.${i + k}`} pr={pr} />
          ))}
        </div>
      ),
    });
  }
  return rows;
}

function skillBlocks(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: 8,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <div className="grid grid-cols-[124px_1fr] gap-x-4">
            <p className="font-semibold text-[#101828]">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
            <div className="space-y-[2px]">
              {s.items.map((it, j) => (
                <SkillLine
                  className="text-[#344054]"
                  group={p}
                  index={j}
                  item={it}
                  key={it.id}
                  titleClassName="font-medium text-[#101828]"
                />
              ))}
            </div>
          </div>
        </Sel>
      ),
    };
  });
}

function languageBlocks(cv: CV): Block[] {
  return [
    {
      key: "languages",
      gap: 8,
      node: (
        <InlineLanguages
          className="text-[#344054]"
          cv={cv}
          levelClassName={MUTED}
          separator={<span className="mx-[7px] text-[#d0d5dd]">|</span>}
        />
      ),
    },
  ];
}

/** Activities, awards, volunteering: title and role on one line, date on the right. */
function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: 8,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
            left={
              <p>
                <span className="font-semibold text-[#101828]">
                  <E
                    path={`${p}.title`}
                    placeholder={m.cv_ph_title()}
                    value={it.title}
                  />
                </span>
                <Show path={p} value={it.subtitle}>
                  <span className="text-[var(--cv-accent)]">
                    {" · "}
                    <E
                      path={`${p}.subtitle`}
                      placeholder={m.cv_ph_subtitle()}
                      value={it.subtitle}
                    />
                  </span>
                </Show>
                <Show path={p} value={it.location}>
                  <span className={MUTED}>
                    {" · "}
                    <E
                      path={`${p}.location`}
                      placeholder={m.cv_ph_location()}
                      value={it.location}
                    />
                  </span>
                </Show>
              </p>
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

/** Education always comes first; the rest keeps the user's order. */
function graduateOrder(cv: CV): OrderKey[] {
  const keys = orderedSections(cv);
  return keys.includes("education")
    ? ["education", ...keys.filter((k) => k !== "education")]
    : keys;
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-[#e4e7ec] border-b font-bold text-[#101828] text-[11.6px] uppercase tracking-[0.12em]">
      <span className="-mb-px inline-block border-[var(--cv-accent)] border-b-2 pb-[3px]">
        {children}
      </span>
    </h2>
  );
}

/**
 * For students and recent graduates: education first, projects side by side
 * and activities kept compact, so a short history fills one page well.
 */
export const graduate: TemplateDef = {
  id: "graduate",
  category: "student",
  name: "Graduate",
  description: "Education first, projects side by side. One page.",
  defaults: {
    font: "inter",
    accent: "#2457d6",
    padX: 46,
    padTop: 40,
    padBottom: 32,
  },
  sheetClassName: "text-[11.8px] leading-[1.45] text-[#1d2939]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <div className="flex items-center gap-[16px]">
              <Photo
                className="h-[64px] w-[64px] rounded-full"
                cv={cv}
                height={64}
                width={64}
              />
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-[#101828] text-[26px] leading-[1.1] tracking-[-0.02em]">
                  <E
                    path="basics.name"
                    placeholder={m.cv_ph_your_name()}
                    value={b.name}
                  />
                </h1>
                <Show path="basics" value={b.headline}>
                  <p className="mt-[2px] font-medium text-[13px] text-[var(--cv-accent)]">
                    <E
                      path="basics.headline"
                      placeholder={m.cv_ph_headline()}
                      value={b.headline}
                    />
                  </p>
                </Show>
              </div>
              <Contacts
                className="max-w-[46%] shrink-0 text-right text-[#475467] text-[11px] leading-[1.5]"
                cv={cv}
                itemClassName="block break-words"
              />
            </div>
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 14,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="text-[#344054]">
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
    for (const key of graduateOrder(cv)) {
      blocks.push({
        key: `title-${key}`,
        gap: 16,
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
