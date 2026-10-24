#!/usr/bin/env node
/**
 * Writes the example CV in every UI locale: src/lib/cv/samples/<locale>.json,
 * translated and localised (a local name, cities, companies, date style) from
 * src/lib/cv/samples/en.json with the OpenAI API. Structure, ids and **markup**
 * stay the same; section headings come from messages/<locale>.json.
 *
 *   OPENAI_API_KEY=$(secret OPENAI_API_KEY) node scripts/translate-sample.mjs
 *   ... node scripts/translate-sample.mjs de tr        # only these locales
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const KEY = process.env.OPENAI_API_KEY;
const DIR = join(root, "src/lib/cv/samples");

const NAMES = {
  zh: "Simplified Chinese (mainland China)",
  es: "Spanish (Spain)",
  hi: "Hindi (India)",
  ar: "Modern Standard Arabic (e.g. United Arab Emirates or Egypt)",
  pt: "Portuguese (Brazil)",
  bn: "Bengali (Bangladesh)",
  ru: "Russian (Russia)",
  ja: "Japanese (Japan)",
  fr: "French (France)",
  de: "German (Germany)",
  ko: "Korean (South Korea)",
  tr: "Turkish (Türkiye)",
  it: "Italian (Italy)",
  vi: "Vietnamese (Vietnam)",
  id: "Indonesian (Indonesia)",
  pl: "Polish (Poland)",
  nl: "Dutch (Netherlands)",
  uk: "Ukrainian (Ukraine)",
  th: "Thai (Thailand)",
};

const LABEL_KEYS = [
  "profile",
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
];

const STYLE = `You localise the example CV (résumé) of a CV builder website into another language and country.
The input is a JSON object of field paths to English strings. Return a JSON object with exactly the same keys.
Rules:
- The person becomes someone from that country: a typical local first and last name (same gender: a woman); never keep or transliterate "Nora Whitfield", and a matching email ("basics.email") built from the new name on the same kind of personal domain.
- Cities and "location"/"meta" fields: well-known cities of that country, with the country written the local way.
- Companies: replace Monzo (a digital bank / fintech app) and Deliveroo (a food delivery app) with well-known real companies of the same kind from that country; replace the university with a well-known local university with an art or design faculty, and the degree with the local equivalent.
- Dates: month and year in the short form people use on CVs in that language (for example "Mär 2021" in German, "Mart 2021" in Turkish, "2021年3月" in Japanese); "Present" becomes the usual local word for an ongoing job.
- Keep the job titles natural for that market (English titles are fine where locals use them, e.g. "Product Designer" in some languages).
- In "Languages" skills, the person's native language is the local one, plus English and one more relevant language.
- Keep **bold** markers, numbers and percentages; keep tool names (Figma, Framer, HTML & CSS) as they are.
- Natural, plain CV language a native recruiter would expect. Same length and tone as the English.
- Return only the JSON object.`;

/** Every non-empty string field a reader sees, as path → value. */
function flatten(cv) {
  const out = {};
  const put = (path, v) => {
    if (typeof v === "string" && v.trim()) {
      out[path] = v;
    }
  };
  for (const k of ["name", "headline", "email", "location", "summary"]) {
    put(`basics.${k}`, cv.basics[k]);
  }
  const fields = {
    experience: [
      "company",
      "role",
      "location",
      "start",
      "end",
      "meta",
      "description",
    ],
    education: [
      "school",
      "degree",
      "location",
      "start",
      "end",
      "meta",
      "description",
    ],
  };
  for (const [section, keys] of Object.entries(fields)) {
    cv[section].forEach((e, i) => {
      for (const k of keys) {
        put(`${section}.${i}.${k}`, e[k]);
      }
      (e.highlights ?? []).forEach((h, j) => {
        put(`${section}.${i}.highlights.${j}`, h);
      });
    });
  }
  cv.skills.forEach((s, i) => {
    put(`skills.${i}.name`, s.name);
    s.items.forEach((it, j) => {
      put(`skills.${i}.items.${j}.title`, it.title);
      put(`skills.${i}.items.${j}.text`, it.text);
    });
  });
  return out;
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts.slice(0, -1)) {
    cur = cur[p];
  }
  cur[parts.at(-1)] = value;
}

const BOLD = /\*\*/g;

async function localise(locale, entries) {
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
          content: `Target: ${NAMES[locale]} (${locale}).\n\n${JSON.stringify(entries, null, 2)}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(
      `OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`
    );
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function main() {
  if (!KEY) {
    console.error("Set OPENAI_API_KEY.");
    process.exit(1);
  }
  const only = process.argv.slice(2);
  const en = JSON.parse(await readFile(join(DIR, "en.json"), "utf8"));
  const entries = flatten(en);
  const targets = Object.keys(NAMES).filter(
    (l) => only.length === 0 || only.includes(l)
  );
  await Promise.all(
    targets.map(async (locale) => {
      const out = await localise(locale, entries);
      const cv = structuredClone(en);
      cv.language = locale;
      let missing = 0;
      for (const [path, english] of Object.entries(entries)) {
        const v = out[path];
        const ok =
          typeof v === "string" &&
          v.trim() &&
          (english.match(BOLD) ?? []).length === (v.match(BOLD) ?? []).length;
        if (ok) {
          setPath(cv, path, v.trim());
        } else {
          missing += 1;
          console.warn(`[${locale}] ${path}: bad or missing, kept English`);
        }
      }
      const messages = JSON.parse(
        await readFile(join(root, `messages/${locale}.json`), "utf8")
      );
      for (const k of LABEL_KEYS) {
        cv.labels[k] = messages[`cv_label_${k}`] ?? cv.labels[k];
      }
      await writeFile(
        join(DIR, `${locale}.json`),
        `${JSON.stringify(cv, null, 2)}\n`
      );
      console.log(
        `${locale}: done${missing ? ` (${missing} kept English)` : ""}`
      );
    })
  );
}

await main();
