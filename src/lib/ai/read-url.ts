import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TEXT = 24_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 12_000;

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

function isPrivate(ip: string) {
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
}

/** Only public http(s) hosts: no localhost, private ranges or metadata IPs. */
async function assertPublic(url: URL) {
  if (!(url.protocol === "http:" || url.protocol === "https:")) {
    throw new Error("Only http and https links can be read.");
  }
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivate(a.address))) {
    throw new Error("That address can't be read.");
  }
}

const SCRIPT_STYLE = /<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const BLOCK_END =
  /<\/(p|div|li|h[1-6]|section|article|header|footer|tr|br)>|<br\s*\/?>/gi;
const TAGS = /<[^>]+>/g;
const SPACES = /[ \t\f\v]+/g;
const BLANK_LINES = /\n\s*\n\s*\n+/g;
const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const LINK = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const CF_EMAIL =
  /<[^>]*data-cfemail=["']([0-9a-f]+)["'][^>]*>[\s\S]*?<\/[^>]+>/gi;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(Number.parseInt(n, 16))
    )
    .replace(/&[a-z]+;|&#39;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e);
}

/** Cloudflare hides e-mail addresses as XOR-encoded hex; decode them. */
function decodeCfEmail(hex: string) {
  const key = Number.parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    // biome-ignore lint/suspicious/noBitwiseOperators: the encoding is XOR
    out += String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return out;
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(CF_EMAIL, (_, hex: string) => decodeCfEmail(hex))
      .replace(SCRIPT_STYLE, " ")
      .replace(COMMENTS, " ")
      .replace(BLOCK_END, "\n")
      .replace(TAGS, " ")
  )
    .replace(SPACES, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(BLANK_LINES, "\n\n")
    .trim();
}

/**
 * Fetch a public web page and return its readable text and links, so the
 * AI can build a CV from a personal site, a portfolio or a job ad.
 */
export async function readUrl(raw: string) {
  let url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    // Redirects are followed one by one so every hop is checked.
    // biome-ignore lint/performance/noAwaitInLoops: sequential on purpose
    await assertPublic(url);
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; SmileCVBot/1.0; +https://smilecv.com)",
        accept: "text/html,text/plain;q=0.9,*/*;q=0.5",
      },
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    break;
  }
  if (!res?.ok) {
    throw new Error(`The page answered with status ${res?.status ?? "?"}.`);
  }
  const type = res.headers.get("content-type") ?? "";
  if (!(type.includes("html") || type.includes("text"))) {
    throw new Error("That link isn't a web page.");
  }
  const body = (await res.text()).slice(0, MAX_BYTES);
  if (!type.includes("html")) {
    return {
      url: url.href,
      title: "",
      text: body.slice(0, MAX_TEXT),
      links: [],
    };
  }
  const links: { text: string; url: string }[] = [];
  for (const [, href, label] of body.matchAll(LINK)) {
    try {
      const target = new URL(decodeEntities(href), url);
      const text = htmlToText(label).replace(/\s+/g, " ").slice(0, 80);
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
  return {
    url: url.href,
    title: htmlToText(body.match(TITLE)?.[1] ?? ""),
    text: htmlToText(body).slice(0, MAX_TEXT),
    links,
  };
}
