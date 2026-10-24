import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import { type CV, isCustomKey, type OrderKey } from "../schema";
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
  type EntryModel,
  EntryText,
  sectionStream,
} from "./parts";

/** Sections drawn in the coloured column; everything else goes in the main one. */
const SIDE: OrderKey[] = ["skills", "languages"];

function Title({
  cv,
  k,
  side,
}: {
  cv: CV;
  k: OrderKey;
  side?: boolean;
}): ReactNode {
  return (
    <Sel label={m.cv_sel_section()} list="sections" path={`sections.${k}`}>
      <h2
        className={
          side
            ? "border-white/30 border-b pb-1 font-semibold text-[12px] text-white uppercase tracking-[0.12em]"
            : "font-bold text-[17px] text-[var(--cv-accent)] tracking-[-0.01em]"
        }
      >
        <E placeholder={m.cv_ph_section()} {...sectionLabel(cv, k)} />
      </h2>
    </Sel>
  );
}

function entry(e: EntryModel, i: number): Block {
  return {
    key: e.id,
    gap: i === 0 ? 10 : 16,
    node: (
      <Sel label={e.label} list={e.list} path={e.p}>
        <div className="flex items-baseline justify-between gap-4">
          <p className="min-w-0 font-semibold text-[#151515] text-[13.4px]">
            <EntryText e={e} which="title" />
          </p>
          <p className="shrink-0 text-[#777] text-[11.4px] tabular-nums">
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
        <Description
          className="mt-1 text-[#333]"
          p={e.p}
          value={e.description}
        />
        <Bullets
          className="mt-1 list-disc space-y-[2px] pl-4 marker:text-[var(--cv-accent)]"
          items={e.highlights ?? []}
          list={`${e.p}.highlights`}
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
      gap: i === 0 ? 10 : 14,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="font-semibold text-[12px] text-white">
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
                className="block text-[11.4px] text-white/80 leading-[1.45]"
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
}

function languages(cv: CV): Block[] {
  return [
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
}

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
    const sideKeys = keys.filter((k) => !isCustomKey(k) && SIDE.includes(k));
    const mainKeys = keys.filter((k) => !sideKeys.includes(k));

    const main: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="font-bold text-[#121212] text-[34px] leading-[1.05] tracking-[-0.03em]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-2 font-medium text-[15px] text-[var(--cv-accent)]">
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
            <p className="text-[#333] text-[12.8px]">
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
