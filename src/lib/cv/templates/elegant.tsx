import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CV } from "../schema";
import {
  Contacts,
  InlineLanguages,
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
  type EntryModel,
  EntryText,
  sectionStream,
} from "./parts";

function entry(e: EntryModel, i: number): Block {
  return {
    key: e.id,
    gap: i === 0 ? 14 : 22,
    node: (
      <Sel label={e.label} list={e.list} path={e.p}>
        <div className="flex items-baseline justify-between gap-6">
          <p className="min-w-0 text-[#1c1c1c] text-[15px] leading-[1.35]">
            <EntryText e={e} which="title" />
          </p>
          <p className="shrink-0 text-[#8a8a8a] text-[12px] italic">
            <EntryDates e={e} />
          </p>
        </div>
        <p className="mt-[2px] text-[11.6px] text-[var(--cv-accent)] uppercase tracking-[0.12em]">
          <EntryText e={e} which="sub" />
          <EntryLocation
            before={
              e.sub?.value ? <span className="text-[#bbb]"> · </span> : null
            }
            className="text-[#999]"
            e={e}
          />
        </p>
        <Description
          className="mt-2 text-[#3a3a3a]"
          p={e.p}
          value={e.description}
        />
        <Bullets
          className="mt-1.5 space-y-[3px]"
          itemClassName="relative pl-5"
          items={e.highlights ?? []}
          list={`${e.p}.highlights`}
          marker={
            <span className="absolute top-[0.72em] left-[2px] h-px w-[9px] bg-[var(--cv-accent)]" />
          }
        />
      </Sel>
    ),
  };
}

function skills(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 14 : 16,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="text-[14px] italic">
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
                ? "mt-1 grid grid-cols-2 gap-x-8 gap-y-1"
                : "mt-1 space-y-1"
            }
          >
            {s.items.map((it, j) => (
              <SkillLine
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="font-semibold"
              />
            ))}
          </div>
        </Sel>
      ),
    };
  });
}

function languages(cv: CV): Block[] {
  return [
    {
      key: "languages",
      gap: 14,
      node: (
        <InlineLanguages
          cv={cv}
          levelClassName="italic text-[#777]"
          separator={<span className="mx-3 text-[#ccc]">·</span>}
        />
      ),
    },
  ];
}

/** Refined serif CV: a large display name, hairline rules and plenty of space. */
export const elegant: TemplateDef = {
  id: "elegant",
  category: "professional",
  name: "Elegant",
  description: "Serif display name, hairlines, generous space.",
  defaults: {
    font: "lora",
    accent: "#8a6a45",
    padX: 66,
    padTop: 64,
    padBottom: 52,
  },
  sheetClassName: "text-[12.6px] leading-[1.65] text-[#2a2a2a]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel
            className="flex items-end justify-between gap-8"
            label={m.cv_sel_details()}
            path="basics"
          >
            <div className="min-w-0">
              <h1 className="text-[#161616] text-[42px] leading-[1.05] tracking-[-0.015em]">
                <E
                  path="basics.name"
                  placeholder={m.cv_ph_your_name()}
                  value={b.name}
                />
              </h1>
              <Show path="basics" value={b.headline}>
                <p className="mt-2 text-[12px] text-[var(--cv-accent)] uppercase tracking-[0.2em]">
                  <E
                    path="basics.headline"
                    placeholder={m.cv_ph_headline()}
                    value={b.headline}
                  />
                </p>
              </Show>
            </div>
            <Contacts
              className="shrink-0 space-y-[1px] text-right text-[#666] text-[11.6px]"
              cv={cv}
              itemClassName="block"
            />
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 30,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="border-[#e4ddd3] border-t pt-5 text-[#333] text-[14px] italic leading-[1.6]">
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
          gap: 36,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <h2 className="flex items-center gap-4 text-[13px] text-[var(--cv-accent)] uppercase tracking-[0.22em]">
                <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
                <span className="h-px flex-1 bg-[#e4ddd3]" />
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
