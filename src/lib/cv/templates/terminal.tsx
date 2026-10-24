import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import type { Block, TemplateDef } from "../engine";
import type { CV } from "../schema";
import {
  Contacts,
  orderedSections,
  Show,
  SkillLine,
  sectionLabel,
} from "./kit";
import {
  Bullets,
  Description,
  EntryDates,
  EntryLocation,
  EntryText,
  hasDates,
  sectionStream,
} from "./parts";
import type { EntryModel } from "./parts";

const MUTED = "text-[#8b949e]";
/** Shell prompt shown above the name; code, not prose, so it is never translated. */
const PROMPT = "~/cv $ whoami";

const entry = (e: EntryModel, i: number): Block => ({
  key: e.id,
  gap: i === 0 ? 10 : 16,
  node: (
    <Sel label={e.label} list={e.list} path={e.p}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 font-semibold text-[#111]">
          <EntryText e={e} which="title" />
          <EntryText
            before={<span className={MUTED}> @ </span>}
            className="text-[var(--cv-accent)]"
            e={e}
            which="sub"
          />
        </p>
        {hasDates(e) ? (
          <p className={`shrink-0 ${MUTED} text-[10.6px]`}>
            [<EntryDates e={e} separator=" → " />]
          </p>
        ) : (
          <p className="shrink-0">
            <EntryDates e={e} separator=" → " />
          </p>
        )}
      </div>
      <p className={`${MUTED} text-[10.8px]`}>
        <EntryLocation before="# " e={e} />
      </p>
      <Description
        className="mt-1 text-[#30363d]"
        p={e.p}
        value={e.description}
      />
      <Bullets
        className="mt-1 space-y-[2px]"
        itemClassName="relative pl-[2ch]"
        items={e.highlights ?? []}
        list={`${e.p}.highlights`}
        marker={
          <span className="absolute left-0 text-[var(--cv-accent)]">-</span>
        }
      />
    </Sel>
  ),
});

const skills = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className={MUTED}>
              {"// "}
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
              titleClassName="text-[var(--cv-accent)]"
            />
          ))}
        </Sel>
      ),
    };
  });

const languages = (cv: CV): Block[] => [
  {
    key: "languages",
    gap: 10,
    node: (
      <div>
        {cv.languages.map((l, i) => {
          const p = `languages.${i}`;
          return (
            <Sel
              key={l.id}
              label={m.cv_sel_language()}
              list="languages"
              path={p}
            >
              <span className="text-[var(--cv-accent)]">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_language()}
                  value={l.name}
                />
              </span>
              <Show path={p} value={l.level}>
                <span>
                  {": "}
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

/** A developer CV in monospace, with quiet code-style markers. */
export const terminal: TemplateDef = {
  id: "terminal",
  category: "technical",
  name: "Terminal",
  description: "Monospace, code-style markers. For developers.",
  defaults: {
    font: "ibm-plex-mono",
    accent: "#1a7f37",
    padX: 50,
    padTop: 48,
    padBottom: 40,
  },
  sheetClassName: "text-[11.4px] leading-[1.6] text-[#1f2328]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <p className={`${MUTED} text-[11px]`}>{PROMPT}</p>
            <h1 className="mt-1 text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-[#0d1117]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
              <span className="ml-1 inline-block h-[0.9em] w-[0.5em] translate-y-[0.12em] bg-[var(--cv-accent)]" />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-1 text-[13px] text-[var(--cv-accent)]">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <Contacts
              className="mt-3 flex flex-wrap text-[11px]"
              cv={cv}
              separator={<span className={`mx-2 ${MUTED}`}>|</span>}
            />
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 20,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="border-l-2 border-[var(--cv-accent)] pl-3 text-[#30363d]">
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
    blocks.push(
      ...sectionStream(cv, orderedSections(cv), {
        heading: (key) => ({
          key: `title-${key}`,
          gap: 24,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <h2 className="text-[13px] font-semibold text-[#0d1117]">
                <span className="text-[var(--cv-accent)]">## </span>
                <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
              </h2>
            </Sel>
          ),
        }),
        entry,
        skills,
        languages,
      })
    );
    return { main: blocks };
  },
};
