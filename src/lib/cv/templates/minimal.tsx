import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CustomSection, CV, SectionKey } from "../schema";
import {
  Contacts,
  DateRange,
  orderedSections,
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
} from "./kit";

const GRID = "grid grid-cols-[132px_1fr] gap-6";
const LABEL = "text-[#999] text-[12px] leading-[1.75]";

/** Muted label on the left, content on the right. */
function Row({
  label,
  children,
  className,
}: {
  label: ReactNode;
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

function Lines({ list, items }: { list: string; items: string[] }) {
  return items.map((h, j) => (
    <Sel
      className="text-[#444]"
      // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
      key={j}
      label={m.cv_sel_bullet()}
      list={list}
      path={`${list}.${j}`}
    >
      <E path={`${list}.${j}`} placeholder={m.cv_ph_bullet()} rich value={h} />
    </Sel>
  ));
}

function Description({ p, value }: { p: string; value: string }) {
  return (
    <Show path={p} value={value}>
      <p className="text-[#444]">
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

function When({
  p,
  start,
  end,
  location,
}: {
  p: string;
  start: string;
  end: string;
  location: string;
}) {
  return (
    <>
      <DateRange end={end} p={p} start={start} />
      <Show path={p} value={location}>
        <p>
          <E
            path={`${p}.location`}
            placeholder={m.cv_ph_location()}
            value={location}
          />
        </p>
      </Show>
    </>
  );
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 12 : 24,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Row
            label={
              <When end={e.end} location={e.location} p={p} start={e.start} />
            }
          >
            <p className="font-medium">
              <E
                path={`${p}.role`}
                placeholder={m.cv_ph_job_title()}
                value={e.role}
              />
              <Show path={p} value={e.company}>
                <span className="font-normal text-[#888]">
                  {" at "}
                  <E
                    path={`${p}.company`}
                    placeholder={m.cv_ph_company()}
                    value={e.company}
                  />
                </span>
              </Show>
            </p>
            <Description p={p} value={e.description} />
            <Lines items={e.highlights} list={`${p}.highlights`} />
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
      gap: i === 0 ? 12 : 20,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Row
            label={
              <When end={e.end} location={e.location} p={p} start={e.start} />
            }
          >
            <p className="font-medium">
              <E
                path={`${p}.degree`}
                placeholder={m.cv_ph_degree()}
                value={e.degree}
              />
            </p>
            <Show path={p} value={e.school}>
              <p className="text-[#888]">
                <E
                  path={`${p}.school`}
                  placeholder={m.cv_ph_school()}
                  value={e.school}
                />
              </p>
            </Show>
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
      gap: i === 0 ? 12 : 20,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Row
            label={
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            }
          >
            {s.items.map((it, j) => (
              <SkillLine
                className="text-[#444]"
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="text-[#222]"
              />
            ))}
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
      gap: i === 0 ? 12 : 24,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Row
            label={
              <Show path={p} value={pr.url}>
                <p className="break-words">
                  <E
                    path={`${p}.url`}
                    placeholder={m.cv_ph_link()}
                    value={pr.url}
                  />
                </p>
              </Show>
            }
          >
            <p className="font-medium">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_project_name()}
                value={pr.name}
              />
            </p>
            <Description p={p} value={pr.description} />
            <Lines items={pr.highlights} list={`${p}.highlights`} />
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
      gap: 12,
      node: (
        <div className="space-y-1">
          {cv.languages.map((l, i) => {
            const p = `languages.${i}`;
            return (
              <Sel
                key={l.id}
                label={m.cv_sel_language()}
                list="languages"
                path={p}
              >
                <Row
                  label={
                    <Show path={p} value={l.level}>
                      <E
                        path={`${p}.level`}
                        placeholder={m.cv_ph_level()}
                        value={l.level}
                      />
                    </Show>
                  }
                >
                  <E
                    path={`${p}.name`}
                    placeholder={m.cv_ph_language()}
                    value={l.name}
                  />
                </Row>
              </Sel>
            );
          })}
        </div>
      ),
    },
  ];
}

function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 12 : 24,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Row
            label={
              <>
                <Show path={p} value={it.date}>
                  <p>
                    <E
                      path={`${p}.date`}
                      placeholder={m.cv_ph_date()}
                      value={it.date}
                    />
                  </p>
                </Show>
                <Show path={p} value={it.location}>
                  <p>
                    <E
                      path={`${p}.location`}
                      placeholder={m.cv_ph_location()}
                      value={it.location}
                    />
                  </p>
                </Show>
              </>
            }
          >
            <p className="font-medium">
              <E
                path={`${p}.title`}
                placeholder={m.cv_ph_title()}
                value={it.title}
              />
            </p>
            <Show path={p} value={it.subtitle}>
              <p className="text-[#888]">
                <E
                  path={`${p}.subtitle`}
                  placeholder={m.cv_ph_subtitle()}
                  value={it.subtitle}
                />
              </p>
            </Show>
            <Description p={p} value={it.description} />
            <Lines items={it.highlights} list={`${p}.highlights`} />
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

/** Two-column grid: dates and labels on the left, content on the right. */
export const minimal: TemplateDef = {
  id: "minimal",
  category: "simple",
  name: "Minimal",
  description: "Dates on the left, lots of air.",
  defaults: {
    font: "inter",
    accent: "#222222",
    padX: 64,
    padTop: 64,
    padBottom: 56,
  },
  sheetClassName: "text-[12.7px] leading-[1.6] text-[#222]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <Row label={null}>
              <h1 className="font-medium text-[26.7px] text-[var(--cv-accent)] leading-[1.3] tracking-[-0.02em]">
                <E
                  path="basics.name"
                  placeholder={m.cv_ph_your_name()}
                  value={b.name}
                />
              </h1>
              <Show path="basics" value={b.headline}>
                <p className="text-[#888]">
                  <E
                    path="basics.headline"
                    placeholder={m.cv_ph_headline()}
                    value={b.headline}
                  />
                </p>
              </Show>
              <Contacts
                className="mt-4 flex flex-wrap gap-x-6 text-[#444]"
                cv={cv}
                itemClassName="min-w-0 break-words"
              />
            </Row>
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 28,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <div className={GRID}>
              <h2 className="font-medium text-[var(--cv-accent)]">
                <E
                  path="labels.profile"
                  placeholder={m.cv_ph_profile()}
                  value={cv.labels.profile}
                />
              </h2>
              <p className="text-[#444]">
                <E
                  multiline
                  path="basics.summary"
                  placeholder={m.cv_ph_summary()}
                  rich
                  value={b.summary}
                />
              </p>
            </div>
          </Sel>
        ),
      });
    }
    for (const key of orderedSections(cv)) {
      blocks.push({
        key: `title-${key}`,
        gap: 40,
        keepWithNext: true,
        node: (
          <Sel
            label={m.cv_sel_section()}
            list="sections"
            path={`sections.${key}`}
          >
            <h2 className="font-medium text-[var(--cv-accent)]">
              <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
            </h2>
          </Sel>
        ),
      });
      blocks.push(...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks));
    }
    return { main: blocks };
  },
};
