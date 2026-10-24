import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import type { Block, TemplateDef } from "../engine";
import { isCustomKey } from "../schema";
import type { CustomSection, CV, SectionKey, SkillItem } from "../schema";
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
const SIDE = new Set<SectionKey>(["skills", "languages"]);

const CEFR = /\b(?<level>[ABC])(?<step>[12])\b/iu;
const OUT_OF = /^(?<score>\d(?:[.,]\d)?)\s*\/\s*(?<max>5|10)$/u;
const PERCENT = /^(?<pct>\d{1,3})\s*%$/u;
const WHITESPACE = /\s+/u;
/** Spaces, stray "&" and a closing full stop around a list item. */
const TRIM = /^[\s&+]+|[\s.]+$/gu;

/** Words that name a level, in the languages people most often write CVs in. */
const WORDS: [RegExp, number][] = [
  [
    /native|mother|muttersprach|langue maternelle|nativo|madre|anadil|moedertaal|ojczysty|bilingual|zweisprachig/iu,
    1,
  ],
  [/expert|master|exzellent|excellent|verhandlungssicher|c2/iu, 1],
  [
    /fluent|fließend|fliessend|courant|fluido|fluente|akıcı|vloeiend|advanced|fortgeschritten|avanzado|avancé/iu,
    0.8,
  ],
  [
    /proficient|very good|sehr gut|good|gut|intermediate|mittel|conversational|konversation|intermédiaire|intermedio/iu,
    0.6,
  ],
  [
    /basic|beginner|elementary|grundkenntnisse|anfänger|débutant|básico|basico|temel/iu,
    0.3,
  ],
];

export const levelOf = (text: string): number | null => {
  const t = text.trim();
  if (!t || t.length > 40) {
    return null;
  }
  const cefr = CEFR.exec(t);
  if (cefr) {
    const step =
      (((cefr.groups?.level ?? "A").toUpperCase().codePointAt(0) ?? 65) - 65) *
        2 +
      Number(cefr.groups?.step);
    return step / 6;
  }
  const outOf = OUT_OF.exec(t);
  if (outOf) {
    return Math.min(
      1,
      Number((outOf.groups?.score ?? "0").replace(",", ".")) /
        Number(outOf.groups?.max)
    );
  }
  const pct = PERCENT.exec(t);
  if (pct) {
    return Math.min(1, Number(pct.groups?.pct) / 100);
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
};

const Dots = ({ level }: { level: number }) => {
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
};

const Bar = ({ level }: { level: number }) => (
  <span className="mt-[4px] block h-[4px] rounded-full bg-white/15">
    <span
      className="block h-full rounded-full bg-white/85"
      style={{ width: `${Math.round(Math.max(0.1, level) * 100)}%` }}
    />
  </span>
);

const splitList = (text: string): string[] => {
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
  return parts.map((x) => x.replaceAll(TRIM, "")).filter(Boolean);
};

const chipsOf = (text: string): string[] | null => {
  const parts = splitList(text);
  if (parts.length < 2 || parts.some((x) => x.length > 30)) {
    return null;
  }
  return parts;
};

const SkillRow = ({
  group,
  index,
  item,
}: {
  group: string;
  index: number;
  item: SkillItem;
}) => {
  const ip = `${group}.items.${index}`;
  const expanded = useExpanded(ip);
  const level = levelOf(item.text);
  const chips = chipsOf(item.text);
  let body: ReactNode = null;
  if (expanded || !(level !== null || chips)) {
    body = (
      <Show path={ip} value={item.text}>
        <p className="text-[11px] leading-[1.45] text-white/75">
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
            className="rounded-[4px] bg-white/12 px-[6px] py-px text-[10.4px] leading-[1.5] text-white/90"
            // oxlint-disable-next-line react/no-array-index-key -- chips are plain strings; position is their identity
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
        <p className="text-[11.6px] font-medium text-white">
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
};

const SideTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="border-b border-white/20 pb-[4px] text-[10.8px] font-semibold tracking-[0.16em] text-white/65 uppercase">
    {children}
  </h2>
);

const skillBlocks = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 16,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="mb-[6px] text-[12px] font-semibold text-white">
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

const languageBlocks = (cv: CV): Block[] => [
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
                <span className="text-[11.6px] font-medium text-white">
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

const Bullets = ({ list, items }: { list: string; items: string[] }) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className="mt-[4px] space-y-[2px] text-[#3f3f46]">
      {items.map((h, j) => (
        <Sel
          as="li"
          className="relative pl-[13px]"
          // oxlint-disable-next-line react/no-array-index-key -- bullets are plain strings; position is their identity
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
};

const Description = ({ p, value }: { p: string; value: string }) => (
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

const DATES =
  "shrink-0 whitespace-nowrap text-right font-semibold text-[10.8px] text-[var(--cv-accent)] tabular-nums";

const Head = ({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) => (
  <>
    <div className="flex items-baseline justify-between gap-4">
      <p className="min-w-0 text-[13px] font-bold text-[#18181b]">{title}</p>
      {right}
    </div>
    {sub}
  </>
);

const Sub = ({
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
}) => (
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

const experienceBlocks = (cv: CV): Block[] =>
  cv.experience.map((e, i) => {
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

const educationBlocks = (cv: CV): Block[] =>
  cv.education.map((e, i) => {
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

const projectBlocks = (cv: CV): Block[] =>
  cv.projects.map((pr, i) => {
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

const customBlocks = (section: CustomSection, list: string): Block[] =>
  section.items.map((it, i) => {
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

const MAIN_BLOCKS: Partial<Record<SectionKey, (cv: CV) => Block[]>> = {
  experience: experienceBlocks,
  education: educationBlocks,
  projects: projectBlocks,
};

const SIDE_BLOCKS: Partial<Record<SectionKey, (cv: CV) => Block[]>> = {
  skills: skillBlocks,
  languages: languageBlocks,
};

const MainTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="flex items-center gap-[8px] text-[15px] font-bold tracking-[-0.01em] text-[#18181b]">
    <span className="h-[14px] w-[4px] rounded-full bg-[var(--cv-accent)]" />
    {children}
  </h2>
);

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
            <h1 className="text-[32px] leading-[1.08] font-bold tracking-[-0.025em] text-[#18181b]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-[6px] text-[12px] font-semibold tracking-[0.12em] text-[var(--cv-accent)] uppercase">
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
      const inSide = !isCustomKey(key) && SIDE.has(key);
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
