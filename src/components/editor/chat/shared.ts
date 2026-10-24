import type { FileUIPart } from "ai";
import { withAttachType } from "#/lib/attachments";
import { m } from "#/paraglide/messages.js";

/** Marks the hidden text part that carries the CV parts a user pointed at. */
export const CONTEXT_MARK = "[[cv-context]]";

export interface ChatContext {
  fields: { path: string; text: string }[];
  id: string;
  /** PNG data URL from the clip tool. */
  image?: string | null;
  label: string;
}

/** Message functions, called at render so each request gets its locale. */
export const TOOL_LABELS: Record<string, () => string> = {
  translate_cv: m.chat_tool_translate_cv,
  read_url: m.chat_tool_read_url,
  update_basics: m.chat_tool_update_basics,
  set_section_titles: m.chat_tool_set_section_titles,
  upsert_experience: m.chat_tool_upsert_experience,
  upsert_education: m.chat_tool_upsert_education,
  upsert_skill_group: m.chat_tool_upsert_skill_group,
  upsert_project: m.chat_tool_upsert_project,
  upsert_language: m.chat_tool_upsert_language,
  remove_item: m.chat_tool_remove_item,
  add_custom_section: m.chat_tool_add_custom_section,
  rename_custom_section: m.chat_tool_rename_custom_section,
  remove_custom_section: m.chat_tool_remove_custom_section,
  upsert_custom_item: m.chat_tool_upsert_custom_item,
  remove_custom_item: m.chat_tool_remove_item,
  reorder_items: m.chat_tool_reorder_items,
  set_section_order: m.chat_tool_set_section_order,
  set_template: m.chat_tool_set_template,
  set_style: m.chat_tool_set_style,
};

export const SUGGESTIONS: (() => string)[] = [
  m.chat_suggest_fill,
  m.chat_suggest_bullets,
  m.chat_suggest_summary,
  m.chat_suggest_tailor,
];

export function contextText(contexts: ChatContext[]) {
  return `${CONTEXT_MARK}\n${JSON.stringify(
    contexts.map((c) => ({ label: c.label, fields: c.fields }))
  )}`;
}

export interface ContextSummary {
  fields: { path: string; text: string }[];
  label: string;
}

export function parseContexts(text: string): ContextSummary[] {
  try {
    return JSON.parse(text.slice(CONTEXT_MARK.length)) as ContextSummary[];
  } catch {
    return [];
  }
}

/** Approximate byte size of a data URL's payload, for "PDF · 74 KB". */
export function dataUrlBytes(url: string) {
  const i = url.indexOf(",");
  return i === -1 ? 0 : Math.floor(((url.length - i - 1) * 3) / 4);
}

export function formatBytes(n: number) {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${Math.round(n / 1024)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function contextLabels(text: string) {
  try {
    return (
      JSON.parse(text.slice(CONTEXT_MARK.length)) as { label: string }[]
    ).map((c) => c.label);
  } catch {
    return [];
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Upload attached files; the message keeps a link, not the bytes. */
export function toFileParts(
  files: File[],
  cvId: string
): Promise<FileUIPart[]> {
  return Promise.all(
    files.map(async (f) => {
      const form = new FormData();
      form.set("file", withAttachType(f));
      form.set("cvId", cvId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      // If the upload fails, fall back to sending the file inline.
      const url = res.ok
        ? ((await res.json()) as { url: string }).url
        : await readAsDataUrl(f);
      return {
        type: "file" as const,
        mediaType: f.type || "application/octet-stream",
        filename: f.name,
        url,
      };
    })
  );
}

/** Size in bytes of a file part, from a data URL or our `?size=` link. */
export function filePartBytes(url: string): number | null {
  if (url.startsWith("data:")) {
    return dataUrlBytes(url);
  }
  const size = Number(new URL(url, "http://x").searchParams.get("size"));
  return Number.isFinite(size) && size > 0 ? size : null;
}
