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

const Line = ({ left, right }: { left: ReactNode; right?: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-6">
    <div className="min-w-0">{left}</div>
    {right ? <div className="shrink-0 text-right">{right}</div> : null}
  </div>
);

const Field = ({
  p,
  field,
  value,
  placeholder,
  className,
}: {
  p: string;
  field: string;
  value: string;
  placeholder: string;
  className?: string;
}) => (
  <Show path={p} value={value}>
    <span className={className}>
      <E path={`${p}.${field}`} placeholder={placeholder} value={value} />
    </span>
  </Show>
);

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[2px] list-disc pl-[22px] marker:text-black">
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
    <p className="mt-[2px]">
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
      gap: i === 0 ? 6 : 12,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Line
            left={
              <span className="font-bold">
                <E
                  path={`${p}.company`}
                  placeholder={m.cv_ph_company()}
                  value={e.company}
                />
              </span>
            }
            right={
              <Field
                field="location"
                p={p}
                placeholder={m.cv_ph_location()}
                value={e.location}
              />
            }
          />
          <Line
            left={
              <span className="italic">
                <E
                  path={`${p}.role`}
                  placeholder={m.cv_ph_job_title()}
                  value={e.role}
                />
              </span>
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
          <Line
            left={
              <span className="font-bold">
                <E
                  path={`${p}.school`}
                  placeholder={m.cv_ph_school()}
                  value={e.school}
                />
              </span>
            }
            right={
              <Field
                field="location"
                p={p}
                placeholder={m.cv_ph_location()}
                value={e.location}
              />
            }
          />
          <Line
            left={
              <span className="italic">
                <E
                  path={`${p}.degree`}
                  placeholder={m.cv_ph_degree()}
                  value={e.degree}
                />
              </span>
            }
            right={<DateRange end={e.end} p={p} start={e.start} />}
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
          {s.items.map((it, j) => (
            <SkillLine
              group={p}
              index={j}
              item={it}
              key={it.id}
              titleClassName="font-semibold"
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
      gap: i === 0 ? 6 : 12,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Line
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
              <Field
                className="italic"
                field="url"
                p={p}
                placeholder={m.cv_ph_link()}
                value={pr.url}
              />
            }
          />
          <Description p={p} value={pr.description} />
          <Bullets items={pr.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });

const languageBlocks = (cv: CV): Block[] => [
  { key: "languages", gap: 6, node: <InlineLanguages cv={cv} /> },
];

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 6 : 10,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Line
            left={
              <span className="font-bold">
                <E
                  path={`${p}.title`}
                  placeholder={m.cv_ph_title()}
                  value={it.title}
                />
              </span>
            }
            right={
              <Field
                field="location"
                p={p}
                placeholder={m.cv_ph_location()}
                value={it.location}
              />
            }
          />
          <Line
            left={
              <Field
                className="italic"
                field="subtitle"
                p={p}
                placeholder={m.cv_ph_subtitle()}
                value={it.subtitle}
              />
            }
            right={
              <Field
                field="date"
                p={p}
                placeholder={m.cv_ph_date()}
                value={it.date}
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

const Heading = ({ children }: { children: ReactNode }) => (
  <h2 className="border-b border-black pb-[1px] text-[13px] font-bold tracking-[0.06em] text-[var(--cv-accent)] uppercase">
    {children}
  </h2>
);

/**
 * The one-column résumé taught by university career offices: centred name,
 * ruled caps headings, organisation and place on one line, title and dates
 * on the next.
 */
export const collegiate: TemplateDef = {
  id: "collegiate",
  category: "student",
  name: "Collegiate",
  description: "The career-office classic. One column, serif.",
  defaults: {
    font: "source-serif-4",
    accent: "#000000",
    padX: 60,
    padTop: 52,
    padBottom: 44,
  },
  sheetClassName: "text-[12.6px] leading-[1.42] text-black",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel className="text-center" label={m.cv_sel_details()} path="basics">
            <h1 className="text-[23px] leading-tight font-bold text-[var(--cv-accent)]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="italic">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <Contacts
              className="mt-[2px] flex flex-wrap justify-center text-[12px]"
              cv={cv}
              separator={<span className="mx-[7px]">•</span>}
            />
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
                placeholder={m.cv_ph_profile()}
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
        },
        ...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks)
      );
    }
    return { main: blocks };
  },
};
