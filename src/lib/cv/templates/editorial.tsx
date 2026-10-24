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

const muted = "text-[#777] text-[11.3px]";

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-1 space-y-0.5 text-[#333]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="pl-5"
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="-ml-5 inline-block w-5 text-[#aaa]">—</span>
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
    <p className="mt-1 text-[#333]">
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

const Head = ({
  name,
  title,
  side,
}: {
  name: ReactNode;
  title: ReactNode;
  side: ReactNode;
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <p className="min-w-0">
      {name}
      {title}
    </p>
    <div className="shrink-0 text-right">{side}</div>
  </div>
);

const Italic = ({
  path,
  value,
  item,
  placeholder,
  lead,
}: {
  path: string;
  value: string;
  item: string;
  placeholder: string;
  lead: boolean;
}) => (
  <Show path={item} value={value}>
    <span className="italic">
      {lead ? ", " : null}
      <E path={path} placeholder={placeholder} value={value} />
    </span>
  </Show>
);

const Side = ({
  p,
  start,
  end,
  location,
}: {
  p: string;
  start: string;
  end: string;
  location: string;
}) => (
  <div className={`${muted} flex justify-end tabular-nums`}>
    <Show path={p} value={location}>
      <span>
        <E
          path={`${p}.location`}
          placeholder={m.cv_ph_location()}
          value={location}
        />
        <span className="mx-1.5 text-[#bbb]">·</span>
      </span>
    </Show>
    <DateRange end={end} p={p} start={start} />
  </div>
);

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 16 : 20,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            name={
              <span className="font-semibold">
                <E
                  path={`${p}.company`}
                  placeholder={m.cv_ph_company()}
                  value={e.company}
                />
              </span>
            }
            side={
              <Side end={e.end} location={e.location} p={p} start={e.start} />
            }
            title={
              <Italic
                item={p}
                lead={Boolean(e.company)}
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

const educationBlocks = (cv: CV): Block[] =>
  cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 16 : 14,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            name={
              <span className="font-semibold">
                <E
                  path={`${p}.school`}
                  placeholder={m.cv_ph_school()}
                  value={e.school}
                />
              </span>
            }
            side={
              <Side end={e.end} location={e.location} p={p} start={e.start} />
            }
            title={
              <Italic
                item={p}
                lead={Boolean(e.school)}
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

const skillBlocks = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 16 : 14,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <p className="font-semibold">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_group_name()}
              value={s.name}
            />
          </p>
          {s.items.map((it, j) => (
            <SkillLine
              className="text-[#333]"
              group={p}
              index={j}
              item={it}
              key={it.id}
              titleClassName="italic"
            />
          ))}
        </Sel>
      ),
    };
  });

const projectBlocks = (cv: CV): Block[] =>
  cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 16 : 20,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Head
            name={
              <span className="font-semibold">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_project_name()}
                  value={pr.name}
                />
              </span>
            }
            side={
              <Show path={p} value={pr.url}>
                <p className={muted}>
                  <E
                    path={`${p}.url`}
                    placeholder={m.cv_ph_link()}
                    value={pr.url}
                  />
                </p>
              </Show>
            }
            title={null}
          />
          <Description p={p} value={pr.description} />
          <Bullets items={pr.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });

const languageBlocks = (cv: CV): Block[] => [
  {
    key: "languages",
    gap: 14,
    node: (
      <InlineLanguages
        className="text-center text-[#333]"
        close=""
        cv={cv}
        levelClassName="italic"
        open=", "
        separator={<span className="mx-2.5 text-[#bbb]">·</span>}
      />
    ),
  },
];

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 16 : 20,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
            name={
              <span className="font-semibold">
                <E
                  path={`${p}.title`}
                  placeholder={m.cv_ph_title()}
                  value={it.title}
                />
              </span>
            }
            side={
              <div className={`${muted} flex justify-end tabular-nums`}>
                <Show path={p} value={it.location}>
                  <span>
                    <E
                      path={`${p}.location`}
                      placeholder={m.cv_ph_location()}
                      value={it.location}
                    />
                  </span>
                </Show>
                {it.location && it.date ? (
                  <span className="mx-1.5 text-[#bbb]">·</span>
                ) : null}
                <Show path={p} value={it.date}>
                  <span>
                    <E
                      path={`${p}.date`}
                      placeholder={m.cv_ph_date()}
                      value={it.date}
                    />
                  </span>
                </Show>
              </div>
            }
            title={
              <Italic
                item={p}
                lead={Boolean(it.title)}
                path={`${p}.subtitle`}
                placeholder={m.cv_ph_subtitle()}
                value={it.subtitle}
              />
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

/** Serif, centred header and hairline section titles. */
export const editorial: TemplateDef = {
  id: "editorial",
  category: "simple",
  name: "Editorial",
  description: "Serif type, centred and calm.",
  defaults: {
    font: "source-serif-4",
    accent: "#1c1c1c",
    padX: 72,
    padTop: 64,
    padBottom: 56,
  },
  sheetClassName: "text-[14px] leading-[1.55]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel className="text-center" label={m.cv_sel_details()} path="basics">
            <h1 className="text-[40px] leading-tight tracking-[-0.01em] text-[var(--cv-accent)]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-1 text-[16px] text-[#555] italic">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <Contacts
              className="mt-3 flex flex-wrap justify-center text-[11.3px] text-[#666]"
              cv={cv}
              separator={<span className="mx-2 text-[#bbb]">/</span>}
            />
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 30,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="mx-auto max-w-[560px] text-center text-[14.6px] text-[#333]">
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
          gap: 32,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <h2 className="flex items-center gap-4 text-[17.3px] text-[var(--cv-accent)] italic">
                <span className="h-px flex-1 bg-[#ddd]" />
                <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
                <span className="h-px flex-1 bg-[#ddd]" />
              </h2>
            </Sel>
          ),
        },
        ...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks)
      );
    }
    return { main: blocks };
  },
};
