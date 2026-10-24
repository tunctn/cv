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
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
} from "./kit";

const DATE = "shrink-0 font-mono text-[#666] text-[10.7px] tabular-nums";

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-0.5 list-[square] pl-4 text-[#333] marker:text-[#999]">
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
      <p className="text-[#333]">
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

/** Bold title, " — " and the place on the left; dates on the right. */
function Head({
  p,
  title,
  sub,
  location,
  dates,
}: {
  p: string;
  title: ReactNode;
  sub: { path: string; value: string; placeholder: string };
  location?: string;
  dates: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="min-w-0">
        <span className="font-bold">{title}</span>
        <Show path={p} value={sub.value}>
          <span>
            {" — "}
            <E
              path={sub.path}
              placeholder={sub.placeholder}
              value={sub.value}
            />
          </span>
        </Show>
        {location === undefined ? null : (
          <Show path={p} value={location}>
            <span className="text-[#888]">
              {", "}
              <E
                path={`${p}.location`}
                placeholder={m.cv_ph_location()}
                value={location}
              />
            </span>
          </Show>
        )}
      </p>
      {dates}
    </div>
  );
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 8 : 12,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            dates={
              <DateRange className={DATE} end={e.end} p={p} start={e.start} />
            }
            location={e.location}
            p={p}
            sub={{
              path: `${p}.company`,
              value: e.company,
              placeholder: m.cv_ph_company(),
            }}
            title={
              <E
                path={`${p}.role`}
                placeholder={m.cv_ph_job_title()}
                value={e.role}
              />
            }
          />
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
      gap: i === 0 ? 8 : 6,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            dates={
              <DateRange className={DATE} end={e.end} p={p} start={e.start} />
            }
            p={p}
            sub={{
              path: `${p}.school`,
              value: e.school,
              placeholder: m.cv_ph_school(),
            }}
            title={
              <E
                path={`${p}.degree`}
                placeholder={m.cv_ph_degree()}
                value={e.degree}
              />
            }
          />
          <Description p={p} value={e.description} />
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
      gap: i === 0 ? 8 : 10,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <p className="font-bold">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_group_name()}
              value={s.name}
            />
          </p>
          <div
            className={
              s.columns === 2 ? "grid grid-cols-2 gap-x-8" : "space-y-0"
            }
          >
            {s.items.map((it, j) => (
              <SkillLine
                className="text-[#333]"
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="font-semibold text-[#111]"
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
      gap: i === 0 ? 8 : 12,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <p>
            <span className="font-bold">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_project_name()}
                value={pr.name}
              />
            </span>
            <Show path={p} value={pr.url}>
              <span className="font-mono text-[#666] text-[10.7px]">
                {"  "}
                <E
                  path={`${p}.url`}
                  placeholder={m.cv_ph_link()}
                  value={pr.url}
                />
              </span>
            </Show>
          </p>
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
      gap: 8,
      node: <InlineLanguages className="text-[#333]" cv={cv} />,
    },
  ];
}

function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 8 : 12,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
            dates={
              <Show path={p} value={it.date}>
                <span className={DATE}>
                  <E
                    path={`${p}.date`}
                    placeholder={m.cv_ph_date()}
                    value={it.date}
                  />
                </span>
              </Show>
            }
            location={it.location}
            p={p}
            sub={{
              path: `${p}.subtitle`,
              value: it.subtitle,
              placeholder: m.cv_ph_subtitle(),
            }}
            title={
              <E
                path={`${p}.title`}
                placeholder={m.cv_ph_title()}
                value={it.title}
              />
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

function Band({ cv, padX }: { cv: CV; padX: number }) {
  const b = cv.basics;
  return (
    <Sel
      className="bg-[var(--cv-accent)] text-white"
      label={m.cv_sel_details()}
      path="basics"
    >
      <div
        className="flex items-end justify-between gap-6"
        style={{ padding: `32px ${padX}px 30px` }}
      >
        <div className="min-w-0">
          <h1 className="font-bold text-[29px] leading-none tracking-[-0.02em]">
            <E
              path="basics.name"
              placeholder={m.cv_ph_your_name()}
              value={b.name}
            />
          </h1>
          <Show path="basics" value={b.headline}>
            <p className="mt-2 text-white/70">
              <E
                path="basics.headline"
                placeholder={m.cv_ph_headline()}
                value={b.headline}
              />
            </p>
          </Show>
        </div>
        <Contacts
          className="shrink-0 text-right font-mono text-[10.7px] text-white/80"
          cv={cv}
          itemClassName="block"
        />
      </div>
    </Sel>
  );
}

/** Dense layout with a dark header band; fits a lot on one page. */
export const compact: TemplateDef = {
  id: "compact",
  category: "professional",
  name: "Compact",
  description: "Dense, dark header. Fits more.",
  defaults: {
    font: "inter",
    accent: "#111111",
    padX: 48,
    padTop: 40,
    padBottom: 28,
  },
  sheetClassName: "text-[12.7px] leading-[1.45]",
  build(cv) {
    const { padX } = resolveStyle(compact, cv);
    const b = cv.basics;
    const blocks: Block[] = [
      { key: "header", bleed: true, node: <Band cv={cv} padX={padX} /> },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 26,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="text-[#333]">
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
            <h2 className="flex items-center gap-3 font-bold text-[14px]">
              <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
              <span className="h-[2px] flex-1 bg-[var(--cv-accent)]" />
            </h2>
          </Sel>
        ),
      });
      blocks.push(...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks));
    }
    return { main: blocks };
  },
};
