import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import type { Block, TemplateDef } from "../engine";
import { isCustomKey } from "../schema";
import type { CV, OrderKey } from "../schema";
import {
  Contacts,
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

/** Sections drawn in the coloured column; everything else goes in the main one. */
const SIDE = new Set<OrderKey>(["skills", "languages"]);

const Title = ({
  cv,
  k,
  side,
}: {
  cv: CV;
  k: OrderKey;
  side?: boolean;
}): ReactNode => (
  <Sel label={m.cv_sel_section()} list="sections" path={`sections.${k}`}>
    <h2
      className={
        side
          ? "border-b border-white/30 pb-1 text-[12px] font-semibold tracking-[0.12em] text-white uppercase"
          : "text-[17px] font-bold tracking-[-0.01em] text-[var(--cv-accent)]"
      }
    >
      <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, k)} />
    </h2>
  </Sel>
);

const entry = (e: EntryModel, i: number): Block => ({
  key: e.id,
  gap: i === 0 ? 10 : 16,
  node: (
    <Sel label={e.label} list={e.list} path={e.p}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 text-[13.4px] font-semibold text-[#151515]">
          <EntryText e={e} which="title" />
        </p>
        <p className="shrink-0 text-[11.4px] text-[#777] tabular-nums">
          <EntryDates e={e} />
        </p>
      </div>
      <p className="text-[12px]">
        <EntryText
          className="font-medium text-[var(--cv-accent)]"
          e={e}
          which="sub"
        />
        <EntryLocation
          before={e.sub?.value ? " · " : null}
          className="text-[#888]"
          e={e}
        />
      </p>
      <Description className="mt-1 text-[#333]" p={e.p} value={e.description} />
      <Bullets
        className="mt-1 list-disc space-y-[2px] pl-4 marker:text-[var(--cv-accent)]"
        items={e.highlights ?? []}
        list={`${e.p}.highlights`}
      />
    </Sel>
  ),
});

const skills = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="text-[12px] font-semibold text-white">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
          </Show>
          <div className="mt-1 space-y-1.5">
            {s.items.map((it, j) => (
              <SkillLine
                className="block text-[11.4px] leading-[1.45] text-white/80"
                group={p}
                index={j}
                item={it}
                key={it.id}
                titleClassName="block font-medium text-white"
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
    gap: 10,
    node: (
      <ul className="space-y-1 text-[11.6px]">
        {cv.languages.map((l, i) => {
          const p = `languages.${i}`;
          return (
            <Sel
              as="li"
              className="flex justify-between gap-2"
              key={l.id}
              label={m.cv_sel_language()}
              list="languages"
              path={p}
            >
              <span className="font-medium text-white">
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_language()}
                  value={l.name}
                />
              </span>
              <Show path={p} value={l.level}>
                <span className="text-right text-white/70">
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
      </ul>
    ),
  },
];

/** Coloured left column for photo, contact, skills and languages; white main column. */
export const twoTone: TemplateDef = {
  id: "two-tone",
  category: "creative",
  name: "Two-tone",
  description: "Coloured side column, white main page.",
  defaults: {
    font: "inter",
    accent: "#27476e",
    padX: 30,
    padTop: 44,
    padBottom: 36,
  },
  side: { width: 248, position: "left", className: "bg-[var(--cv-accent)]" },
  sheetClassName: "text-[12.2px] leading-[1.5] text-[#262626]",
  build(cv) {
    const b = cv.basics;
    const keys = orderedSections(cv);
    const sideKeys = keys.filter((k) => !isCustomKey(k) && SIDE.has(k));
    const mainKeys = keys.filter((k) => !sideKeys.includes(k));

    const main: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.03em] text-[#121212]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-2 text-[15px] font-medium text-[var(--cv-accent)]">
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
        gap: 18,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <p className="text-[12.8px] text-[#333]">
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
    main.push(
      ...sectionStream(cv, mainKeys, {
        heading: (key) => ({
          key: `title-${key}`,
          gap: 26,
          keepWithNext: true,
          node: <Title cv={cv} k={key} />,
        }),
        entry,
        skills,
        languages,
      })
    );

    const side: Block[] = [
      {
        key: "contact",
        node: (
          <Sel className="text-white" label={m.cv_sel_details()} path="basics">
            <Photo
              className="mb-6 h-[120px] w-[120px] rounded-full ring-4 ring-white/20"
              cv={cv}
              height={120}
              width={120}
            />
            <Contacts
              className="space-y-1.5 text-[11.6px] text-white/85"
              cv={cv}
              itemClassName="break-words"
            />
          </Sel>
        ),
      },
      ...sectionStream(cv, sideKeys, {
        heading: (key) => ({
          key: `title-${key}`,
          gap: 28,
          keepWithNext: true,
          node: <Title cv={cv} k={key} side />,
        }),
        entry,
        skills,
        languages,
      }),
    ];
    return { main, side };
  },
};
