import { track } from "#/lib/track";
import { m } from "#/paraglide/messages.js";
import { ATTACH_TYPES } from "./attachments";
import { startCv } from "./start-cv";

/** Same limit as /api/upload. */
const MAX_BYTES = 15 * 1024 * 1024;

const TYPES = ATTACH_TYPES;

/** For the file input's `accept`. */
export const IMPORT_ACCEPT = [
  ...Object.keys(TYPES).map((ext) => `.${ext}`),
  ...new Set(Object.values(TYPES)),
].join(",");

/** The file's type from its extension (browsers often leave .docx/.md untyped). */
function mediaTypeOf(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return (
    TYPES[ext] ?? (Object.values(TYPES).includes(file.type) ? file.type : null)
  );
}

/**
 * Starts a new CV from an existing file: creates the CV, uploads the file to
 * it and returns where to go. The editor then hands the file to the AI.
 */
export async function importCv(file: File) {
  const type = mediaTypeOf(file);
  const kind = file.name.split(".").pop()?.toLowerCase() || "unknown";
  track("import_started", { type: kind });
  const fail = (reason: string, message: string) => {
    track("import_failed", { type: kind, reason });
    return new Error(message);
  };
  if (!type) {
    throw fail("unsupported", m.import_unsupported());
  }
  if (file.size > MAX_BYTES) {
    throw fail("too_large", m.import_too_large());
  }
  const { id } = await startCv({ from: "import" });
  const form = new FormData();
  form.append("file", new File([file], file.name, { type }));
  form.append("cvId", id);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    throw fail(`upload_${res.status}`, m.import_failed());
  }
  const { url } = (await res.json()) as { url: string };
  track("import_succeeded", { type: kind });
  return { id, search: { import: url, name: file.name, type } };
}
