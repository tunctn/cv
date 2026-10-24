import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import type { Block, TemplateDef } from "../engine";
import type { CustomSection, CV, SectionKey } from "../schema";
import {
  Contacts,
  DateRange,
  orderedSections,
  Photo,
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
} from "./kit";

/** Small caps in the accent colour: section titles and quiet labels. */
const CAPS =
  "font-semibold text-[15px] text-[var(--cv-accent)] tracking-[0.12em] [font-variant-caps:all-small-caps]";
const MUTED = "text-[#7b8590]";
const DATES = `shrink-0 text-right text-[11.4px] tabular-nums ${MUTED}`;

const Head = ({ left, right }: { left: ReactNode; right?: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-6">
    <div className="min-w-0">{left}</div>
    {right}
  </div>
);

const Sub = ({ children }: { children: ReactNode }) => (
  <p className={`mt-[1px] ${MUTED}`}>{children}</p>
);

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[6px] space-y-[3px] text-[#3b4249]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[16px]"
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="absolute top-[0.78em] left-0 h-px w-[8px] bg-[#b4bcc4]" />
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
    <p className="mt-[5px] text-[#3b4249]">
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

const Place = ({ p, value }: { p: string; value: string }) => (
  <Show path={p} value={value}>
    <span>
      {"  ·  "}
      <E
        path={`${p}.location`}
        placeholder={m.cv_ph_location()}
        value={value}
      />
    </span>
  </Show>
);

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 14 : 24,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            left={
              <p className="text-[13px] font-medium text-[#16191c]">
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
          <Sub>
            <E
              path={`${p}.company`}
              placeholder={m.cv_ph_company()}
              value={e.company}
            />
            <Place p={p} value={e.location} />
          </Sub>
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
      gap: i === 0 ? 14 : 20,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            left={
              <p className="text-[13px] font-medium text-[#16191c]">
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
          <Sub>
            <E
              path={`${p}.school`}
              placeholder={m.cv_ph_school()}
              value={e.school}
            />
            <Place p={p} value={e.location} />
          </Sub>
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
      gap: i === 0 ? 14 : 18,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="mb-[5px] font-medium text-[#16191c]">
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
                ? "grid grid-cols-2 gap-x-10 gap-y-[5px]"
                : "space-y-[5px]"
            }
          >
            {s.items.map((it, j) => (
              <SkillLine
                className="text-[#3b4249]"
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="text-[#16191c]"
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
      gap: i === 0 ? 14 : 22,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Head
            left={
              <p className="text-[13px] font-medium text-[#16191c]">
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

const languageBlocks = (cv: CV): Block[] => [
  {
    key: "languages",
    gap: 14,
    node: (
      <ul className="grid grid-cols-3 gap-x-8 gap-y-[6px]">
        {cv.languages.map((l, i) => (
          <Sel
            as="li"
            key={l.id}
            label={m.cv_sel_language()}
            list="languages"
            path={`languages.${i}`}
          >
            <p className="font-medium text-[#16191c]">
              <E
                path={`languages.${i}.name`}
                placeholder={m.cv_ph_language()}
                value={l.name}
              />
            </p>
            <Show path={`languages.${i}`} value={l.level}>
              <p className={MUTED}>
                <E
                  path={`languages.${i}.level`}
                  placeholder={m.cv_ph_level()}
                  value={l.level}
                />
              </p>
            </Show>
          </Sel>
        ))}
      </ul>
    ),
  },
];

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 14 : 20,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
            left={
              <p className="text-[13px] font-medium text-[#16191c]">
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
            <Sub>
              <E
                path={`${p}.subtitle`}
                placeholder={m.cv_ph_subtitle()}
                value={it.subtitle}
              />
              <Place p={p} value={it.location} />
            </Sub>
          </Show>
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

/**
 * Airy and quiet: a pale bar down the left edge, a light-weight name,
 * small-caps section labels and plenty of white space.
 */
export const nordic: TemplateDef = {
  id: "nordic",
  category: "simple",
  name: "Nordic",
  description: "Airy, pale edge bar, small-caps labels.",
  defaults: {
    font: "inter",
    accent: "#5f7385",
    padX: 56,
    padTop: 60,
    padBottom: 52,
  },
  side: {
    width: 12,
    position: "left",
    className: "bg-[color-mix(in_srgb,var(--cv-accent)_16%,#eef0f2)]",
  },
  sheetClassName: "text-[12.2px] leading-[1.6] text-[#2b3036]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <div className="flex items-start justify-between gap-8">
              <div className="min-w-0">
                <h1 className="text-[34px] leading-[1.12] font-light tracking-[-0.02em] text-[#16191c]">
                  <E
                    path="basics.name"
                    placeholder={m.cv_ph_your_name()}
                    value={b.name}
                  />
                </h1>
                <Show path="basics" value={b.headline}>
                  <p className={`mt-[6px] ${CAPS}`}>
                    <E
                      path="basics.headline"
                      placeholder={m.cv_ph_headline()}
                      value={b.headline}
                    />
                  </p>
                </Show>
                <Contacts
                  className="mt-[14px] flex flex-wrap gap-x-6 gap-y-[2px] text-[11.6px] text-[#59626b]"
                  cv={cv}
                  itemClassName="min-w-0 break-words"
                />
              </div>
              <Photo
                className="h-[84px] w-[84px] rounded-full"
                cv={cv}
                height={84}
                width={84}
              />
            </div>
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 34,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <h2 className={CAPS}>
              <E
                path="labels.profile"
                placeholder={m.cv_ph_profile()}
                value={cv.labels.profile}
              />
            </h2>
            <p className="mt-[10px] text-[#3b4249]">
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
          gap: 36,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <h2 className={CAPS}>
                <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
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
