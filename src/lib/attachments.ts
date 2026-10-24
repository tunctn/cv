/**
 * Files people can attach in the chat or import as a CV. Images and PDFs go
 * to the model as files; the rest is turned into text on the server.
 */
export const ATTACH_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  html: "text/html",
  htm: "text/html",
  xml: "application/xml",
  yaml: "application/x-yaml",
  yml: "application/x-yaml",
  rtf: "application/rtf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const KNOWN = new Set(Object.values(ATTACH_TYPES));

/** For a file input's `accept`. */
export const ATTACH_ACCEPT = [
  ...Object.keys(ATTACH_TYPES).map((ext) => `.${ext}`),
  ...KNOWN,
].join(",");

/**
 * The file's type, from the browser or else its extension (browsers often
 * leave .md, .csv or .yaml without one). Null if we can't use it.
 */
export function attachType(file: File): string | null {
  if (KNOWN.has(file.type)) {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ATTACH_TYPES[ext] ?? null;
}

/** The same file with its type filled in, so the server reads it right. */
export function withAttachType(file: File): File {
  const type = attachType(file);
  return type && type !== file.type
    ? new File([file], file.name, { type, lastModified: file.lastModified })
    : file;
}
