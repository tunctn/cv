import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CustomSection, CV, SectionKey } from "../schema";
import {
  Contacts,
  InlineLanguages,
  orderedSections,
  Show,
  SkillLine,
  sectionBlocks,
  sectionLabel,
  useExpanded,
} from "./kit";

interface Part {
  field: string;
  placeholder: string;
  value: string;
}

/**
 * "Company, City | Jan 2020 – Present" as one plain text line, so parsers
 * read it in order. Empty parts are left out (shown while editing).
 */
function Meta({
  p,
  parts,
  range,
}: {
  p: string;
  parts: Part[];
  range?: { start: string; end: string };
}) {
  const expanded = useExpanded(p);
  const shown = parts.filter((x) => x.value || expanded);
  const dates = range
    ? [
        { field: "start", placeholder: m.cv_ph_start(), value: range.start },
        { field: "end", placeholder: m.cv_ph_end(), value: range.end },
      ].filter((x) => x.value || expanded)
    : [];
  if (shown.length === 0 && dates.length === 0) {
    return null;
  }
  return (
    <p className="text-[#333]">
      {shown.map((x, n) => (
        <span key={x.field}>
          {n > 0 ? ", " : null}
          <E
            path={`${p}.${x.field}`}
            placeholder={x.placeholder}
            value={x.value}
          />
        </span>
      ))}
      {dates.map((x, n) => (
        <span key={x.field}>
          {n === 0 && shown.length > 0 ? " | " : null}
          {n > 0 ? " – " : null}
          <E
            path={`${p}.${x.field}`}
            placeholder={x.placeholder}
            value={x.value}
          />
        </span>
      ))}
    </p>
  );
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[2px] list-disc pl-[18px]">
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
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 6 : 12,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <p className="font-bold">
            <E
              path={`${p}.role`}
              placeholder={m.cv_ph_job_title()}
              value={e.role}
            />
          </p>
          <Meta
            p={p}
            parts={[
              {
                field: "company",
                placeholder: m.cv_ph_company(),
                value: e.company,
              },
              {
                field: "location",
                placeholder: m.cv_ph_location(),
                value: e.location,
              },
            ]}
            range={e}
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
      gap: i === 0 ? 6 : 10,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <p className="font-bold">
            <E
              path={`${p}.degree`}
              placeholder={m.cv_ph_degree()}
              value={e.degree}
            />
          </p>
          <Meta
            p={p}
            parts={[
              {
                field: "school",
                placeholder: m.cv_ph_school(),
                value: e.school,
              },
              {
                field: "location",
                placeholder: m.cv_ph_location(),
                value: e.location,
              },
            ]}
            range={e}
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
}

function projectBlocks(cv: CV): Block[] {
  return cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 6 : 12,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <p className="font-bold">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_project_name()}
              value={pr.name}
            />
          </p>
          <Meta
            p={p}
            parts={[
              { field: "url", placeholder: m.cv_ph_link(), value: pr.url },
            ]}
          />
          <Description p={p} value={pr.description} />
          <Bullets items={pr.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });
}

function languageBlocks(cv: CV): Block[] {
  return [{ key: "languages", gap: 6, node: <InlineLanguages cv={cv} /> }];
}

function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 6 : 10,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <p className="font-bold">
            <E
              path={`${p}.title`}
              placeholder={m.cv_ph_title()}
              value={it.title}
            />
          </p>
          <Meta
            p={p}
            parts={[
              {
                field: "subtitle",
                placeholder: m.cv_ph_subtitle(),
                value: it.subtitle,
              },
              {
                field: "location",
                placeholder: m.cv_ph_location(),
                value: it.location,
              },
              { field: "date", placeholder: m.cv_ph_date(), value: it.date },
            ]}
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

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-[#222] border-b pb-[2px] font-bold text-[13px] text-[var(--cv-accent)] uppercase tracking-[0.04em]">
      {children}
    </h2>
  );
}

/**
 * Built for applicant tracking systems: one column, standard headings, every
 * fact on a plain left-aligned line, no photo, icons or side columns.
 */
export const ats: TemplateDef = {
  id: "ats",
  category: "simple",
  name: "ATS",
  description: "Plain single column that application portals read cleanly.",
  defaults: {
    font: "ibm-plex-sans",
    accent: "#000000",
    padX: 56,
    padTop: 48,
    padBottom: 40,
  },
  sheetClassName: "text-[12.4px] leading-[1.45] text-black",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="font-bold text-[24px] text-[var(--cv-accent)] leading-tight">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="text-[14px]">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <Contacts
              className="mt-1 flex flex-wrap text-[12px]"
              cv={cv}
              separator={<span className="mx-[6px]">|</span>}
            />
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 16,
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
      blocks.push({
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
      });
      blocks.push(...sectionBlocks(cv, key, SECTION_BLOCKS, customBlocks));
    }
    return { main: blocks };
  },
};
