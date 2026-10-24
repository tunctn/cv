import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CustomSection, CV, OrderKey, SectionKey } from "../schema";
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
import { Rich } from "./shared";

/** Bold section label in a narrow left gutter, entries on the right. */
const GRID = "grid gap-x-[18px]";
const LABEL =
  "font-extrabold text-[11.4px] text-[#0b0d12] uppercase leading-[1.5] tracking-[0.04em] [overflow-wrap:anywhere]";
const WORDS = /\s+/;
const DATES =
  "shrink-0 whitespace-nowrap text-right text-[10.8px] text-[#6b7280] tabular-nums";
const MARKUP = /\*\*|__|\*/g;

function Head({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="min-w-0">{left}</p>
      {right}
    </div>
  );
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[2px] space-y-px text-[#30343b]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[12px]"
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="absolute top-[0.66em] left-0 h-[2px] w-[6px] bg-[var(--cv-accent)]" />
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
      <p className="mt-px text-[#30343b]">
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

/** " · value" after the title, only when filled in. */
function Then({
  p,
  path,
  value,
  placeholder,
  className,
}: {
  p: string;
  path: string;
  value: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <Show path={p} value={value}>
      <span className={className}>
        {" · "}
        <E path={path} placeholder={placeholder} value={value} />
      </span>
    </Show>
  );
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: 9,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            left={
              <>
                <span className="font-bold text-[#0b0d12]">
                  <E
                    path={`${p}.role`}
                    placeholder={m.cv_ph_job_title()}
                    value={e.role}
                  />
                </span>
                <Then
                  className="font-semibold text-[var(--cv-accent)]"
                  p={p}
                  path={`${p}.company`}
                  placeholder={m.cv_ph_company()}
                  value={e.company}
                />
                <Then
                  className="text-[#6b7280]"
                  p={p}
                  path={`${p}.location`}
                  placeholder={m.cv_ph_location()}
                  value={e.location}
                />
              </>
            }
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
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
      gap: 7,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            left={
              <>
                <span className="font-bold text-[#0b0d12]">
                  <E
                    path={`${p}.degree`}
                    placeholder={m.cv_ph_degree()}
                    value={e.degree}
                  />
                </span>
                <Then
                  className="font-semibold text-[var(--cv-accent)]"
                  p={p}
                  path={`${p}.school`}
                  placeholder={m.cv_ph_school()}
                  value={e.school}
                />
                <Then
                  className="text-[#6b7280]"
                  p={p}
                  path={`${p}.location`}
                  placeholder={m.cv_ph_location()}
                  value={e.location}
                />
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
}

function skillBlocks(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: 6,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="font-bold text-[#0b0d12]">
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
                ? "grid grid-cols-2 gap-x-6 gap-y-px"
                : "space-y-px"
            }
          >
            {s.items.map((it, j) => (
              <SkillLine
                className="text-[#30343b]"
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="font-semibold text-[#0b0d12]"
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
      gap: 8,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Head
            left={
              <span className="font-bold text-[#0b0d12]">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_project_name()}
                  value={pr.name}
                />
              </span>
            }
            right={
              <Show path={p} value={pr.url}>
                <span className={`${DATES} text-[var(--cv-accent)]`}>
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
}

function languageBlocks(cv: CV): Block[] {
  return [
    {
      key: "languages",
      gap: 6,
      node: (
        <InlineLanguages
          className="text-[#30343b]"
          cv={cv}
          levelClassName="text-[#6b7280]"
          separator={<span className="mx-[6px] text-[#c4c8cf]">/</span>}
        />
      ),
    },
  ];
}

function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: 7,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
            left={
              <>
                <span className="font-bold text-[#0b0d12]">
                  <E
                    path={`${p}.title`}
                    placeholder={m.cv_ph_title()}
                    value={it.title}
                  />
                </span>
                <Then
                  className="font-semibold text-[var(--cv-accent)]"
                  p={p}
                  path={`${p}.subtitle`}
                  placeholder={m.cv_ph_subtitle()}
                  value={it.subtitle}
                />
                <Then
                  className="text-[#6b7280]"
                  p={p}
                  path={`${p}.location`}
                  placeholder={m.cv_ph_location()}
                  value={it.location}
                />
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
}

const SECTION_BLOCKS: Record<SectionKey, (cv: CV) => Block[]> = {
  experience: experienceBlocks,
  education: educationBlocks,
  skills: skillBlocks,
  projects: projectBlocks,
  languages: languageBlocks,
};

function SectionTitle({ cv, k }: { cv: CV; k: OrderKey }) {
  return (
    <Sel label={m.cv_sel_section()} list="sections" path={`sections.${k}`}>
      <h2 className={LABEL}>
        <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, k)} />
      </h2>
    </Sel>
  );
}

/**
 * Puts a section's blocks in the right column; the first one carries the
 * section label in the gutter and a rule above, so a label never ends up
 * alone at the bottom of a page.
 */
function gutter(
  label: ReactNode,
  blocks: Block[],
  key: string,
  width: number
): Block[] {
  const cols = { gridTemplateColumns: `${width}px minmax(0, 1fr)` };
  const first = `${GRID} border-[#0b0d12] border-t-2 pt-[7px]`;
  if (blocks.length === 0) {
    return [
      {
        key: `title-${key}`,
        gap: 14,
        node: (
          <div className={first} style={cols}>
            {label}
            <div />
          </div>
        ),
      },
    ];
  }
  return blocks.map((b, i) => ({
    ...b,
    gap: i === 0 ? 14 : b.gap,
    node: (
      <div className={i === 0 ? first : GRID} style={cols}>
        {i === 0 ? label : <div />}
        <div className="min-w-0">{b.node}</div>
      </div>
    ),
  }));
}

/** Gutter width that fits the longest word of the section labels (they are set in caps). */
function gutterWidth(cv: CV, keys: OrderKey[]) {
  const labels = [
    cv.labels.profile,
    ...keys.map((k) => sectionLabel(cv, k).value),
  ];
  const longest = Math.max(
    0,
    ...labels.flatMap((l) => l.split(WORDS).map((w) => w.length))
  );
  return Math.round(Math.min(144, Math.max(88, longest * 8.4 + 6)));
}

/** Plain text of a field for the highlights row (markup removed). */
function plain(text: string) {
  return text.replace(MARKUP, "");
}

interface Highlight {
  key: string;
  label: string;
  sub: string;
  value: string;
}

/** Up to three facts at a glance: current role, latest degree, top skills. */
function highlightsOf(cv: CV): Highlight[] {
  const out: Highlight[] = [];
  const [job] = cv.experience;
  if (job && (job.role || job.company)) {
    out.push({
      key: "experience",
      label: cv.labels.experience,
      value: plain(job.role || job.company),
      sub: job.role ? plain(job.company) : "",
    });
  }
  const [edu] = cv.education;
  if (edu && (edu.degree || edu.school)) {
    out.push({
      key: "education",
      label: cv.labels.education,
      value: plain(edu.degree || edu.school),
      sub: edu.degree ? plain(edu.school) : "",
    });
  }
  const [group] = cv.skills;
  const titles = group?.items.map((it) => plain(it.title)).filter(Boolean);
  if (group && titles && titles.length > 0) {
    out.push({
      key: "skills",
      label: cv.labels.skills,
      value: titles.slice(0, 3).join(" · "),
      sub: plain(group.name),
    });
  }
  return out;
}

function Highlights({ items }: { items: Highlight[] }) {
  return (
    <div className="grid grid-cols-3 gap-[8px]">
      {items.map((h) => (
        <div
          className="rounded-[6px] bg-[color-mix(in_srgb,var(--cv-accent)_7%,white)] px-[11px] py-[8px]"
          key={h.key}
        >
          <p className="font-extrabold text-[9.6px] text-[var(--cv-accent)] uppercase tracking-[0.12em]">
            {h.label}
          </p>
          <p className="mt-[2px] font-bold text-[#0b0d12] text-[12px] leading-[1.3]">
            <Rich text={h.value} />
          </p>
          {h.sub ? (
            <p className="mt-px text-[#6b7280] text-[10.6px] leading-[1.35]">
              {h.sub}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * One dense page for engineers and startup roles: a highlights row under the
 * name (current role, latest degree, top skills), bold section labels in a
 * left gutter and tight entries.
 */
export const startup: TemplateDef = {
  id: "startup",
  category: "technical",
  name: "Startup",
  description: "Dense one-pager with a highlights row and bold labels.",
  defaults: {
    font: "inter",
    accent: "#e2552d",
    padX: 40,
    padTop: 36,
    padBottom: 28,
  },
  sheetClassName: "text-[11.3px] leading-[1.42] text-[#16181d]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <div className="flex items-end justify-between gap-6">
              <div className="min-w-0">
                <h1 className="font-extrabold text-[#0b0d12] text-[29px] leading-[1.05] tracking-[-0.035em]">
                  <E
                    path="basics.name"
                    placeholder={m.cv_ph_your_name()}
                    value={b.name}
                  />
                </h1>
                <Show path="basics" value={b.headline}>
                  <p className="mt-[4px] font-medium text-[#4b5058] text-[13px]">
                    <E
                      path="basics.headline"
                      placeholder={m.cv_ph_headline()}
                      value={b.headline}
                    />
                  </p>
                </Show>
              </div>
              <Contacts
                className="max-w-[48%] shrink-0 text-right text-[#4b5058] text-[10.8px] leading-[1.5]"
                cv={cv}
                itemClassName="block break-words"
              />
            </div>
          </Sel>
        ),
      },
    ];
    const highlights = highlightsOf(cv);
    if (highlights.length > 0) {
      blocks.push({
        key: "highlights",
        gap: 14,
        node: <Highlights items={highlights} />,
      });
    }
    const keys = orderedSections(cv);
    const width = gutterWidth(cv, keys);
    if (b.summary) {
      blocks.push(
        ...gutter(
          <Sel label={m.cv_sel_profile()} path="labels.profile">
            <h2 className={LABEL}>
              <E
                path="labels.profile"
                placeholder={m.cv_ph_profile()}
                value={cv.labels.profile}
              />
            </h2>
          </Sel>,
          [
            {
              key: "summary",
              node: (
                <Sel label={m.cv_sel_profile()} path="basics.summary">
                  <p className="text-[#30343b]">
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
            },
          ],
          "profile",
          width
        )
      );
    }
    for (const key of keys) {
      blocks.push(
        ...gutter(
          <SectionTitle cv={cv} k={key} />,
          sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks),
          key,
          width
        )
      );
    }
    return { main: blocks };
  },
};
