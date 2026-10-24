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
  sectionBlocks,
  sectionLabel,
} from "./kit";

/** Two hairlines 2px apart, in the accent colour. */
const DOUBLE_RULE = "border-[var(--cv-accent)] border-b-[3px] border-double";
const DATES = "shrink-0 whitespace-nowrap text-right tabular-nums";

const Row = ({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
}) => (
  <div
    className={`flex items-baseline justify-between gap-4 ${className ?? ""}`}
  >
    <div className="min-w-0">{left}</div>
    {right ? <div className={DATES}>{right}</div> : null}
  </div>
);

const Location = ({ p, value }: { p: string; value: string }) => (
  <Show path={p} value={value}>
    <span>
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
    <ul className="mt-[2px]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[14px]"
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="absolute top-[0.62em] left-[3px] h-[4px] w-[4px] bg-[#222]" />
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
    <p className="mt-[1px]">
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

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 6 : 10,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Row
            left={
              <p className="font-bold">
                <E
                  path={`${p}.company`}
                  placeholder={m.cv_ph_company()}
                  value={e.company}
                />
              </p>
            }
            right={<Location p={p} value={e.location} />}
          />
          <Row
            left={
              <p className="italic">
                <E
                  path={`${p}.role`}
                  placeholder={m.cv_ph_job_title()}
                  value={e.role}
                />
              </p>
            }
            right={<DateRange end={e.end} p={p} start={e.start} />}
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
      gap: i === 0 ? 6 : 10,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Row
            left={
              <p className="font-bold">
                <E
                  path={`${p}.school`}
                  placeholder={m.cv_ph_school()}
                  value={e.school}
                />
              </p>
            }
            right={<Location p={p} value={e.location} />}
          />
          <Row
            left={
              <p className="italic">
                <E
                  path={`${p}.degree`}
                  placeholder={m.cv_ph_degree()}
                  value={e.degree}
                />
              </p>
            }
            right={<DateRange end={e.end} p={p} start={e.start} />}
          />
          <Show path={p} value={e.description}>
            <p className="relative mt-[1px] pl-[14px]">
              <span className="absolute top-[0.62em] left-[3px] h-[4px] w-[4px] bg-[#222]" />
              <E
                multiline
                path={`${p}.description`}
                placeholder={m.cv_ph_description()}
                rich
                value={e.description}
              />
            </p>
          </Show>
        </Sel>
      ),
    };
  });

const skillBlocks = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 6 : 8,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="font-bold">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
          </Show>
          <ul>
            {s.items.map((it, j) => {
              const ip = `${p}.items.${j}`;
              return (
                <Sel
                  as="li"
                  className="relative pl-[14px]"
                  key={it.id}
                  label={m.cv_sel_skill()}
                  list={`${p}.items`}
                  path={ip}
                >
                  <span className="absolute top-[0.62em] left-[3px] h-[4px] w-[4px] bg-[#222]" />
                  <Show path={ip} value={it.title}>
                    <span className="font-semibold">
                      <E
                        path={`${ip}.title`}
                        placeholder={m.cv_ph_title()}
                        value={it.title}
                      />
                      {": "}
                    </span>
                  </Show>
                  <E
                    multiline
                    path={`${ip}.text`}
                    placeholder={m.cv_ph_skills()}
                    rich
                    value={it.text}
                  />
                </Sel>
              );
            })}
          </ul>
        </Sel>
      ),
    };
  });

const projectBlocks = (cv: CV): Block[] =>
  cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 6 : 10,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Row
            left={
              <p className="font-bold">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_project_name()}
                  value={pr.name}
                />
              </p>
            }
          />
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
        </Sel>
      ),
    };
  });

const languageBlocks = (cv: CV): Block[] => [
  {
    key: "languages",
    gap: 6,
    node: <InlineLanguages cv={cv} levelClassName="italic" />,
  },
];

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 6 : 8,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Row
            left={
              <p>
                <span className="font-bold">
                  <E
                    path={`${p}.title`}
                    placeholder={m.cv_ph_title()}
                    value={it.title}
                  />
                </span>
                <Show path={p} value={it.subtitle}>
                  <span className="italic">
                    {", "}
                    <E
                      path={`${p}.subtitle`}
                      placeholder={m.cv_ph_subtitle()}
                      value={it.subtitle}
                    />
                  </span>
                </Show>
                <Show path={p} value={it.location}>
                  <span>
                    {", "}
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
                <span>
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
  <h2
    className={`${DOUBLE_RULE} pb-[2px] text-[12.4px] font-bold tracking-[0.1em] text-[var(--cv-accent)] uppercase`}
  >
    {children}
  </h2>
);

/**
 * Banking and consulting résumé: conservative serif, dense lines,
 * organisation and place on one line, title and dates on the next,
 * dates in a fixed right column and thin double rules.
 */
export const finance: TemplateDef = {
  id: "finance",
  category: "professional",
  name: "Finance",
  description: "Dense and conservative, double rules, dates on the right.",
  defaults: {
    font: "source-serif-4",
    accent: "#0b2545",
    padX: 50,
    padTop: 42,
    padBottom: 34,
  },
  sheetClassName: "text-[11.9px] leading-[1.36] text-[#111]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <div className="flex items-end justify-between gap-8 pb-[6px]">
              <div className="min-w-0">
                <h1 className="text-[25px] leading-[1.1] font-bold tracking-[0.05em] text-[var(--cv-accent)] uppercase">
                  <E
                    path="basics.name"
                    placeholder={m.cv_ph_your_name()}
                    value={b.name}
                  />
                </h1>
                <Show path="basics" value={b.headline}>
                  <p className="mt-[3px] text-[13px] italic">
                    <E
                      path="basics.headline"
                      placeholder={m.cv_ph_headline()}
                      value={b.headline}
                    />
                  </p>
                </Show>
              </div>
              <Contacts
                className="shrink-0 text-right text-[11.2px] leading-[1.45]"
                cv={cv}
                itemClassName="block"
              />
            </div>
            <div className="h-[5px] border-y border-[var(--cv-accent)]" />
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
            <Heading>
              <E
                path="labels.profile"
                placeholder={m.cv_ph_summary_label()}
                value={cv.labels.profile}
              />
            </Heading>
            <p className="mt-[5px]">
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
          gap: 15,
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
