import type { FileUIPart, TextUIPart, UIMessage } from "ai";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/db";
import { cvFile } from "#/db/schema";
import { fileKey, getObject } from "#/lib/server/storage";

/** Chat files live at /api/files/<id>; the size rides along for display. */
export const FILE_PATH = "/api/files/";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;

export const fileUrl = (id: string, size: number) =>
  `${FILE_PATH}${id}?size=${size}`;

export const fileIdOf = (url: string) => {
  if (!url.startsWith(FILE_PATH)) {
    return null;
  }
  return url.slice(FILE_PATH.length).split("?")[0] || null;
};

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const RTF = "application/rtf";

const RTF_CONTROL = /\\[a-z]+-?\d* ?|[{}]|\\'[0-9a-f]{2}/giu;

const RTF_PAR = /\\par[d]?\b/gu;

const rtfToText = (rtf: string) =>
  rtf
    .replaceAll(RTF_PAR, "\n")
    .replaceAll(RTF_CONTROL, "")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();

const TEXT_TYPES = /^(?:text\/|application\/(?:json|xml|csv|markdown|x-yaml))/u;

const forModel = (p: FileUIPart): FileUIPart | TextUIPart => {
  const name = p.filename || "file";
  if (p.mediaType.startsWith("image/") || p.mediaType === "application/pdf") {
    return p;
  }
  if (TEXT_TYPES.test(p.mediaType) && p.url.startsWith("data:")) {
    const base64 = p.url.slice(p.url.indexOf(",") + 1);
    const text = Buffer.from(base64, "base64")
      .toString("utf-8")
      .slice(0, 60_000);
    return { type: "text", text: `Attached file "${name}":\n\n${text}` };
  }
  return {
    type: "text",
    text: `(The user attached "${name}" (${p.mediaType}), which can't be read here. Ask them to paste the text or attach a PDF.)`,
  };
};

const readable = async (p: FileUIPart): Promise<FileUIPart | TextUIPart> => {
  if (p.mediaType === RTF && p.url.startsWith("data:")) {
    const raw = Buffer.from(p.url.slice(p.url.indexOf(",") + 1), "base64");
    return {
      type: "text",
      text: `Attached file "${p.filename || "file"}":\n\n${rtfToText(raw.toString("latin1")).slice(0, 60_000)}`,
    };
  }
  if (p.mediaType !== DOCX || !p.url.startsWith("data:")) {
    return forModel(p);
  }
  const { extractRawText } = await import("mammoth");
  const buffer = Buffer.from(p.url.slice(p.url.indexOf(",") + 1), "base64");
  const { value } = await extractRawText({ buffer });
  return {
    type: "text",
    text: `Attached file "${p.filename || "file"}":\n\n${value.slice(0, 60_000)}`,
  };
};

export const inlineFiles = async (
  messages: UIMessage[],
  userId: string
): Promise<UIMessage[]> => {
  const ids = new Set<string>();
  for (const m of messages) {
    for (const p of m.parts) {
      const id = p.type === "file" ? fileIdOf(p.url) : null;
      if (id) {
        ids.add(id);
      }
    }
  }
  if (ids.size === 0) {
    return messages;
  }
  const rows = await db
    .select({ id: cvFile.id, mediaType: cvFile.mediaType })
    .from(cvFile)
    .where(and(inArray(cvFile.id, [...ids]), eq(cvFile.userId, userId)));
  const data = new Map<string, string>();
  await Promise.all(
    rows.map(async (r) => {
      const object = await getObject(fileKey(r.id));
      if (object) {
        const base64 = Buffer.from(object.body).toString("base64");
        data.set(r.id, `data:${r.mediaType};base64,${base64}`);
      }
    })
  );
  return Promise.all(
    messages.map(async (m) => {
      const parts = await Promise.all(
        m.parts.map(async (p): Promise<UIMessage["parts"]> => {
          if (p.type !== "file") {
            return [p];
          }
          const id = fileIdOf(p.url);
          const url = id ? data.get(id) : p.url;
          return url ? [await readable({ ...p, url })] : [];
        })
      );
      return { ...m, parts: parts.flat() };
    })
  );
};
