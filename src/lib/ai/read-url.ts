import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TEXT = 24_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 12_000;

const PRIVATE_V4 = [
  /^0\./u,
  /^10\./u,
  /^127\./u,
  /^169\.254\./u,
  /^172\.(?:1[6-9]|2\d|3[01])\./u,
  /^192\.168\./u,
  /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./u,
];

const isPrivate = (ip: string) => {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return (
      v === "::1" ||
      v.startsWith("fc") ||
      v.startsWith("fd") ||
      v.startsWith("fe80") ||
      v.startsWith("::ffff:") ||
      v === "::"
    );
  }
  return PRIVATE_V4.some((r) => r.test(ip));
};

const assertPublic = async (url: URL) => {
  if (!(url.protocol === "http:" || url.protocol === "https:")) {
    throw new Error("Only http and https links can be read.");
  }
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivate(a.address))) {
    throw new Error("That address can't be read.");
  }
};

const SCRIPT_STYLE =
  /<(?<tag>script|style|noscript|svg|template)\b[\s\S]*?<\/\k<tag>>/giu;
const COMMENTS = /<!--[\s\S]*?-->/gu;
const BLOCK_END =
  /<\/(?:p|div|li|h[1-6]|section|article|header|footer|tr|br)>|<br\s*\/?>/giu;
const TAGS = /<[^>]+>/gu;
const SPACES = /[ \t\f\v]+/gu;
const BLANK_LINES = /\n\s*\n\s*\n+/gu;
const TITLE = /<title[^>]*>(?<title>[\s\S]*?)<\/title>/iu;
const LINK =
  /<a\b[^>]*href=["'](?<href>[^"']+)["'][^>]*>(?<label>[\s\S]*?)<\/a>/giu;
const CF_EMAIL =
  /<[^>]*data-cfemail=["'](?<hex>[0-9a-f]+)["'][^>]*>[\s\S]*?<\/[^>]+>/giu;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

const decodeEntities = (s: string) =>
  s
    .replaceAll(/&#(?<dec>\d+);/gu, (_, n) => String.fromCodePoint(Number(n)))
    .replaceAll(/&#x(?<hex>[0-9a-f]+);/giu, (_, n) =>
      String.fromCodePoint(Number.parseInt(n, 16))
    )
    .replaceAll(/&[a-z]+;|&#39;/giu, (e) => ENTITIES[e.toLowerCase()] ?? e);

const decodeCfEmail = (hex: string) => {
  const key = Number.parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    // oxlint-disable-next-line no-bitwise -- the encoding is XOR
    out += String.fromCodePoint(Number.parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out;
};

const htmlToText = (html: string) =>
  decodeEntities(
    html
      .replaceAll(CF_EMAIL, (_, hex: string) => decodeCfEmail(hex))
      .replaceAll(SCRIPT_STYLE, " ")
      .replaceAll(COMMENTS, " ")
      .replaceAll(BLOCK_END, "\n")
      .replaceAll(TAGS, " ")
  )
    .replaceAll(SPACES, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replaceAll(BLANK_LINES, "\n\n")
    .trim();

/** Fetch `url`, following redirects one by one so every hop is checked. */
const fetchChecked = async (
  url: URL,
  hop = 0
): Promise<{ res: Response; url: URL }> => {
  await assertPublic(url);
  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; SmileCVBot/1.0; +https://smilecv.com)",
      accept: "text/html,text/plain;q=0.9,*/*;q=0.5",
    },
  });
  const next = res.headers.get("location");
  if (hop < MAX_REDIRECTS && res.status >= 300 && res.status < 400 && next) {
    return fetchChecked(new URL(next, url), hop + 1);
  }
  return { res, url };
};

const pageLinks = (body: string, base: URL) => {
  const links: { text: string; url: string }[] = [];
  for (const { groups } of body.matchAll(LINK)) {
    const { href = "", label = "" } = groups ?? {};
    try {
      const target = new URL(decodeEntities(href), base);
      const text = htmlToText(label).replaceAll(/\s+/gu, " ").slice(0, 80);
      if (target.protocol.startsWith("http") && text) {
        links.push({ text, url: target.href });
      }
    } catch {
      // skip malformed links
    }
    if (links.length >= 60) {
      break;
    }
  }
  return links;
};

export const readUrl = async (raw: string) => {
  const { res, url } = await fetchChecked(
    new URL(raw.startsWith("http") ? raw : `https://${raw}`)
  );
  if (!res.ok) {
    throw new Error(`The page answered with status ${res.status}.`);
  }
  const type = res.headers.get("content-type") ?? "";
  if (!(type.includes("html") || type.includes("text"))) {
    throw new Error("That link isn't a web page.");
  }
  const content = await res.text();
  const body = content.slice(0, MAX_BYTES);
  if (!type.includes("html")) {
    return {
      url: url.href,
      title: "",
      text: body.slice(0, MAX_TEXT),
      links: [],
    };
  }
  return {
    url: url.href,
    title: htmlToText(TITLE.exec(body)?.groups?.title ?? ""),
    text: htmlToText(body).slice(0, MAX_TEXT),
    links: pageLinks(body, url),
  };
};
