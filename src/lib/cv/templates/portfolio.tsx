import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import { resolveStyle } from "../engine";
import type { Block, TemplateDef } from "../engine";
import type { CV } from "../schema";
import {
  Contacts,
  InlineLanguages,
  orderedSections,
  Photo,
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
  sectionStream,
} from "./parts";
import type { EntryModel } from "./parts";

const Header = ({ cv, padX }: { cv: CV; padX: number }) => {
  const b = cv.basics;
  return (
    <Sel
      className="bg-[var(--cv-accent)] text-white"
      label={m.cv_sel_details()}
      path="basics"
    >
      <div
        className="flex items-center justify-between gap-8"
        style={{ padding: `44px ${padX}px 40px` }}
      >
        <div className="min-w-0">
          <h1 className="text-[40px] leading-[1.02] font-bold tracking-[-0.035em]">
            <E
              path="basics.name"
              placeholder={m.cv_ph_your_name()}
              value={b.name}
            />
          </h1>
          <Show path="basics" value={b.headline}>
            <p className="mt-2 text-[16px] font-medium text-white/85">
              <E
                path="basics.headline"
                placeholder={m.cv_ph_headline()}
                value={b.headline}
              />
            </p>
          </Show>
          <Contacts
            className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-white/80"
            cv={cv}
          />
        </div>
        <Photo
          className="h-[118px] w-[118px] shrink-0 rounded-full ring-4 ring-white/25"
          cv={cv}
          height={118}
          width={118}
        />
      </div>
    </Sel>
  );
};

const entry = (e: EntryModel, i: number): Block => ({
  key: e.id,
  gap: i === 0 ? 12 : 18,
  node: (
    <Sel label={e.label} list={e.list} path={e.p}>
      <div className="flex items-baseline justify-between gap-6">
        <p className="min-w-0 text-[14px] font-bold tracking-[-0.01em] text-[#141414]">
          <EntryText e={e} which="title" />
        </p>
        <p className="shrink-0 text-[11.5px] font-semibold text-[var(--cv-accent)] tabular-nums">
          <EntryDates e={e} />
        </p>
      </div>
      <p className="text-[12.4px] text-[#555]">
        <EntryText className="font-medium" e={e} which="sub" />
        <EntryLocation
          before={
            e.sub?.value ? <span className="text-[#bbb]"> / </span> : null
          }
          className="text-[#888]"
          e={e}
        />
      </p>
      <Description
        className="mt-1.5 text-[#333]"
        p={e.p}
        value={e.description}
      />
      <Bullets
        className="mt-1.5 space-y-[3px]"
        itemClassName="relative pl-4"
        items={e.highlights ?? []}
        list={`${e.p}.highlights`}
        marker={
          <span className="absolute top-[0.55em] left-0 h-[6px] w-[6px] rounded-full border-[1.5px] border-[var(--cv-accent)]" />
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
      gap: i === 0 ? 12 : 14,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="text-[13px] font-bold">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
          </Show>
          <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1.5">
            {s.items.map((it, j) => (
              <SkillLine
                className="rounded-[10px] bg-[color-mix(in_srgb,var(--cv-accent)_8%,white)] px-3 py-1.5"
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="font-semibold text-[var(--cv-accent)]"
              />
            ))}
          </div>
        </Sel>
      ),
    };
  });

const languages = (cv: CV): Block[] => [
  {
    key: "languages",
    gap: 12,
    node: (
      <InlineLanguages
        cv={cv}
        levelClassName="text-[#777]"
        separator={<span className="mx-2 text-[#ccc]">/</span>}
      />
    ),
  },
];

/** Creative CV: a full-width colour block with name and photo, then airy entries. */
export const portfolio: TemplateDef = {
  id: "portfolio",
  category: "creative",
  name: "Portfolio",
  description: "Bold colour header with photo. For creative work.",
  defaults: {
    font: "dm-sans",
    accent: "#e4572e",
    padX: 52,
    padTop: 44,
    padBottom: 40,
  },
  sheetClassName: "text-[12.4px] leading-[1.55] text-[#2a2a2a]",
  build(cv) {
    const { padX } = resolveStyle(portfolio, cv);
    const blocks: Block[] = [
      { key: "header", bleed: true, node: <Header cv={cv} padX={padX} /> },
    ];
    if (cv.basics.summary) {
      blocks.push({
        key: "summary",
        gap: 30,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="text-[14.5px] leading-[1.55] text-[#222]">
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
    blocks.push(
      ...sectionStream(cv, orderedSections(cv), {
        heading: (key) => ({
          key: `title-${key}`,
          gap: 30,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <h2 className="text-[19px] font-bold tracking-[-0.02em] text-[#141414]">
                <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, key)} />
              </h2>
              <span className="mt-1.5 block h-[3px] w-8 rounded-full bg-[var(--cv-accent)]" />
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
