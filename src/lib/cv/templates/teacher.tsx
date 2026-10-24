import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import { type Block, resolveStyle, type TemplateDef } from "../engine";
import type { CustomSection, CV, SectionKey } from "../schema";
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

const TINT = "bg-[color-mix(in_srgb,var(--cv-accent)_8%,#fffaf6)]";
const DATES =
  "shrink-0 whitespace-nowrap text-right text-[11.4px] text-[#8a7a72] italic";
const SOFT = "text-[#5b4d47]";

function Head({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-5">
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
    <ul className="mt-[5px] space-y-[3px] text-[#3a302c]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[16px]"
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="absolute top-[0.55em] left-[2px] h-[6px] w-[6px] rounded-full border-[1.5px] border-[var(--cv-accent)]" />
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
      <p className="mt-[4px] text-[#3a302c]">
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
        {", "}
        <E
          path={`${p}.location`}
          placeholder={m.cv_ph_location()}
          value={value}
        />
      </span>
    </Show>
  );
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 12 : 18,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            left={
              <p className="font-semibold text-[#2a211e] text-[13.4px]">
                <E
                  path={`${p}.role`}
                  placeholder={m.cv_ph_job_title()}
                  value={e.role}
                />
              </p>
            }
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
            }
          />
          <p className={SOFT}>
            <span className="text-[var(--cv-accent)]">
              <E
                path={`${p}.company`}
                placeholder={m.cv_ph_company()}
                value={e.company}
              />
            </span>
            <Place p={p} value={e.location} />
          </p>
          <Description p={p} value={e.description} />
          <Bullets items={e.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });
}

/** Qualifications as soft cards, so they stand out on a teaching CV. */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className={`rounded-[10px] ${TINT} px-[14px] py-[10px]`}>
      {children}
    </div>
  );
}

function educationBlocks(cv: CV): Block[] {
  return cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 12 : 8,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Card>
            <Head
              left={
                <p className="font-semibold text-[#2a211e] text-[13.4px]">
                  <E
                    path={`${p}.degree`}
                    placeholder={m.cv_ph_degree()}
                    value={e.degree}
                  />
                </p>
              }
              right={
                <DateRange
                  className={DATES}
                  end={e.end}
                  p={p}
                  start={e.start}
                />
              }
            />
            <p className={SOFT}>
              <span className="text-[var(--cv-accent)]">
                <E
                  path={`${p}.school`}
                  placeholder={m.cv_ph_school()}
                  value={e.school}
                />
              </span>
              <Place p={p} value={e.location} />
            </p>
            <Description p={p} value={e.description} />
          </Card>
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
      gap: i === 0 ? 12 : 14,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="mb-[4px] font-semibold text-[#2a211e]">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
          </Show>
          <div
            className={
              s.columns === 2
                ? "grid grid-cols-2 gap-x-8 gap-y-[4px]"
                : "space-y-[4px]"
            }
          >
            {s.items.map((it, j) => (
              <SkillLine
                className="text-[#3a302c]"
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="font-semibold text-[var(--cv-accent)]"
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
      gap: i === 0 ? 12 : 16,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Head
            left={
              <p className="font-semibold text-[#2a211e] text-[13.4px]">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_project_name()}
                  value={pr.name}
                />
              </p>
            }
            right={
              <Show path={p} value={pr.url}>
                <span className={DATES}>
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
  return [
    {
      key: "languages",
      gap: 12,
      node: (
        <InlineLanguages
          className="text-[#3a302c]"
          cv={cv}
          levelClassName="text-[#8a7a72]"
          separator={<span className="mx-[8px] text-[#d6c7bf]">·</span>}
        />
      ),
    },
  ];
}

/** Certificates, training and the like: also cards, like the education entries. */
function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 12 : 8,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Card>
            <Head
              left={
                <p className="font-semibold text-[#2a211e] text-[13.4px]">
                  <E
                    path={`${p}.title`}
                    placeholder={m.cv_ph_title()}
                    value={it.title}
                  />
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
            <Show path={p} value={it.subtitle || it.location}>
              <p className={SOFT}>
                <span className="text-[var(--cv-accent)]">
                  <E
                    path={`${p}.subtitle`}
                    placeholder={m.cv_ph_subtitle()}
                    value={it.subtitle}
                  />
                </span>
                <Place p={p} value={it.location} />
              </p>
            </Show>
            <Description p={p} value={it.description} />
            <Bullets items={it.highlights} list={`${p}.highlights`} />
          </Card>
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

/** A friendly heading: a soft dot, the title, then a dotted line. */
function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-[10px] font-semibold text-[17px] text-[var(--cv-accent)] leading-[1.3]">
      <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-[color-mix(in_srgb,var(--cv-accent)_30%,white)] ring-[3px] ring-[color-mix(in_srgb,var(--cv-accent)_10%,white)]" />
      <span>{children}</span>
      <span className="mt-[4px] h-0 flex-1 border-[color-mix(in_srgb,var(--cv-accent)_30%,white)] border-b-[1.5px] border-dotted" />
    </h2>
  );
}

function Band({ cv, padX }: { cv: CV; padX: number }) {
  const b = cv.basics;
  return (
    <Sel className={TINT} label={m.cv_sel_details()} path="basics">
      <div
        className="flex items-center gap-[22px]"
        style={{ padding: `34px ${padX}px 26px` }}
      >
        <Photo
          className="h-[96px] w-[96px] rounded-full ring-4 ring-white"
          cv={cv}
          height={96}
          width={96}
        />
        <div className="min-w-0">
          <h1 className="font-semibold text-[#2a211e] text-[31px] leading-[1.12]">
            <E
              path="basics.name"
              placeholder={m.cv_ph_your_name()}
              value={b.name}
            />
          </h1>
          <Show path="basics" value={b.headline}>
            <p className="mt-[3px] text-[14px] text-[var(--cv-accent)] italic">
              <E
                path="basics.headline"
                placeholder={m.cv_ph_headline()}
                value={b.headline}
              />
            </p>
          </Show>
          <Contacts
            className="mt-[10px] flex flex-wrap gap-x-[16px] gap-y-[2px] text-[#5b4d47] text-[11.6px]"
            cv={cv}
            itemClassName="min-w-0 break-words"
          />
        </div>
      </div>
    </Sel>
  );
}

/**
 * Warm and approachable, for teachers and educators: a soft header band,
 * friendly headings, and qualifications and certificates set as cards.
 */
export const teacher: TemplateDef = {
  id: "teacher",
  category: "professional",
  name: "Teacher",
  description: "Warm header, friendly headings. Qualifications stand out.",
  defaults: {
    font: "lora",
    accent: "#b0503c",
    padX: 50,
    padTop: 44,
    padBottom: 40,
  },
  sheetClassName: "text-[12.3px] leading-[1.55] text-[#2a211e]",
  build(cv) {
    const { padX } = resolveStyle(teacher, cv);
    const b = cv.basics;
    const blocks: Block[] = [
      { key: "header", bleed: true, node: <Band cv={cv} padX={padX} /> },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 24,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <Heading>
              <E
                path="labels.profile"
                placeholder={m.cv_ph_profile()}
                value={cv.labels.profile}
              />
            </Heading>
            <p className="mt-[8px] text-[#3a302c]">
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
        gap: 26,
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
