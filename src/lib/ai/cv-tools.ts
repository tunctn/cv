import { tool } from "ai";
import type { LanguageModel } from "ai";
import { z } from "zod";

import { FONTS } from "#/lib/cv/fonts";
import { addCustomSection, removeCustomSection } from "#/lib/cv/paths";
import {
  customItemSchema,
  customKey,
  EMPTY_ITEM,
  educationSchema,
  emptyCustomItem,
  emptyCustomSection,
  experienceSchema,
  languageSchema,
  newId,
  PAPERS,
  projectSchema,
  SECTION_KEYS,
  skillSchema,
} from "#/lib/cv/schema";
import type { CV, OrderKey, SectionKey } from "#/lib/cv/schema";
import { TEMPLATE_IDS } from "#/lib/cv/templates";
import type { TemplateId } from "#/lib/cv/templates";

import { readUrl } from "./read-url";
import { translateCv } from "./translate-cv";
import type { TranslateUsage } from "./translate-cv";

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/u;

export interface Account {
  email: string;
  image: string | null;
  name: string;
}

interface State {
  /** The signed-in person (not for guests): fills an empty CV header. */
  account?: Account | null;
  cv: CV;
  template: TemplateId;
}

const upsertExtra = {
  id: z
    .string()
    .optional()
    .describe(
      "Id of the existing item to change. Leave out to add a new item."
    ),
  position: z
    .number()
    .int()
    .optional()
    .describe("Zero-based index for a new item. Defaults to the top (0)."),
};

/** Item fields minus `id`, all optional, plus an optional id to target an existing item. */
const UPSERT_INPUTS = {
  experience: experienceSchema.omit({ id: true }).partial().extend(upsertExtra),
  education: educationSchema.omit({ id: true }).partial().extend(upsertExtra),
  skills: skillSchema
    .omit({ id: true, items: true })
    .partial()
    .extend({
      ...upsertExtra,
      items: z
        .array(z.object({ title: z.string(), text: z.string() }))
        .optional()
        .describe(
          "Items to add or update, each a bold title plus a line of text. For an existing group they are MERGED by title: same title = updated, new title = added; items you don't mention are KEPT. To delete items, list their titles in remove_items."
        ),
      remove_items: z
        .array(z.string())
        .optional()
        .describe("Titles of items to delete from an existing group."),
    }),
  projects: projectSchema.omit({ id: true }).partial().extend(upsertExtra),
  languages: languageSchema.omit({ id: true }).partial().extend(upsertExtra),
} as const;

const norm = (title: string) => title.trim().toLocaleLowerCase();

const upsert = (
  state: State,
  section: SectionKey,
  input: Record<string, unknown>
) => {
  const { id, position, ...fields } = input as {
    id?: string;
    position?: number;
  } & Record<string, unknown>;
  const list = state.cv[section] as { id: string }[];
  if (id) {
    const i = list.findIndex((x) => x.id === id);
    if (i === -1) {
      return { ok: false, error: `No ${section} item with id ${id}` };
    }
    if (section === "skills") {
      // Skill groups merge their items by title, so updating one line
      // (e.g. languages) can never wipe the others.
      const group = list[i] as unknown as {
        items: { id: string; title: string; text: string }[];
      };
      const remove = new Set(
        ((fields.remove_items as string[] | undefined) ?? []).map(norm)
      );
      let items = group.items.filter((x) => !remove.has(norm(x.title)));
      for (const next of (fields.items as
        | { title: string; text: string }[]
        | undefined) ?? []) {
        const at = items.findIndex((x) => norm(x.title) === norm(next.title));
        items =
          at === -1
            ? [...items, { id: newId(), ...next }]
            : items.map((x, j) => (j === at ? { ...x, ...next } : x));
      }
      fields.items = items;
      fields.remove_items = undefined;
    } else if (Array.isArray(fields.items)) {
      fields.items = (fields.items as object[]).map((x) => ({
        id: newId(),
        ...x,
      }));
    }
    list[i] = { ...list[i], ...fields };
    return { ok: true, id };
  }
  if (Array.isArray(fields.items)) {
    fields.items = (fields.items as object[]).map((x) => ({
      id: newId(),
      ...x,
    }));
  }
  const item = { ...EMPTY_ITEM[section](), ...fields };
  list.splice(Math.max(0, Math.min(position ?? 0, list.length)), 0, item);
  return { ok: true, id: item.id };
};

const customItemInput = customItemSchema
  .omit({ id: true })
  .partial()
  .extend({
    ...upsertExtra,
    section_id: z.string().describe("Id of the custom section."),
  });

const findCustom = (state: State, id: string) =>
  state.cv.custom.find((s) => s.id === id);

const upsertCustomItem = (
  state: State,
  input: z.infer<typeof customItemInput>
) => {
  const { section_id, id, position, ...fields } = input;
  const section = findCustom(state, section_id);
  if (!section) {
    return { ok: false, error: `No custom section with id ${section_id}` };
  }
  if (id) {
    const i = section.items.findIndex((x) => x.id === id);
    if (i === -1) {
      return { ok: false, error: `No item with id ${id} in ${section_id}` };
    }
    section.items[i] = { ...section.items[i], ...fields };
    return { ok: true, id };
  }
  const item = { ...emptyCustomItem(), ...fields };
  const at = Math.max(
    0,
    Math.min(position ?? section.items.length, section.items.length)
  );
  section.items.splice(at, 0, item);
  return { ok: true, id: item.id };
};

export const createCvTools = (
  state: State,
  onChange: () => void,
  model?: LanguageModel,
  onTranslateUsage?: (usage: TranslateUsage) => void
) => {
  const changed = <T>(result: T) => {
    onChange();
    return result;
  };

  const upsertTool = (section: SectionKey, what: string) =>
    tool({
      description: `Add a new ${what} or change an existing one (pass its id). Only the fields you pass are changed.`,
      inputSchema: UPSERT_INPUTS[section] as unknown as z.ZodType<
        Record<string, unknown>
      >,
      execute: (input: Record<string, unknown>) =>
        changed(upsert(state, section, input)),
    });

  return {
    update_basics: tool({
      description:
        "Change the header of the CV: name, headline, contact details, summary, links, and the photo (useAccountPhoto puts the signed-in account's picture on the CV). Only the fields you pass are changed. Passing links replaces the whole list.",
      inputSchema: z.object({
        name: z.string().optional(),
        headline: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        website: z.string().optional(),
        summary: z.string().optional(),
        links: z
          .array(z.object({ label: z.string(), url: z.string() }))
          .optional(),
        useAccountPhoto: z.boolean().optional(),
      }),
      execute: ({ links, useAccountPhoto, ...rest }) => {
        state.cv.basics = { ...state.cv.basics, ...rest };
        if (useAccountPhoto && state.account?.image) {
          state.cv.basics.photo = state.account.image;
        }
        if (links) {
          state.cv.basics.links = links.map((l) => ({ id: newId(), ...l }));
        }
        return changed({ ok: true });
      },
    }),
    set_section_titles: tool({
      description:
        'Rename section headings, e.g. to match the CV language ("Berufserfahrung", "Ausbildung"). Only the titles you pass change.',
      inputSchema: z.object({
        profile: z.string().optional(),
        experience: z.string().optional(),
        education: z.string().optional(),
        skills: z.string().optional(),
        projects: z.string().optional(),
        languages: z.string().optional(),
      }),
      execute: (labels) => {
        state.cv.labels = { ...state.cv.labels, ...labels };
        return changed({ ok: true });
      },
    }),
    upsert_experience: upsertTool("experience", "job / work experience entry"),
    upsert_education: upsertTool("education", "education entry"),
    upsert_skill_group: upsertTool("skills", "skill group (name + keywords)"),
    upsert_project: upsertTool("projects", "project"),
    upsert_language: upsertTool("languages", "language"),
    add_custom_section: tool({
      description:
        'Add a section the built-in ones don\'t cover, e.g. "Awards", "Volunteering", "Publications", "Certifications". It is added at the end with no entries; fill it with upsert_custom_item. Returns its id.',
      inputSchema: z.object({ title: z.string() }),
      execute: ({ title }) => {
        const section = { ...emptyCustomSection(title), items: [] };
        state.cv = addCustomSection(state.cv, section);
        return changed({ ok: true, id: section.id });
      },
    }),
    rename_custom_section: tool({
      description: "Change the heading of a custom section.",
      inputSchema: z.object({ id: z.string(), title: z.string() }),
      execute: ({ id, title }) => {
        const section = findCustom(state, id);
        if (!section) {
          return { ok: false, error: `No custom section with id ${id}` };
        }
        section.title = title;
        return changed({ ok: true });
      },
    }),
    remove_custom_section: tool({
      description: "Delete a custom section and all its entries.",
      inputSchema: z.object({ id: z.string() }),
      execute: ({ id }) => {
        if (!findCustom(state, id)) {
          return { ok: false, error: `No custom section with id ${id}` };
        }
        state.cv = removeCustomSection(state.cv, customKey(id));
        return changed({ ok: true });
      },
    }),
    upsert_custom_item: tool({
      description:
        "Add an entry to a custom section or change one (pass its id). Entries have a title, optional subtitle (e.g. issuer or organisation), date (free text), location, description and bullet highlights. Only the fields you pass change; passing highlights replaces the list. New entries go to the end unless position is given.",
      inputSchema: customItemInput,
      execute: (input) => {
        const result = upsertCustomItem(state, input);
        return result.ok ? changed(result) : result;
      },
    }),
    remove_custom_item: tool({
      description: "Remove one entry from a custom section.",
      inputSchema: z.object({ section_id: z.string(), id: z.string() }),
      execute: ({ section_id, id }) => {
        const section = findCustom(state, section_id);
        const before = section?.items.length ?? 0;
        if (section) {
          section.items = section.items.filter((x) => x.id !== id);
        }
        if (!section || section.items.length === before) {
          return { ok: false, error: `No item with id ${id} in ${section_id}` };
        }
        return changed({ ok: true });
      },
    }),
    remove_item: tool({
      description: "Remove one item from a section by id.",
      inputSchema: z.object({ section: z.enum(SECTION_KEYS), id: z.string() }),
      execute: ({ section, id }) => {
        const list = state.cv[section] as { id: string }[];
        const before = list.length;
        (state.cv[section] as { id: string }[]) = list.filter(
          (x) => x.id !== id
        );
        if (state.cv[section].length === before) {
          return { ok: false, error: `No ${section} item with id ${id}` };
        }
        return changed({ ok: true });
      },
    }),
    reorder_items: tool({
      description:
        "Reorder the items in a section. Pass every id of that section in the new order.",
      inputSchema: z.object({
        section: z.enum(SECTION_KEYS),
        ids: z.array(z.string()),
      }),
      execute: ({ section, ids }) => {
        const list = state.cv[section] as { id: string }[];
        const byId = new Map(list.map((x) => [x.id, x]));
        const next = ids.map((i) => byId.get(i)).filter(Boolean) as {
          id: string;
        }[];
        for (const x of list) {
          if (!ids.includes(x.id)) {
            next.push(x);
          }
        }
        (state.cv[section] as { id: string }[]) = next;
        return changed({ ok: true });
      },
    }),
    set_section_order: tool({
      description:
        'Change the order sections appear in on the CV. Use the built-in keys and "custom:<id>" for custom sections.',
      inputSchema: z.object({ order: z.array(z.string()) }),
      execute: ({ order }) => {
        const valid = new Set<string>([
          ...SECTION_KEYS,
          ...state.cv.custom.map((s) => customKey(s.id)),
        ]);
        const next = [...new Set(order)].filter((k): k is OrderKey =>
          valid.has(k)
        );
        for (const k of state.cv.sectionOrder) {
          if (!next.includes(k)) {
            next.push(k);
          }
        }
        state.cv.sectionOrder = next;
        return changed({ ok: true });
      },
    }),
    set_style: tool({
      description:
        "Change the look: font, accent colour (hex), paper size, page margins in px, or typography (text size, line height, letter spacing, heading size and weight). Only the fields you pass change.",
      inputSchema: z.object({
        font: z
          .enum(FONTS.map((f) => f.id) as [string, ...string[]])
          .optional(),
        accent: z.string().regex(HEX_COLOUR).optional(),
        paper: z.enum(PAPERS).optional(),
        padX: z.number().min(0).max(96).optional(),
        padTop: z.number().min(0).max(96).optional(),
        padBottom: z.number().min(0).max(96).optional(),
        fontScale: z
          .number()
          .min(0.8)
          .max(1.3)
          .optional()
          .describe("Text size multiplier; 1 is the template's size."),
        lineHeight: z
          .number()
          .min(0.8)
          .max(1.5)
          .optional()
          .describe("Line height multiplier; 1 is the template's."),
        letterSpacing: z
          .number()
          .min(-0.05)
          .max(0.1)
          .optional()
          .describe("Extra letter spacing in em; 0 is the template's."),
        headingScale: z
          .number()
          .min(0.7)
          .max(1.5)
          .optional()
          .describe("Size multiplier for the name and section headings."),
        headingWeight: z
          .union([
            z.literal(400),
            z.literal(500),
            z.literal(600),
            z.literal(700),
          ])
          .nullable()
          .optional()
          .describe("Weight of the name and section headings; null resets it."),
      }),
      execute: ({ headingWeight, ...patch }) => {
        state.cv.style = { ...state.cv.style, ...patch };
        if (headingWeight !== undefined) {
          state.cv.style.headingWeight = headingWeight ?? undefined;
        }
        return changed({ ok: true });
      },
    }),
    set_template: tool({
      description: "Switch the visual template of the CV.",
      inputSchema: z.object({ template: z.enum(TEMPLATE_IDS) }),
      execute: ({ template }) => {
        state.template = template;
        return changed({ ok: true });
      },
    }),
    read_url: tool({
      description:
        "Read a public web page (the user's website, portfolio, LinkedIn page, a job ad) and get its text and links. Follow its links with read_url when the first page doesn't have enough (About, CV, Experience, Projects).",
      inputSchema: z.object({
        url: z
          .string()
          .describe("Full URL or domain, e.g. https://example.com/about"),
      }),
      execute: async ({ url }) => {
        try {
          return await readUrl(url);
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
    }),
    translate_cv: tool({
      description:
        "Translate the WHOLE CV into another language in one go: every title, description, bullet, date (month names, 'Present'), meta line, skill, section heading and custom section. Use this whenever the user asks to translate the CV (or a language switch of the content); don't translate piece by piece with the other tools. Names of people, companies and schools stay as they are.",
      inputSchema: z.object({
        language: z
          .string()
          .describe('Target language in English, e.g. "Turkish", "German".'),
      }),
      execute: async ({ language }) => {
        if (!model) {
          return { ok: false, error: "Translation is not available." };
        }
        state.cv = await translateCv(
          state.cv,
          language,
          model,
          onTranslateUsage
        );
        return changed({ ok: true, language });
      },
    }),
  };
};
