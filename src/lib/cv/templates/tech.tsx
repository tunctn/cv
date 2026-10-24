import { E, Sel } from "#/components/cv/editing";
import { m } from "#/paraglide/messages.js";

import type { Block, TemplateDef } from "../engine";
import type { CV, SkillItem } from "../schema";
import {
  Contacts,
  orderedSections,
  Show,
  SkillLine,
  sectionLabel,
  useExpanded,
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
import { Rich } from "./shared";

const CHIP =
  "rounded-[6px] bg-[color-mix(in_srgb,var(--cv-accent)_9%,white)] px-2 py-[1px] text-[11.2px] text-[color-mix(in_srgb,var(--cv-accent)_80%,black)]";
const COMMA = /\s*,\s*/u;

const entry = (e: EntryModel, i: number): Block => {
  const project = e.list === "projects";
  return {
    key: e.id,
    gap: i === 0 || project ? 10 : 16,
    node: (
      <Sel
        className={
          project
            ? "rounded-[10px] border border-[color-mix(in_srgb,var(--cv-accent)_18%,white)] bg-[color-mix(in_srgb,var(--cv-accent)_4%,white)] px-4 py-3"
            : undefined
        }
        label={e.label}
        list={e.list}
        path={e.p}
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="min-w-0 text-[13.4px] font-semibold text-[#111]">
            <EntryText e={e} which="title" />
            {project ? null : (
              <EntryText
                before={<span className="text-[#999]"> · </span>}
                className="font-medium text-[var(--cv-accent)]"
                e={e}
                which="sub"
              />
            )}
          </p>
          <p className="shrink-0 text-[11.2px] text-[#777] tabular-nums">
            <EntryDates e={e} />
          </p>
        </div>
        {project ? (
          <p className="text-[11.6px]">
            <EntryText
              className="font-medium text-[var(--cv-accent)] underline underline-offset-2"
              e={e}
              which="sub"
            />
          </p>
        ) : (
          <p className="text-[11.4px] text-[#888]">
            <EntryLocation e={e} />
          </p>
        )}
        <Description
          className="mt-1 text-[#333]"
          p={e.p}
          value={e.description}
        />
        <Bullets
          className="mt-1 list-disc space-y-[2px] pl-4 marker:text-[#bbb]"
          items={e.highlights ?? []}
          list={`${e.p}.highlights`}
        />
      </Sel>
    ),
  };
};

const SkillChips = ({
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
  if (expanded) {
    return (
      <SkillLine
        group={group}
        index={index}
        item={item}
        titleClassName="font-semibold"
      />
    );
  }
  const chips = item.text.split(COMMA).filter(Boolean);
  return (
    <Sel
      className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1"
      label={m.cv_sel_skill()}
      list={`${group}.items`}
      path={ip}
    >
      {item.title ? (
        <span className="mr-1 text-[11.6px] font-semibold">{item.title}</span>
      ) : null}
      {chips.map((c, n) => (
        // oxlint-disable-next-line react/no-array-index-key -- chips are plain strings; position is their identity
        <span className={CHIP} key={n}>
          <Rich text={c} />
        </span>
      ))}
    </Sel>
  );
};

const skills = (cv: CV): Block[] =>
  cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="text-[11.6px] font-semibold text-[#555]">
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_group_name()}
                value={s.name}
              />
            </p>
          </Show>
          <div className="mt-1 space-y-1.5">
            {s.items.map((it, j) => (
              <SkillChips group={p} index={j} item={it} key={it.id} />
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
      <div className="flex flex-wrap gap-1.5">
        {cv.languages.map((l, i) => {
          const p = `languages.${i}`;
          return (
            <Sel
              className={CHIP}
              key={l.id}
              label={m.cv_sel_language()}
              list="languages"
              path={p}
            >
              <E
                path={`${p}.name`}
                placeholder={m.cv_ph_language()}
                value={l.name}
              />
              <Show path={p} value={l.level}>
                <span className="opacity-70">
                  {" · "}
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

/** A technical CV: links up front, skills as chips, projects in cards. */
export const tech: TemplateDef = {
  id: "tech",
  category: "technical",
  name: "Tech",
  description: "Skill chips, project cards, links up front.",
  defaults: {
    font: "ibm-plex-sans",
    accent: "#4f46e5",
    padX: 48,
    padTop: 46,
    padBottom: 38,
  },
  sheetClassName: "text-[12.2px] leading-[1.5] text-[#24292f]",
  build(cv) {
    const b = cv.basics;
    const blocks: Block[] = [
      {
        key: "header",
        node: (
          <Sel label={m.cv_sel_details()} path="basics">
            <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.03em] text-[#0b0b0f]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-1 text-[14.5px] text-[#444]">
                <E
                  path="basics.headline"
                  placeholder={m.cv_ph_headline()}
                  value={b.headline}
                />
              </p>
            </Show>
            <Contacts
              className="mt-3 flex flex-wrap gap-1.5 text-[11.4px]"
              cv={cv}
              itemClassName="rounded-full border border-[color-mix(in_srgb,var(--cv-accent)_30%,white)] px-2.5 py-[2px] font-medium text-[var(--cv-accent)]"
            />
          </Sel>
        ),
      },
    ];
    if (b.summary) {
      blocks.push({
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
              <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#0b0b0f]">
                <span className="h-[14px] w-[3px] rounded-full bg-[var(--cv-accent)]" />
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
