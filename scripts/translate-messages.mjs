#!/usr/bin/env node
/**
 * Fills missing keys in messages/{locale}.json from messages/en.json using
 * the OpenAI API. Existing translations are kept; only missing keys (or keys
 * passed with --force key1,key2) are translated.
 *
 *   OPENAI_API_KEY=$(secret OPENAI_API_KEY) node scripts/translate-messages.mjs
 *   ... node scripts/translate-messages.mjs de tr        # only these locales
 *   ... node scripts/translate-messages.mjs --force faq_a5,cta_body
 */
import { readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";

const root = nodePath.join(import.meta.dirname, "..");
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const KEY = process.env.OPENAI_API_KEY;

const NAMES = {
  zh: "Simplified Chinese",
  es: "Spanish",
  hi: "Hindi",
  ar: "Arabic",
  pt: "Portuguese (Brazil)",
  bn: "Bengali",
  ru: "Russian",
  ja: "Japanese",
  fr: "French",
  de: "German",
  ko: "Korean",
  tr: "Turkish",
  it: "Italian",
  vi: "Vietnamese",
  id: "Indonesian",
  pl: "Polish",
  nl: "Dutch",
  uk: "Ukrainian",
  th: "Thai",
};

/** Where a short string appears, for keys that are ambiguous on their own. */
const CONTEXT = {
  auth_last_used:
    "small badge on the sign-in option the visitor used last time (like 'Last used' on a login page)",
  common_creating: "button label while a new CV is being created",
  auth_busy: "submit button label while signing in",
  auth_or: "divider between the Google button and the email form",
  features_paper_letter: "the US Letter paper size",
  faq_ask_submit: "send button of the question box",
  footer_editor: "footer link that opens the CV editor",
  cvs_last_edited: "{count} is e.g. '3 CVs', {when} is e.g. '5 min ago'",
  time_hours_ago: "short relative time, e.g. '3 h ago'",
};

const STYLE = `You translate the interface of SmileCV, a CV (résumé) builder website.
Rules:
- Write natural, plain, short copy the way a native product writer would. No hype, no marketing fluff, no exclamation marks that the English doesn't have.
- Keep the length close to the English; buttons and labels stay short.
- Address the reader the way popular consumer web apps in that language do (for example "du" in German, "sen" in Turkish, "vous" in French), and use the same form of address in every string.
- Keep placeholders like {name}, {count}, {email} exactly as they are, untranslated, with the same braces.
- Keep brand and product names as they are: SmileCV, OpenAI, Google, GitHub, LinkedIn, Hetzner, PDF, PNG, AI (you may use the local term for AI if it is the common one), A4, US Letter, and template names Classic, Modern, Studio, Compact, Minimal, Editorial.
- "CV" means a résumé; pick the word people in that language use for it and use that same word everywhere.
- Keep typographic quotes and ellipses (…) in the local style.
- Return only JSON: an object with exactly the same keys and the translated strings as values.`;

const parseArgs = (argv) => {
  const at = argv.indexOf("--force");
  if (at === -1) {
    return { locales: argv, force: [] };
  }
  return {
    locales: [...argv.slice(0, at), ...argv.slice(at + 2)],
    force: (argv[at + 1] ?? "").split(",").filter(Boolean),
  };
};

const readJson = async (path) => {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return {};
  }
};

const translate = async (locale, entries) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: STYLE },
        {
          role: "user",
          content: `Translate these English strings into ${NAMES[locale]} (${locale}).\n\nContext for some keys:\n${JSON.stringify(CONTEXT, null, 2)}\n\nStrings:\n${JSON.stringify(entries, null, 2)}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
};

const placeholders = (s) =>
  [...s.matchAll(/\{[a-zA-Z_]+\}/gu)]
    .map((x) => x[0])
    .toSorted()
    .join(",");

const main = async () => {
  if (!KEY) {
    console.error("Set OPENAI_API_KEY.");
    process.exit(1);
  }
  const { locales: only, force } = parseArgs(process.argv.slice(2));
  const settings = await readJson(
    nodePath.join(root, "project.inlang/settings.json")
  );
  const en = await readJson(nodePath.join(root, "messages/en.json"));
  const keys = Object.keys(en).filter((k) => k !== "$schema");
  const targets = settings.locales.filter(
    (l) => l !== settings.baseLocale && (only.length === 0 || only.includes(l))
  );

  await Promise.all(
    targets.map(async (locale) => {
      const path = nodePath.join(root, `messages/${locale}.json`);
      const current = await readJson(path);
      const missing = keys.filter(
        (k) => typeof current[k] !== "string" || force.includes(k)
      );
      let done = 0;
      // One request per locale keeps terminology consistent across keys.
      const chunk = Object.fromEntries(missing.map((k) => [k, en[k]]));
      const out = missing.length > 0 ? await translate(locale, chunk) : {};
      for (const k of missing) {
        const value = out[k];
        if (typeof value !== "string" || !value.trim()) {
          console.warn(`[${locale}] ${k}: no translation, skipped`);
          continue;
        }
        if (placeholders(value) !== placeholders(en[k])) {
          console.warn(`[${locale}] ${k}: placeholders differ, skipped`);
          continue;
        }
        current[k] = value;
        done += 1;
      }
      // Same key order as en.json; drop keys that no longer exist.
      const ordered = {
        $schema: "https://inlang.com/schema/inlang-message-format",
      };
      for (const k of keys) {
        if (typeof current[k] === "string") {
          ordered[k] = current[k];
        }
      }
      await writeFile(path, `${JSON.stringify(ordered, null, 2)}\n`);
      console.log(`${locale}: ${done}/${missing.length} translated`);
    })
  );
};

await main();
