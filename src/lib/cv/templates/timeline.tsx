import type { ReactNode } from "react";

import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";
import type { Block, TemplateDef } from "../engine";
import type { CV } from "../schema";
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

/**
 * Three columns: dates, the spine, content. Every block draws its own piece
 * of the spine and spaces itself with bottom padding, so the line never
 * breaks between blocks.
 */
function Track({
  margin,
  dot,
  children,
  className,
}: {
  margin?: ReactNode;
  dot?: "entry" | "section";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-[96px_28px_1fr] ${className ?? ""}`}>
      <div className="pt-[2px] pr-1 text-right text-[#7a7a7a] text-[11px] tabular-nums leading-[1.45]">
        {margin}
      </div>
      <div className="relative">
        <span className="absolute top-0 bottom-0 left-[13px] w-[2px] bg-[color-mix(in_srgb,var(--cv-accent)_22%,white)]" />
        {dot === "entry" ? (
          <span className="absolute top-[5px] left-[9px] h-[10px] w-[10px] rounded-full border-2 border-[var(--cv-accent)] bg-white" />
        ) : null}
        {dot === "section" ? (
          <span className="absolute top-[6px] left-[6px] h-[16px] w-[16px] rounded-full bg-[var(--cv-accent)]" />
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function entry(e: EntryModel): Block {
  return {
    key: e.id,
    node: (
      <Sel label={e.label} list={e.list} path={e.p}>
        <Track
          className="pb-[16px]"
          dot="entry"
          margin={<EntryDates e={e} separator=" – " />}
        >
          <p className="font-semibold text-[#151515] text-[13.4px]">
            <EntryText e={e} which="title" />
          </p>
          <p className="text-[12px]">
            <EntryText
              className="font-medium text-[var(--cv-accent)]"
              e={e}
              which="sub"
            />
            <EntryLocation
              before={e.sub?.value ? ", " : null}
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
        </Track>
      </Sel>
    ),
  };
}

function skills(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Track
            className="pb-[14px]"
            dot="entry"
            margin={
              <Show path={p} value={s.name}>
                <E
                  path={`${p}.name`}
                  placeholder={m.cv_ph_group_name()}
                  value={s.name}
                />
              </Show>
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
          </Track>
        </Sel>
      ),
    };
  });
}

function languages(cv: CV): Block[] {
  return cv.languages.map((l, i) => {
    const p = `languages.${i}`;
    return {
      key: l.id,
      node: (
        <Sel label={m.cv_sel_language()} list="languages" path={p}>
          <Track
            className="pb-[6px]"
            margin={
              <Show path={p} value={l.level}>
                <E
                  path={`${p}.level`}
                  placeholder={m.cv_ph_level()}
                  value={l.level}
                />
              </Show>
            }
          >
            <E
              path={`${p}.name`}
              placeholder={m.cv_ph_language()}
              value={l.name}
            />
          </Track>
        </Sel>
      ),
    };
  });
}

/** A vertical spine runs down the page; dates sit to its left, entries to its right. */
export const timeline: TemplateDef = {
  id: "timeline",
  category: "creative",
  name: "Timeline",
  description: "A spine down the page, dates on the left.",
  defaults: {
    font: "inter",
    accent: "#0f766e",
    padX: 44,
    padTop: 48,
    padBottom: 36,
  },
  sheetClassName: "text-[12.2px] leading-[1.5] text-[#262626]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel
            className="flex items-center gap-6 pb-[26px]"
            label={m.cv_sel_details()}
            path="basics"
          >
            <Photo
              className="h-[84px] w-[84px] shrink-0 rounded-full"
              cv={cv}
              height={84}
              width={84}
            />
            <div className="min-w-0">
              <h1 className="font-bold text-[#111] text-[32px] leading-[1.1] tracking-[-0.025em]">
                <E
                  path="basics.name"
                  placeholder={m.cv_ph_your_name()}
                  value={b.name}
                />
              </h1>
              <Show path="basics" value={b.headline}>
                <p className="mt-1 font-medium text-[14.5px] text-[var(--cv-accent)]">
                  <E
                    path="basics.headline"
                    placeholder={m.cv_ph_headline()}
                    value={b.headline}
                  />
                </p>
              </Show>
              <Contacts
                className="mt-2 flex flex-wrap gap-x-4 text-[#666] text-[11.6px]"
                cv={cv}
              />
            </div>
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
        key: "summary",
        node: (
          <Sel label={m.cv_sel_profile()} path="basics.summary">
            <Track className="pb-[22px]">
              <p className="text-[#333] text-[13px]">
                <E
                  multiline
                  path="basics.summary"
                  placeholder={m.cv_ph_summary()}
                  rich
                  value={b.summary}
                />
              </p>
            </Track>
          </Sel>
        ),
      });
    }
    blocks.push(
      ...sectionStream(cv, orderedSections(cv), {
        heading: (key) => ({
          key: `title-${key}`,
          keepWithNext: true,
          node: (
            <Sel
              label={m.cv_sel_section()}
              list="sections"
              path={`sections.${key}`}
            >
              <Track className="pt-[6px] pb-[12px]" dot="section">
                <h2 className="font-bold text-[16px] text-[var(--cv-accent)] uppercase tracking-[0.06em]">
                  <E
                    placeholder={m.cv_ph_section()}
                    {...sectionLabel(cv, key)}
                  />
                </h2>
              </Track>
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
