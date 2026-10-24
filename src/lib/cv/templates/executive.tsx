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

const Head = ({ left, right }: { left: ReactNode; right?: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-6">
    <p className="min-w-0">{left}</p>
    {right ? <div className="shrink-0 text-right">{right}</div> : null}
  </div>
);

const Place = ({ p, value }: { p: string; value: string }) => (
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

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[3px] space-y-[2px]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[15px]"
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
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
};

const Description = ({ p, value }: { p: string; value: string }) => (
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

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 18,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            left={
              <>
                <span className="font-bold tracking-[0.03em] uppercase">
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
          <p className="text-[13px] font-semibold text-[var(--cv-accent)]">
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

const educationBlocks = (cv: CV): Block[] =>
  cv.education.map((e, i) => {
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

const skillBlocks = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
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

const projectBlocks = (cv: CV): Block[] =>
  cv.projects.map((pr, i) => {
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
                <span className="text-[11.6px] text-[#777]">
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

const languageBlocks = (cv: CV): Block[] => [
  { key: "languages", gap: 10, node: <InlineLanguages cv={cv} /> },
];

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
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

const SECTION_BLOCKS: Record<SectionKey, (cv: CV) => Block[]> = {
  experience: experienceBlocks,
  education: educationBlocks,
  skills: skillBlocks,
  projects: projectBlocks,
  languages: languageBlocks,
};

const Heading = ({ children }: { children: ReactNode }) => (
  <h2 className="border-b border-[color-mix(in_srgb,var(--cv-accent)_35%,white)] pb-[3px] text-[13px] font-bold tracking-[0.12em] text-[var(--cv-accent)] uppercase">
    {children}
  </h2>
);

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
            <h1 className="text-[30px] leading-[1.1] font-bold tracking-[0.04em] text-[var(--cv-accent)] uppercase">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-[6px] text-[13px] font-medium tracking-[0.14em] text-[#444] uppercase">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <div className="mt-3 h-[3px] bg-[var(--cv-accent)]" />
            <Contacts
              className="mt-[7px] flex flex-wrap text-[11.8px] text-[#444]"
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
      blocks.push(
        {
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
        },
        ...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks)
      );
    }
    return { main: blocks };
  },
};
