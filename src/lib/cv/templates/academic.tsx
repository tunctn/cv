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

const GRID = "grid grid-cols-[104px_1fr] gap-x-5";
const DATE = "text-[#555] text-[11.6px] tabular-nums leading-[1.6]";

const Row = ({
  margin,
  children,
}: {
  margin?: ReactNode;
  children: ReactNode;
}) => (
  <div className={GRID}>
    <div className={DATE}>{margin}</div>
    <div className="min-w-0">{children}</div>
  </div>
);

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[2px] list-disc pl-[18px] marker:text-[#888]">
      {items.map((h, j) => (
        <Sel
          as="li"
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
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
};

const Description = ({ p, value }: { p: string; value: string }) => (
  <Show path={p} value={value}>
    <p className="mt-[2px] text-[#333]">
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

const Where = ({
  p,
  name,
  location,
  placeholder,
}: {
  p: string;
  name: { field: string; value: string };
  location: string;
  placeholder: string;
}) => (
  <p className="italic">
    <Show path={p} value={name.value}>
      <E
        path={`${p}.${name.field}`}
        placeholder={placeholder}
        value={name.value}
      />
    </Show>
    <Show path={p} value={location}>
      <span>
        {name.value ? ", " : null}
        <E
          path={`${p}.location`}
          placeholder={m.cv_ph_location()}
          value={location}
        />
      </span>
    </Show>
  </p>
);

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 8 : 12,
      node: (
        <Sel label={m.cv_sel_position()} list="experience" path={p}>
          <Row
            margin={
              <DateRange end={e.end} p={p} separator="–" start={e.start} />
            }
          >
            <p className="font-semibold">
              <E
                path={`${p}.role`}
                placeholder={m.cv_ph_position()}
                value={e.role}
              />
            </p>
            <Where
              location={e.location}
              name={{ field: "company", value: e.company }}
              p={p}
              placeholder={m.cv_ph_institution()}
            />
            <Description p={p} value={e.description} />
            <Bullets items={e.highlights} list={`${p}.highlights`} />
          </Row>
        </Sel>
      ),
    };
  });

const educationBlocks = (cv: CV): Block[] =>
  cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 8 : 10,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Row
            margin={
              <DateRange end={e.end} p={p} separator="–" start={e.start} />
            }
          >
            <p className="font-semibold">
              <E
                path={`${p}.degree`}
                placeholder={m.cv_ph_degree()}
                value={e.degree}
              />
            </p>
            <Where
              location={e.location}
              name={{ field: "school", value: e.school }}
              p={p}
              placeholder={m.cv_ph_university()}
            />
            <Description p={p} value={e.description} />
          </Row>
        </Sel>
      ),
    };
  });

const skillBlocks = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 8 : 10,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Row
            margin={
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            }
          >
            {s.items.map((it, j) => (
              <SkillLine
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="italic"
              />
            ))}
          </Row>
        </Sel>
      ),
    };
  });

const projectBlocks = (cv: CV): Block[] =>
  cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 8 : 12,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Row>
            <p className="font-semibold">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_project_name()}
                value={pr.name}
              />
            </p>
            <Show path={p} value={pr.url}>
              <p className="text-[#555] italic">
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

const languageBlocks = (cv: CV): Block[] => [
  {
    key: "languages",
    gap: 8,
    node: (
      <div>
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
                margin={
                  <E
                    path={`${p}.name`}
                    placeholder={m.cv_ph_language()}
                    value={l.name}
                  />
                }
              >
                <Show path={p} value={l.level}>
                  <E
                    path={`${p}.level`}
                    placeholder={m.cv_ph_level()}
                    value={l.level}
                  />
                </Show>
              </Row>
            </Sel>
          );
        })}
      </div>
    ),
  },
];

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 8 : 7,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Row
            margin={
              <Show path={p} value={it.date}>
                <E
                  path={`${p}.date`}
                  placeholder={m.cv_ph_year()}
                  value={it.date}
                />
              </Show>
            }
          >
            <p className="pl-[14px] -indent-[14px]">
              <E
                path={`${p}.title`}
                placeholder={m.cv_ph_title()}
                rich
                value={it.title}
              />
              <Show path={p} value={it.subtitle}>
                <span className="italic">
                  {". "}
                  <E
                    path={`${p}.subtitle`}
                    placeholder={m.cv_ph_venue()}
                    rich
                    value={it.subtitle}
                  />
                </span>
              </Show>
              <Show path={p} value={it.location}>
                <span>
                  {", "}
                  <E
                    path={`${p}.location`}
                    placeholder={m.cv_ph_place()}
                    value={it.location}
                  />
                </span>
              </Show>
            </p>
            <Description p={p} value={it.description} />
            <Bullets items={it.highlights} list={`${p}.highlights`} />
          </Row>
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
  <h2 className="flex items-center gap-3 text-[15px] tracking-[0.02em] text-[var(--cv-accent)] [font-variant-caps:small-caps]">
    {children}
    <span className="h-px flex-1 bg-[#bbb]" />
  </h2>
);

/**
 * A conservative academic CV: serif, dates in the margin, small-caps section
 * titles with a hairline, and citation-style entries for publications, grants
 * and talks (added as custom sections).
 */
export const academic: TemplateDef = {
  id: "academic",
  category: "academic",
  name: "Academic",
  description: "Serif CV with a date margin. Publications read as citations.",
  defaults: {
    font: "source-serif-4",
    accent: "#1f3a5f",
    padX: 64,
    padTop: 60,
    padBottom: 52,
  },
  sheetClassName: "text-[12.6px] leading-[1.5] text-[#1a1a1a]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="text-[29px] leading-tight tracking-[-0.005em] text-[var(--cv-accent)]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-[2px] text-[14px] text-[#444] italic">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_academic_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <Contacts
              className="mt-2 flex flex-wrap text-[11.8px] text-[#444]"
              cv={cv}
              separator={<span className="mx-2 text-[#aaa]">·</span>}
            />
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
                placeholder={m.cv_ph_research_interests()}
                value={cv.labels.profile}
              />
            </Heading>
            <div className="mt-2">
              <Row>
                <p>
                  <E
                    multiline
                    path="basics.summary"
                    placeholder={m.cv_ph_research_interests()}
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
