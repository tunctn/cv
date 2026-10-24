import type { ReactNode } from "react";

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

const GRID = "grid grid-cols-[150px_1fr] gap-x-8";

/** Left column of the grid (dates, labels), right column for content. */
function Row({
  left,
  children,
  className,
}: {
  left?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${GRID} ${className ?? ""}`}>
      <div className="text-[#6b6b6b] text-[11.4px] tabular-nums leading-[1.55]">
        {left}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function entry(e: EntryModel, i: number): Block {
  return {
    key: e.id,
    gap: i === 0 ? 14 : 18,
    node: (
      <Sel label={e.label} list={e.list} path={e.p}>
        <Row
          left={
            <>
              <p>
                <EntryDates e={e} />
              </p>
              <p>
                <EntryLocation e={e} />
              </p>
            </>
          }
        >
          <p className="font-bold text-[13.4px] text-black">
            <EntryText e={e} which="title" />
          </p>
          <p>
            <EntryText e={e} which="sub" />
          </p>
          <Description className="mt-1" p={e.p} value={e.description} />
          <Bullets
            className="mt-1 space-y-[2px]"
            itemClassName="relative pl-4"
            items={e.highlights ?? []}
            list={`${e.p}.highlights`}
            marker={<span className="absolute left-0 text-black">—</span>}
          />
        </Row>
      </Sel>
    ),
  };
}

function skills(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 14 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Row
            left={
              <Show path={p} value={s.name}>
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_group_name()}
                  value={s.name}
                />
              </Show>
            }
          >
            <div
              className={
                s.columns === 2 ? "grid grid-cols-2 gap-x-6" : undefined
              }
            >
              {s.items.map((it, j) => (
                <SkillLine
                  group={p}
                  index={j}
                  item={it}
                  key={it.id}
                  titleClassName="font-bold"
                />
              ))}
            </div>
          </Row>
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
        <Row>
          <InlineLanguages cv={cv} />
        </Row>
      ),
    },
  ];
}

/**
 * International Typographic Style: a strict two-column grid, a very large
 * grotesk name, numbered sections and a single accent colour.
 */
export const swiss: TemplateDef = {
  id: "swiss",
  category: "simple",
  name: "Swiss",
  description: "Strict grid, big name, numbered sections.",
  defaults: {
    font: "inter",
    accent: "#e30613",
    padX: 52,
    padTop: 52,
    padBottom: 40,
  },
  sheetClassName: "text-[12.2px] leading-[1.55] text-[#141414]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="font-bold text-[50px] text-black leading-[0.95] tracking-[-0.045em]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Row className="mt-5 border-black border-t-2 pt-3">
              <Show path="basics" value={b.headline}>
                <p className="font-bold text-[14px] text-[var(--cv-accent)]">
                  <E
                    path="basics.headline"
                    placeholder={m.cv_ph_headline()}
                    value={b.headline}
                  />
                </p>
              </Show>
              <Contacts
                className="mt-1 flex flex-wrap gap-x-5 text-[11.6px]"
                cv={cv}
              />
            </Row>
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        gap: 22,
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <Row>
              <p className="text-[13.4px] leading-[1.5]">
                <E
                  multiline
                  path="basics.summary"
                  placeholder={m.cv_ph_summary()}
                  rich
                  value={b.summary}
                />
              </p>
            </Row>
          </Sel>
        ),
      });
    }
    blocks.push(
      ...sectionStream(cv, orderedSections(cv), {
        heading: (key, n) => ({
          key: `title-${key}`,
          gap: 30,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <div className={`${GRID} border-black border-t pt-2`}>
                <span className="font-bold text-[13px] text-[var(--cv-accent)] tabular-nums">
                  {String(n + 1).padStart(2, "0")}
                </span>
                <h2 className="font-bold text-[13px] text-black">
                  <E
                    placeholder={m.cv_ph_section()}
                    {...sectionLabel(cv, key)}
                  />
                </h2>
              </div>
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
