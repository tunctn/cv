import { E, Sel, useEditor } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import type { Block, TemplateDef } from "../engine";
import { isCustomKey } from "../schema";
import type { CustomSection, CV, OrderKey, SectionKey } from "../schema";
import {
  Contacts,
  DateRange,
  orderedSections,
  Pair,
  Photo,
  Show,
  sectionBlocks,
  sectionLabel,
  useExpanded,
} from "./kit";

const WHITESPACE = /\s+/u;
const SIDE = new Set<SectionKey>(["skills", "languages", "education"]);

const Avatar = ({ cv }: { cv: CV }) => {
  const ed = useEditor();
  const expanded = useExpanded("basics");
  if (cv.basics.photo || (ed && expanded)) {
    return (
      <Photo className="h-24 w-24 rounded-2xl" cv={cv} height={96} width={96} />
    );
  }
  const initials = (cv.basics.name || "Your name")
    .split(WHITESPACE)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--cv-accent)] text-[24px] font-semibold text-white">
      {initials}
    </div>
  );
};

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[#333] marker:text-[#bbb]">
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

const Title = ({ cv, k, side }: { cv: CV; k: OrderKey; side?: boolean }) => (
  <Sel label={m.cv_sel_section()} list="sections" path={`sections.${k}`}>
    <h2
      className={
        side
          ? "text-[13.3px] font-bold text-[var(--cv-accent)]"
          : "text-[17.3px] font-bold tracking-[-0.01em] text-[var(--cv-accent)]"
      }
    >
      <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, k)} />
    </h2>
  </Sel>
);

const entryClass = "border-[#e8e8e8] border-l-2 pl-4";

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 12 : 20,
      node: (
        <Sel
          className={entryClass}
          label={m.cv_sel_job()}
          list="experience"
          path={p}
        >
          <div className="flex flex-wrap text-[11.3px] font-medium text-[#888]">
            <DateRange end={e.end} p={p} start={e.start} />
            <Show path={p} value={e.location}>
              <span>
                <span className="mx-1">·</span>
                <E
                  path={`${p}.location`}
                  placeholder={m.cv_ph_location()}
                  value={e.location}
                />
              </span>
            </Show>
          </div>
          <p className="mt-0.5 font-semibold">
            <E
              path={`${p}.role`}
              placeholder={m.cv_ph_job_title()}
              value={e.role}
            />
          </p>
          <Show path={p} value={e.company}>
            <p className="text-[#555]">
              <E
                path={`${p}.company`}
                placeholder={m.cv_ph_company()}
                value={e.company}
              />
            </p>
          </Show>
          <Description p={p} value={e.description} />
          <Bullets items={e.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });

const projectBlocks = (cv: CV): Block[] =>
  cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 12 : 20,
      node: (
        <Sel
          className={entryClass}
          label={m.cv_sel_project()}
          list="projects"
          path={p}
        >
          <p className="font-semibold">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_project_name()}
              value={pr.name}
            />
          </p>
          <Show path={p} value={pr.url}>
            <p className="text-[11.3px] text-[#888]">
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

const skillBlocks = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 8 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <p className="text-[12px] font-semibold">
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_group_name()}
              value={s.name}
            />
          </p>
          <ul className="mt-1 space-y-1 text-[11.3px] leading-[1.45] text-[#333]">
            {s.items.map((it, j) => {
              const ip = `${p}.items.${j}`;
              return (
                <Sel
                  as="li"
                  key={it.id}
                  label={m.cv_sel_skill()}
                  list={`${p}.items`}
                  path={ip}
                >
                  <Show path={ip} value={it.title}>
                    <p className="font-medium text-[#111]">
                      <E
                        path={`${ip}.title`}
                        placeholder={m.cv_ph_title()}
                        value={it.title}
                      />
                    </p>
                  </Show>
                  <Show path={ip} value={it.text}>
                    <p>
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
          </ul>
        </Sel>
      ),
    };
  });

const languageBlocks = (cv: CV): Block[] => [
  {
    key: "languages",
    gap: 8,
    node: (
      <ul className="space-y-1 text-[12px]">
        {cv.languages.map((l, i) => (
          <Sel
            as="li"
            className="flex justify-between gap-2"
            key={l.id}
            label={m.cv_sel_language()}
            list="languages"
            path={`languages.${i}`}
          >
            <span className="font-medium">
              <E
                path={`languages.${i}.name`}
                placeholder={m.cv_ph_language()}
                value={l.name}
              />
            </span>
            <Show path={`languages.${i}`} value={l.level}>
              <span className="text-right text-[#666]">
                <E
                  path={`languages.${i}.level`}
                  placeholder={m.cv_ph_level()}
                  value={l.level}
                />
              </span>
            </Show>
          </Sel>
        ))}
      </ul>
    ),
  },
];

const educationBlocks = (cv: CV): Block[] =>
  cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 8 : 12,
      node: (
        <Sel
          className="text-[12px] leading-[1.45]"
          label={m.cv_sel_education()}
          list="education"
          path={p}
        >
          <p className="font-semibold">
            <E
              path={`${p}.degree`}
              placeholder={m.cv_ph_degree()}
              value={e.degree}
            />
          </p>
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
            className="text-[#444]"
            item={p}
            separator=", "
          />
          <DateRange
            className="text-[#777]"
            end={e.end}
            p={p}
            start={e.start}
          />
          <Show path={p} value={e.description}>
            <p className="mt-0.5 text-[#555]">
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

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 12 : 20,
      node: (
        <Sel
          className={entryClass}
          label={m.cv_sel_entry()}
          list={`${list}.items`}
          path={p}
        >
          <Pair
            a={{
              path: `${p}.date`,
              value: it.date,
              placeholder: m.cv_ph_date(),
            }}
            b={{
              path: `${p}.location`,
              value: it.location,
              placeholder: m.cv_ph_location(),
            }}
            className="text-[11.3px] font-medium text-[#888]"
            item={p}
            separator=" · "
          />
          <p className="mt-0.5 font-semibold">
            <E
              path={`${p}.title`}
              placeholder={m.cv_ph_title()}
              value={it.title}
            />
          </p>
          <Show path={p} value={it.subtitle}>
            <p className="text-[#555]">
              <E
                path={`${p}.subtitle`}
                placeholder={m.cv_ph_subtitle()}
                value={it.subtitle}
              />
            </p>
          </Show>
          <Description p={p} value={it.description} />
          <Bullets items={it.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });

const MAIN_BLOCKS: Partial<Record<SectionKey, (cv: CV) => Block[]>> = {
  experience: experienceBlocks,
  projects: projectBlocks,
};

const SIDE_BLOCKS: Partial<Record<SectionKey, (cv: CV) => Block[]>> = {
  skills: skillBlocks,
  languages: languageBlocks,
  education: educationBlocks,
};

/** Grey side column for photo, contact, skills, languages and education. */
export const modern: TemplateDef = {
  id: "modern",
  category: "professional",
  name: "Modern",
  description: "Side column for skills and contact.",
  defaults: {
    font: "inter",
    accent: "#111111",
    padX: 36,
    padTop: 48,
    padBottom: 40,
  },
  side: { width: 240, position: "left", className: "bg-[#f4f4f4]" },
  sheetClassName: "text-[12.7px] leading-[1.5]",
  build(cv) {
    const b = cv.basics;
    const main: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="text-[37px] leading-[1.05] font-bold tracking-[-0.03em]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-2 text-[16px] text-[#666]">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      main.push({
        key: "summary",
        gap: 20,
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

    const side: Block[] = [
      {
        key: "contact",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <Avatar cv={cv} />
            <Contacts
              className="mt-7 space-y-1 text-[12px] text-[#444]"
              cv={cv}
              itemClassName="break-words"
            />
          </Sel>
        ),
      },
    ];

    for (const key of orderedSections(cv)) {
      const inSide = !isCustomKey(key) && SIDE.has(key);
      const target = inSide ? side : main;
      const blocks = sectionBlocks(
        cv,
        key,
        inSide ? SIDE_BLOCKS : MAIN_BLOCKS,
        customBlocks
      );
      if (!(isCustomKey(key) || blocks.length)) {
        continue;
      }
      target.push(
        {
          key: `title-${key}`,
          gap: 32,
          keepWithNext: true,
          node: <Title cv={cv} k={key} side={inSide} />,
        },
        ...blocks
      );
    }
    return { main, side };
  },
};
