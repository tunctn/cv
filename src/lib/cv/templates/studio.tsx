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

/** A light wash of the accent colour, for pills and cards. */
const TINT = "bg-[color-mix(in_srgb,var(--cv-accent)_9%,white)]";
const PILL = `${TINT} shrink-0 rounded-full px-2.5 py-[2px] font-semibold text-[10.6px] text-[var(--cv-accent)] leading-[1.5] tabular-nums`;
const DOT =
  "absolute top-[0.62em] left-[2px] h-[4px] w-[4px] rounded-full bg-[var(--cv-accent)]";

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-1.5 space-y-[3px] text-[#333]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-4"
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className={DOT} />
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
    <p className="mt-1.5 text-[#333]">
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
  title,
  sub,
  pill,
}: {
  title: ReactNode;
  sub: ReactNode;
  pill: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-6">
    <div className="min-w-0">
      <h3 className="text-[13.6px] leading-[1.35] font-bold tracking-[-0.01em] text-[#111]">
        {title}
      </h3>
      {sub}
    </div>
    {pill}
  </div>
);

const Sub = ({
  p,
  main,
  location,
}: {
  p: string;
  main: { path: string; value: string; placeholder: string };
  location: string;
}) => (
  <p className="text-[12px] text-[#555]">
    <Show path={p} value={main.value}>
      <span className="font-medium">
        <E path={main.path} placeholder={main.placeholder} value={main.value} />
      </span>
    </Show>
    <Show path={p} value={location}>
      <span className="text-[#999]">
        {main.value ? "  ·  " : null}
        <E
          path={`${p}.location`}
          placeholder={m.cv_ph_location()}
          value={location}
        />
      </span>
    </Show>
  </p>
);

const Pill = ({ p, start, end }: { p: string; start: string; end: string }) => (
  <DateRange className={PILL} end={end} p={p} start={start} />
);

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            pill={<Pill end={e.end} p={p} start={e.start} />}
            sub={
              <Sub
                location={e.location}
                main={{
                  path: `${p}.company`,
                  value: e.company,
                  placeholder: m.cv_ph_company(),
                }}
                p={p}
              />
            }
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

const educationBlocks = (cv: CV): Block[] =>
  cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            pill={<Pill end={e.end} p={p} start={e.start} />}
            sub={
              <Sub
                location={e.location}
                main={{
                  path: `${p}.school`,
                  value: e.school,
                  placeholder: m.cv_ph_school(),
                }}
                p={p}
              />
            }
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

const skillBlocks = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 8,
      node: (
        <Sel
          className={`${TINT} rounded-[10px] px-[18px] py-[11px]`}
          label={m.cv_sel_skill_group()}
          list="skills"
          path={p}
        >
          <h3 className="text-[12.6px] font-bold text-[var(--cv-accent)]">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_group_name()}
              value={s.name}
            />
          </h3>
          <div
            className={
              s.columns === 2
                ? "mt-1 grid grid-cols-2 gap-x-8 gap-y-[3px]"
                : "mt-1 space-y-[3px]"
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

const projectBlocks = (cv: CV): Block[] =>
  cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <h3 className="text-[13.6px] leading-[1.35] font-bold tracking-[-0.01em] text-[#111]">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_project_name()}
              value={pr.name}
            />
          </h3>
          <Show path={p} value={pr.url}>
            <p className="text-[11.5px] font-medium text-[var(--cv-accent)]">
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
    gap: 10,
    node: (
      <div className="flex flex-wrap gap-2">
        {cv.languages.map((l, i) => {
          const p = `languages.${i}`;
          return (
            <Sel
              className={`${TINT} rounded-full px-3.5 py-[3px]`}
              key={l.id}
              label={m.cv_sel_language()}
              list="languages"
              path={p}
            >
              <span className="font-semibold text-[#111]">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_language()}
                  value={l.name}
                />
              </span>
              <Show path={p} value={l.level}>
                <span className="text-[#666]">
                  {"  "}
                  <E
                    path={`${p}.level`}
                    placeholder={m.cv_ph_level()}
                    value={l.level}
                  />
                </span>
              </Show>
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
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
            pill={
              <Show path={p} value={it.date}>
                <p className={PILL}>
                  <E
                    path={`${p}.date`}
                    placeholder={m.cv_ph_date()}
                    value={it.date}
                  />
                </p>
              </Show>
            }
            sub={
              <Sub
                location={it.location}
                main={{
                  path: `${p}.subtitle`,
                  value: it.subtitle,
                  placeholder: m.cv_ph_subtitle(),
                }}
                p={p}
              />
            }
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

const SECTION_BLOCKS: Record<SectionKey, (cv: CV) => Block[]> = {
  experience: experienceBlocks,
  education: educationBlocks,
  skills: skillBlocks,
  projects: projectBlocks,
  languages: languageBlocks,
};

const Header = ({ cv }: { cv: CV }) => {
  const b = cv.basics;
  return (
    <Sel label={m.cv_sel_details()} path="basics">
      <div className="flex items-end justify-between gap-8">
        <div className="min-w-0">
          <h1 className="text-[46px] leading-[1] font-bold tracking-[-0.04em] text-[var(--cv-accent)]">
            <E
              path="basics.name"
              placeholder={m.cv_ph_your_name()}
              value={b.name}
            />
          </h1>
          <Show path="basics" value={b.headline}>
            <p className="mt-3 text-[16px] leading-[1.3] font-medium text-[#2a2a2a]">
              <E
                path="basics.headline"
                placeholder={m.cv_ph_headline()}
                value={b.headline}
              />
            </p>
          </Show>
        </div>
        <Photo
          className="h-[92px] w-[92px] shrink-0 rounded-full"
          cv={cv}
          height={92}
          width={92}
        />
      </div>
      <div className="mt-4 h-[1.5px] bg-[var(--cv-accent)]" />
      <Contacts
        className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11.6px] text-[#555]"
        cv={cv}
      />
    </Sel>
  );
};

/**
 * Bold and graphic: a big accent-coloured name over a thin accent rule,
 * date pills and tinted skill cards.
 */
export const studio: TemplateDef = {
  id: "studio",
  category: "professional",
  name: "Studio",
  description: "Big coloured name, date pills, skill cards.",
  defaults: {
    font: "dm-sans",
    accent: "#b4532a",
    padX: 52,
    padTop: 50,
    padBottom: 40,
  },
  sheetClassName: "text-[12px] leading-[1.5] text-[#262626]",
  build(cv) {
    const blocks: Block[] = [{ key: "header", node: <Header cv={cv} /> }];
    if (cv.basics.summary) {
      blocks.push({
        key: "summary",
        gap: 18,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="text-[13px] leading-[1.6] text-[#2b2b2b]">
              <E
                multiline
                path="basics.summary"
                placeholder={m.cv_ph_summary()}
                rich
                value={cv.basics.summary}
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
          gap: 26,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <h2 className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.015em] text-[#111]">
                <span className="h-[8px] w-[8px] shrink-0 rounded-[2px] bg-[var(--cv-accent)]" />
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
