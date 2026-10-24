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
  type EntryModel,
  EntryText,
  sectionStream,
} from "./parts";
import { Rich } from "./shared";

const CHIP =
  "rounded-[6px] bg-[color-mix(in_srgb,var(--cv-accent)_9%,white)] px-2 py-[1px] text-[11.2px] text-[color-mix(in_srgb,var(--cv-accent)_80%,black)]";
const COMMA = /\s*,\s*/;

function entry(e: EntryModel, i: number): Block {
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
          <p className="min-w-0 font-semibold text-[#111] text-[13.4px]">
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
          <p className="shrink-0 text-[#777] text-[11.2px] tabular-nums">
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
          <p className="text-[#888] text-[11.4px]">
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
}

/** A skill as a label and chips (one per comma); editable text while selected. */
function SkillChips({
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
        <span className="mr-1 font-semibold text-[11.6px]">{item.title}</span>
      ) : null}
      {chips.map((c, n) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: chips are plain strings; position is their identity
        <span className={CHIP} key={n}>
          <Rich text={c} />
        </span>
      ))}
    </Sel>
  );
}

function skills(cv: CV): Block[] {
  return cv.skills.map((s, i) => {
    const p = `skills.${i}`;
    return {
      key: s.id,
      gap: i === 0 ? 10 : 12,
      node: (
        <Sel label={m.cv_sel_skill_group()} list="skills" path={p}>
          <Show path={p} value={s.name}>
            <p className="font-semibold text-[#555] text-[11.6px]">
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
}

function languages(cv: CV): Block[] {
  return [
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
}

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
            <h1 className="font-bold text-[#0b0b0f] text-[32px] leading-[1.1] tracking-[-0.03em]">
              <E
                path="basics.name"
                placeholder={m.cv_ph_your_name()}
                value={b.name}
              />
            </h1>
            <Show path="basics" value={b.headline}>
              <p className="mt-1 text-[#444] text-[14.5px]">
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
              <h2 className="flex items-center gap-2 font-semibold text-[#0b0b0f] text-[14px]">
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
