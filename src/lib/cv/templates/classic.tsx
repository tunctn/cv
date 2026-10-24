import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CustomSection, CV, SectionKey } from "../schema";
import {
  Contacts,
  orderedSections,
  Pair,
  Photo,
  Show,
  sectionBlocks,
  sectionLabel,
} from "./kit";

const DOT =
  "absolute top-[7px] left-[2px] h-[5px] w-[5px] rounded-full bg-[#d4d4d4]";
const subtitleClass = "text-[#9a9a9a] text-[10.8px] leading-[1.35]";
const dateClass = "font-semibold text-[12px] text-black leading-[1.35]";
const metaClass = "text-[#9a9a9a] text-[10.6px] leading-[1.2]";

function Header({ cv }: { cv: CV }) {
  const b = cv.basics;
  return (
    <Sel
      className="flex items-start justify-between gap-6"
      label={m.cv_sel_details()}
      path="basics"
    >
      <div className="min-w-0 pt-[1px]">
        <Show path="basics" value={b.headline}>
          <p className="text-[#1c1c1c] text-[14.6px] leading-[1.3]">
            <E
              path="basics.headline"
              placeholder={m.cv_ph_headline()}
              value={b.headline}
            />
          </p>
        </Show>
        <h1 className="mt-[3px] font-bold text-[34px] text-[var(--cv-accent)] leading-[1.15] tracking-[-0.025em]">
          <E
            path="basics.name"
            placeholder={m.cv_ph_your_name()}
            value={b.name}
          />
        </h1>
        <Contacts
          className="mt-[38px] flex flex-wrap items-center text-[#8c8c8c] text-[11.6px]"
          cv={cv}
          separator={<span className="mx-[9px] text-[#d0d0d0]">•</span>}
        />
      </div>
      <Photo
        className="h-[119px] w-[117px] shrink-0 rounded-[2px]"
        cv={cv}
        height={119}
        width={117}
      />
    </Sel>
  );
}

function Rail({ last }: { last?: boolean }) {
  return (
    <>
      <span className={DOT} />
      {last ? null : (
        <span className="absolute top-[18px] bottom-0 left-[4px] border-[#dcdcdc] border-l border-dashed" />
      )}
    </>
  );
}

function EntryHead({
  title,
  subtitle,
  date,
  meta,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  date?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h3 className="font-semibold text-[13.8px] text-black leading-[1.3] tracking-[-0.005em]">
          {title}
        </h3>
        {subtitle}
      </div>
      <div className="shrink-0 text-right">
        {date}
        {meta}
      </div>
    </div>
  );
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[6px] space-y-[7px] pl-[1px] leading-[1.47]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="flex items-center gap-[10px] pr-[60px]"
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-[#cfcfcf]" />
          <span className="min-w-0">
            <E
              path={`${list}.${j}`}
              placeholder={m.cv_ph_bullet()}
              rich
              value={h}
            />
          </span>
        </Sel>
      ))}
    </ul>
  );
}

function Dates({ p, start, end }: { p: string; start: string; end: string }) {
  return (
    <Pair
      a={{ path: `${p}.start`, value: start, placeholder: m.cv_ph_start() }}
      b={{ path: `${p}.end`, value: end, placeholder: m.cv_ph_end() }}
      className={dateClass}
      item={p}
      separator=" - "
    />
  );
}

function Meta({ p, value }: { p: string; value: string }) {
  return (
    <Show path={p} value={value}>
      <p className={metaClass}>
        <E path={`${p}.meta`} placeholder={m.cv_ph_meta()} value={value} />
      </p>
    </Show>
  );
}

function Description({
  p,
  value,
  className,
}: {
  p: string;
  value: string;
  className: string;
}) {
  return (
    <Show path={p} value={value}>
      <div className={className}>
        <E
          multiline
          path={`${p}.description`}
          placeholder={m.cv_ph_description()}
          rich
          value={value}
        />
      </div>
    </Show>
  );
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    const last = i === cv.experience.length - 1;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 20,
      node: (
        <Sel
          className={`relative pl-[19px] ${last ? "" : "pb-[8px]"}`}
          label={m.cv_sel_job()}
          list="experience"
          path={p}
        >
          <Rail />
          <EntryHead
            date={<Dates end={e.end} p={p} start={e.start} />}
            meta={<Meta p={p} value={e.meta} />}
            subtitle={
              <Pair
                a={{
                  path: `${p}.company`,
                  value: e.company,
                  placeholder: m.cv_ph_company(),
                }}
                b={{
                  path: `${p}.location`,
                  value: e.location,
                  placeholder: m.cv_ph_location(),
                }}
                className={subtitleClass}
                item={p}
                separator=" - "
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
          <Description className="mt-[5px]" p={p} value={e.description} />
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
      gap: 10,
      node: (
        <Sel
          className="relative pl-[19px]"
          label={m.cv_sel_education()}
          list="education"
          path={p}
        >
          <Rail />
          <EntryHead
            date={<Dates end={e.end} p={p} start={e.start} />}
            meta={<Meta p={p} value={e.meta} />}
            subtitle={
              <Pair
                a={{
                  path: `${p}.school`,
                  value: e.school,
                  placeholder: m.cv_ph_school(),
                }}
                b={{
                  path: `${p}.location`,
                  value: e.location,
                  placeholder: m.cv_ph_location(),
                }}
                className={subtitleClass}
                item={p}
                separator=" - "
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
          <Description className="mt-[4px]" p={p} value={e.description} />
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
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel
          className="relative pl-[19px]"
          label={m.cv_sel_skill_group()}
          list="skills"
          path={p}
        >
          <span className="absolute top-[6px] left-[2px] h-[5px] w-[5px] rounded-full bg-[#d4d4d4]" />
          <h3 className="font-semibold text-[12.4px] text-black leading-[1.3]">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_group_name()}
              value={s.name}
            />
          </h3>
          <div
            className={
              s.columns === 2
                ? "mt-[3px] grid grid-cols-[auto_auto] justify-start gap-x-[38px] gap-y-[2px]"
                : "mt-[10px] space-y-[2px]"
            }
          >
            {s.items.map((it, j) => {
              const ip = `${p}.items.${j}`;
              return (
                <Sel
                  key={it.id}
                  label={m.cv_sel_skill()}
                  list={`${p}.items`}
                  path={ip}
                >
                  <Show path={ip} value={it.title}>
                    <p className="font-semibold text-[10.8px] text-black leading-[1.45]">
                      <E
                        path={`${ip}.title`}
                        placeholder={m.cv_ph_title()}
                        value={it.title}
                      />
                    </p>
                  </Show>
                  <Show path={ip} value={it.text}>
                    <p className="text-[11.2px] leading-[1.6]">
                      <E
                        multiline
                        path={`${ip}.text`}
                        placeholder={m.cv_ph_skills()}
                        rich
                        value={it.text}
                      />
                    </p>
                  </Show>
                </Sel>
              );
            })}
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
      gap: i === 0 ? 10 : 20,
      node: (
        <Sel
          className="relative pl-[19px]"
          label={m.cv_sel_project()}
          list="projects"
          path={p}
        >
          <Rail last={i === cv.projects.length - 1} />
          <EntryHead
            subtitle={
              <Show path={p} value={pr.url}>
                <p className={subtitleClass}>
                  <E
                    path={`${p}.url`}
                    placeholder={m.cv_ph_link()}
                    value={pr.url}
                  />
                </p>
              </Show>
            }
            title={
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_project_name()}
                value={pr.name}
              />
            }
          />
          <Description className="mt-[5px]" p={p} value={pr.description} />
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
      gap: 10,
      node: (
        <div className="relative pl-[19px]">
          <span className={DOT} />
          <div>
            {cv.languages.map((l, i) => (
              <Sel
                className="inline"
                key={l.id}
                label={m.cv_sel_language()}
                list="languages"
                path={`languages.${i}`}
              >
                {i > 0 ? ", " : null}
                <E
                  path={`languages.${i}.name`}
                  placeholder={m.cv_ph_language()}
                  value={l.name}
                />
                <Show path={`languages.${i}`} value={l.level}>
                  {" ("}
                  <E
                    path={`languages.${i}.level`}
                    placeholder={m.cv_ph_level()}
                    value={l.level}
                  />
                  {")"}
                </Show>
              </Sel>
            ))}
          </div>
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
      gap: i === 0 ? 10 : 20,
      node: (
        <Sel
          className="relative pl-[19px]"
          label={m.cv_sel_entry()}
          list={`${list}.items`}
          path={p}
        >
          <Rail last={i === section.items.length - 1} />
          <EntryHead
            date={
              <Show path={p} value={it.date}>
                <p className={dateClass}>
                  <E
                    path={`${p}.date`}
                    placeholder={m.cv_ph_date()}
                    value={it.date}
                  />
                </p>
              </Show>
            }
            subtitle={
              <Pair
                a={{
                  path: `${p}.subtitle`,
                  value: it.subtitle,
                  placeholder: m.cv_ph_subtitle(),
                }}
                b={{
                  path: `${p}.location`,
                  value: it.location,
                  placeholder: m.cv_ph_location(),
                }}
                className={subtitleClass}
                item={p}
                separator=" - "
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
          <Description className="mt-[5px]" p={p} value={it.description} />
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

/**
 * The default template, matched 1:1 to the reference CV: headline over a large
 * name, photo top right, dotted timeline for entries.
 */
export const classic: TemplateDef = {
  id: "classic",
  category: "professional",
  name: "Classic",
  description: "Photo, timeline dots, clear hierarchy.",
  defaults: {
    font: "inter",
    accent: "#000000",
    padX: 35,
    padTop: 30,
    padBottom: 30,
  },
  sheetClassName: "text-[11.2px] leading-[1.62]",
  build(cv) {
    const blocks: Block[] = [{ key: "header", node: <Header cv={cv} /> }];
    if (cv.basics.summary) {
      blocks.push({
        key: "summary",
        gap: 10,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <h2 className="font-semibold text-[12.4px] text-black">
              <E
                path="labels.profile"
                placeholder={m.cv_ph_profile()}
                value={cv.labels.profile}
              />
            </h2>
            <E
              multiline
              path="basics.summary"
              placeholder={m.cv_ph_summary()}
              rich
              value={cv.basics.summary}
            />
          </Sel>
        ),
      });
    }
    orderedSections(cv).forEach((key, n) => {
      blocks.push({
        key: `title-${key}`,
        gap: n === 0 ? 44 : 27,
        keepWithNext: true,
        node: (
          <Sel
            label={m.cv_sel_section()}
            list="sections"
            path={`sections.${key}`}
          >
            <h2 className="font-semibold text-[17.4px] text-[var(--cv-accent)] leading-[1.3] tracking-[-0.01em]">
              <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
            </h2>
          </Sel>
        ),
      });
      blocks.push(...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks));
    });
    return { main: blocks };
  },
};
