import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import {
  type CustomSection,
  type CV,
  isCustomKey,
  type SectionKey,
  type SkillItem,
} from "../schema";
import {
  Contacts,
  DateRange,
  orderedSections,
  Photo,
  Show,
  sectionBlocks,
  sectionLabel,
  useExpanded,
} from "./kit";
import { Rich } from "./shared";

/** Sections that live in the coloured side column. */
const SIDE: SectionKey[] = ["skills", "languages"];

const CEFR = /\b([ABC])([12])\b/i;
const OUT_OF = /^(\d(?:[.,]\d)?)\s*\/\s*(5|10)$/;
const PERCENT = /^(\d{1,3})\s*%$/;
const WHITESPACE = /\s+/;
/** Spaces, stray "&" and a closing full stop around a list item. */
const TRIM = /^[\s&+]+|[\s.]+$/g;

/** Words that name a level, in the languages people most often write CVs in. */
const WORDS: [RegExp, number][] = [
  [
    /native|mother|muttersprach|langue maternelle|nativo|madre|anadil|moedertaal|ojczysty|bilingual|zweisprachig/i,
    1,
  ],
  [/expert|master|exzellent|excellent|verhandlungssicher|c2/i, 1],
  [
    /fluent|fließend|fliessend|courant|fluido|fluente|akıcı|vloeiend|advanced|fortgeschritten|avanzado|avancé/i,
    0.8,
  ],
  [
    /proficient|very good|sehr gut|good|gut|intermediate|mittel|conversational|konversation|intermédiaire|intermedio/i,
    0.6,
  ],
  [
    /basic|beginner|elementary|grundkenntnisse|anfänger|débutant|básico|basico|temel/i,
    0.3,
  ],
];

/**
 * A 0..1 level read from text like "C1", "Fluent", "4/5" or "80%", or null
 * when the text does not name a level (then it is shown as written).
 */
export function levelOf(text: string): number | null {
  const t = text.trim();
  if (!t || t.length > 40) {
    return null;
  }
  const cefr = CEFR.exec(t);
  if (cefr) {
    const step =
      (cefr[1].toUpperCase().charCodeAt(0) - 65) * 2 + Number(cefr[2]);
    return step / 6;
  }
  const outOf = OUT_OF.exec(t);
  if (outOf) {
    return Math.min(1, Number(outOf[1].replace(",", ".")) / Number(outOf[2]));
  }
  const pct = PERCENT.exec(t);
  if (pct) {
    return Math.min(1, Number(pct[1]) / 100);
  }
  if (t.split(WHITESPACE).length > 3) {
    return null;
  }
  for (const [re, level] of WORDS) {
    if (re.test(t)) {
      return level;
    }
  }
  return null;
}

/** Five dots, filled up to the level. */
function Dots({ level }: { level: number }) {
  const filled = Math.max(1, Math.round(level * 5));
  return (
    <span className="flex shrink-0 gap-[4px]">
      {[1, 2, 3, 4, 5].map((d) => (
        <span
          className={`h-[7px] w-[7px] rounded-full ${d <= filled ? "bg-white" : "bg-white/20"}`}
          key={d}
        />
      ))}
    </span>
  );
}

function Bar({ level }: { level: number }) {
  return (
    <span className="mt-[4px] block h-[4px] rounded-full bg-white/15">
      <span
        className="block h-full rounded-full bg-white/85"
        style={{ width: `${Math.round(Math.max(0.1, level) * 100)}%` }}
      />
    </span>
  );
}

/** Splits "a, b (x, y) & c" at commas, semicolons, line breaks and " & ", never inside brackets. */
function splitList(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(" || ch === "[") {
      depth += 1;
    } else if ((ch === ")" || ch === "]") && depth > 0) {
      depth -= 1;
    }
    const amp = (ch === "&" || ch === "+") && text[i - 1] === " ";
    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n" || amp)) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((x) => x.replace(TRIM, "")).filter(Boolean);
}

/** Comma lists as chips; anything long or sentence-like stays plain text. */
function chipsOf(text: string): string[] | null {
  const parts = splitList(text);
  if (parts.length < 2 || parts.some((x) => x.length > 30)) {
    return null;
  }
  return parts;
}

/** One skill: a title with a level bar, or its list as chips. Editable as text when selected. */
function SkillRow({
  group,
  index,
  item,
}: {
  group: string;
  index: number;
  item: SkillItem;
}) {
  const ip = `${group}.items.${index}`;
  const expanded = useExpanded(ip);
  const level = levelOf(item.text);
  const chips = chipsOf(item.text);
  let body: ReactNode = null;
  if (expanded || !(level !== null || chips)) {
    body = (
      <Show path={ip} value={item.text}>
        <p className="text-[11px] text-white/75 leading-[1.45]">
          <E
            multiline
            path={`${ip}.text`}
            placeholder={m.cv_ph_skills()}
            rich
            value={item.text}
          />
        </p>
      </Show>
    );
  } else if (level !== null && item.title) {
    body = <Bar level={level} />;
  } else if (chips) {
    body = (
      <span className="mt-[3px] flex flex-wrap gap-[4px]">
        {chips.map((c, k) => (
          <span
            className="rounded-[4px] bg-white/12 px-[6px] py-px text-[10.4px] text-white/90 leading-[1.5]"
            // biome-ignore lint/suspicious/noArrayIndexKey: chips are plain strings; position is their identity
            key={k}
          >
            <Rich text={c} />
          </span>
        ))}
      </span>
    );
  }
  return (
    <Sel label={m.cv_sel_skill()} list={`${group}.items`} path={ip}>
      <Show path={ip} value={item.title}>
        <p className="font-medium text-[11.6px] text-white">
          <E
            path={`${ip}.title`}
            placeholder={m.cv_ph_title()}
            value={item.title}
          />
        </p>
      </Show>
      {body}
    </Sel>
  );
}

function SideTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-white/20 border-b pb-[4px] font-semibold text-[10.8px] text-white/65 uppercase tracking-[0.16em]">
      {children}
    </h2>
  );
}

function skillBlocks(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="mb-[6px] font-semibold text-[12px] text-white">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
          </Show>
          <div className="space-y-[7px]">
            {s.items.map((it, j) => (
              <SkillRow group={p} index={j} item={it} key={it.id} />
            ))}
          </div>
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
        <ul className="space-y-[6px]">
          {cv.languages.map((l, i) => {
            const level = levelOf(l.level);
            return (
              <Sel
                as="li"
                key={l.id}
                label={m.cv_sel_language()}
                list="languages"
                path={`languages.${i}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[11.6px] text-white">
                    <E
                      path={`languages.${i}.name`}
                      placeholder={m.cv_ph_language()}
                      value={l.name}
                    />
                  </span>
                  {level === null ? null : <Dots level={level} />}
                </div>
                <Show path={`languages.${i}`} value={l.level}>
                  <p className="text-[10.6px] text-white/60">
                    <E
                      path={`languages.${i}.level`}
                      placeholder={m.cv_ph_level()}
                      value={l.level}
                    />
                  </p>
                </Show>
              </Sel>
            );
          })}
        </ul>
      ),
    },
  ];
}

function Bullets({ list, items }: { list: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[4px] space-y-[2px] text-[#3f3f46]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[13px]"
          // biome-ignore lint/suspicious/noArrayIndexKey: bullets are plain strings; position is their identity
          key={j}
          label={m.cv_sel_bullet()}
          list={list}
          path={`${list}.${j}`}
        >
          <span className="absolute top-[0.6em] left-0 h-[5px] w-[5px] rounded-full bg-[var(--cv-accent)]" />
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
      <p className="mt-[3px] text-[#3f3f46]">
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

const DATES =
  "shrink-0 whitespace-nowrap text-right font-semibold text-[10.8px] text-[var(--cv-accent)] tabular-nums";

function Head({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 font-bold text-[#18181b] text-[13px]">{title}</p>
        {right}
      </div>
      {sub}
    </>
  );
}

function Sub({
  p,
  field,
  value,
  placeholder,
  location,
}: {
  p: string;
  field: string;
  value: string;
  placeholder: string;
  location: string;
}) {
  return (
    <Show path={p} value={value || location}>
      <p className="text-[#71717a]">
        <span className="font-medium text-[#3f3f46]">
          <E path={`${p}.${field}`} placeholder={placeholder} value={value} />
        </span>
        <Show path={p} value={location}>
          <span>
            {" · "}
            <E
              path={`${p}.location`}
              placeholder={m.cv_ph_location()}
              value={location}
            />
          </span>
        </Show>
      </p>
    </Show>
  );
}

function experienceBlocks(cv: CV): Block[] {
  return cv.experience.map((e, i) => {
    const p = `experience.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_job()} list="experience" path={p}>
          <Head
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
            }
            sub={
              <Sub
                field="company"
                location={e.location}
                p={p}
                placeholder={m.cv_ph_company()}
                value={e.company}
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
}

function educationBlocks(cv: CV): Block[] {
  return cv.education.map((e, i) => {
    const p = `education.${i}`;
    return {
      key: e.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_education()} list="education" path={p}>
          <Head
            right={
              <DateRange className={DATES} end={e.end} p={p} start={e.start} />
            }
            sub={
              <Sub
                field="school"
                location={e.location}
                p={p}
                placeholder={m.cv_ph_school()}
                value={e.school}
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
}

function projectBlocks(cv: CV): Block[] {
  return cv.projects.map((pr, i) => {
    const p = `projects.${i}`;
    return {
      key: pr.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_project()} list="projects" path={p}>
          <Head
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
            title={
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_project_name()}
                value={pr.name}
              />
            }
          />
          <Description p={p} value={pr.description} />
          <Bullets items={pr.highlights} list={`${p}.highlights`} />
        </Sel>
      ),
    };
  });
}

function customBlocks(section: CustomSection, list: string): Block[] {
  return section.items.map((it, i) => {
    const p = `${list}.items.${i}`;
    return {
      key: it.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_entry()} list={`${list}.items`} path={p}>
          <Head
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
            sub={
              <Sub
                field="subtitle"
                location={it.location}
                p={p}
                placeholder={m.cv_ph_subtitle()}
                value={it.subtitle}
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
}

const MAIN_BLOCKS: Partial<Record<SectionKey, (cv: CV) => Block[]>> = {
  experience: experienceBlocks,
  education: educationBlocks,
  projects: projectBlocks,
};

const SIDE_BLOCKS: Partial<Record<SectionKey, (cv: CV) => Block[]>> = {
  skills: skillBlocks,
  languages: languageBlocks,
};

function MainTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-[8px] font-bold text-[#18181b] text-[15px] tracking-[-0.01em]">
      <span className="h-[14px] w-[4px] rounded-full bg-[var(--cv-accent)]" />
      {children}
    </h2>
  );
}

/**
 * Infographic-lite: a deep-coloured side column with the photo, contact
 * details, skills (level bars when the text names a level, chips for short
 * lists) and languages as dots; experience and the rest on the right.
 */
export const skillbar: TemplateDef = {
  id: "skillbar",
  category: "creative",
  name: "Skillbar",
  description: "Coloured side column, skill bars and language dots.",
  defaults: {
    font: "dm-sans",
    accent: "#155e63",
    padX: 30,
    padTop: 40,
    padBottom: 34,
  },
  side: {
    width: 236,
    position: "left",
    className: "bg-[color-mix(in_srgb,var(--cv-accent)_88%,black)]",
  },
  sheetClassName: "text-[11.9px] leading-[1.5] text-[#27272a]",
  build(cv) {
    const b = cv.basics;
    const main: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="font-bold text-[#18181b] text-[32px] leading-[1.08] tracking-[-0.025em]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-[6px] font-semibold text-[12px] text-[var(--cv-accent)] uppercase tracking-[0.12em]">
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
        gap: 16,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="text-[#3f3f46]">
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
            <div className="flex justify-center">
              <Photo
                className="h-[118px] w-[118px] rounded-full ring-4 ring-white/15"
                cv={cv}
                height={118}
                width={118}
              />
            </div>
            <Contacts
              className="mt-[16px] space-y-[4px] text-[11px] text-white/85"
              cv={cv}
              itemClassName="break-words"
            />
          </Sel>
        ),
      },
    ];
    for (const key of orderedSections(cv)) {
      const inSide = !isCustomKey(key) && SIDE.includes(key);
      const blocks = sectionBlocks(
        cv,
        key,
        inSide ? SIDE_BLOCKS : MAIN_BLOCKS,
        customBlocks
      );
      const title = (
        <Sel
          label={m.cv_sel_section()}
          list="sections"
          path={`sections.${key}`}
        >
          {inSide ? (
            <SideTitle>
              <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
            </SideTitle>
          ) : (
            <MainTitle>
              <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
            </MainTitle>
          )}
        </Sel>
      );
      (inSide ? side : main).push(
        {
          key: `title-${key}`,
          gap: inSide ? 24 : 22,
          keepWithNext: true,
          node: title,
        },
        ...blocks
      );
    }
    return { main, side };
  },
};
