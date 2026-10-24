/* oxlint-disable no-await-in-loop -- one object at a time keeps memory flat on a one-off copy */
// One-off: moves uploads stored in Postgres (base64) to the R2 bucket.
// Idempotent. Needs DATABASE_URL and the R2_* env vars.
//
//   node scripts/migrate-files-to-r2.mjs            copy bytes only (safe before deploy)
//   node scripts/migrate-files-to-r2.mjs --rewrite  also point CVs and versions at /api/photos/
//   node scripts/migrate-files-to-r2.mjs --verify   check every row has its object in R2
import { createHash } from "node:crypto";

import { AwsClient } from "aws4fetch";
import { Client } from "pg";

const rewrite = process.argv.includes("--rewrite");

const verify = process.argv.includes("--verify");

const env = (k) => {
  if (!process.env[k]) {
    throw new Error(`${k} missing`);
  }
  return process.env[k];
};

const aws = new AwsClient({
  accessKeyId: env("R2_ACCESS_KEY_ID"),
  secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  service: "s3",
  region: "auto",
});

const base = `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}/`;

const db = new Client({ connectionString: env("DATABASE_URL") });

await db.connect();

const put = async (key, bytes, type) => {
  const res = await aws.fetch(base + key, {
    method: "PUT",
    body: bytes,
    headers: { "content-type": type },
  });
  if (!res.ok) {
    throw new Error(`put ${key}: ${res.status} ${await res.text()}`);
  }
};

const size = async (key) => {
  const res = await aws.fetch(base + key, { method: "HEAD" });
  return res.ok ? Number(res.headers.get("content-length")) : -1;
};

const DATA_URL = /^data:(?<type>image\/[a-z+.-]+);base64,(?<data>.+)$/su;

const stats = {};

const count = (k) => {
  stats[k] = (stats[k] ?? 0) + 1;
};

// Chat files.
const files = await db.query(
  "select id, media_type, size, data from cv_file where data is not null"
);

for (const f of files.rows) {
  const bytes = Buffer.from(f.data, "base64");
  if ((await size(`files/${f.id}`)) === bytes.byteLength) {
    count("files already there");
  } else {
    await put(`files/${f.id}`, bytes, f.media_type);
    count("files copied");
  }
}

// Profile pictures.
const avatars = await db.query(
  "select user_id, media_type, data from user_avatar where data is not null"
);

for (const a of avatars.rows) {
  await put(
    `avatars/${a.user_id}`,
    Buffer.from(a.data, "base64"),
    a.media_type
  );
  count("avatars copied");
}

// Photos versions referenced by hash (photo:<sha1 of the data URL>).
const photos = await db.query("select hash, data from cv_photo");

if (verify) {
  const filesCheck = await db.query("select id, size from cv_file");
  for (const f of filesCheck.rows) {
    count(
      (await size(`files/${f.id}`)) === f.size ? "file ok" : "FILE MISSING"
    );
  }
  const avatarsCheck = await db.query("select user_id from user_avatar");
  for (const a of avatarsCheck.rows) {
    count(
      (await size(`avatars/${a.user_id}`)) > 0 ? "avatar ok" : "AVATAR MISSING"
    );
  }
  const photosCheck = await db.query(`
    select distinct regexp_replace(p, '^(/api/photos/|photo:)', '') as hash from (
      select data->'basics'->>'photo' as p from cv
      union select data->'basics'->>'photo' from cv_version) x
    where p like '/api/photos/%' or p like 'photo:%'`);
  for (const p of photosCheck.rows) {
    count((await size(`photos/${p.hash}`)) > 0 ? "photo ok" : "PHOTO MISSING");
  }
  const inline = await db.query(
    "select count(*)::int n from cv where data->'basics'->>'photo' like 'data:%'"
  );
  stats["cv inline photos left"] = inline.rows[0].n;
  console.log(stats);
  await db.end();
  process.exit(0);
}

for (const p of photos.rows) {
  const match = DATA_URL.exec(p.data);
  if (!match) {
    // A URL (Google or account picture) was stored here; versions get it back.
    if (rewrite) {
      const res = await db.query(
        `update cv_version set data = jsonb_set(data, '{basics,photo}', to_jsonb($2::text))
         where data->'basics'->>'photo' in ('photo:' || $1, '/api/photos/' || $1)`,
        [p.hash, p.data]
      );
      stats["versions given back their photo URL"] =
        (stats["versions given back their photo URL"] ?? 0) + res.rowCount;
    }
    continue;
  }
  if ((await size(`photos/${p.hash}`)) < 0) {
    await put(
      `photos/${p.hash}`,
      Buffer.from(match.groups.data, "base64"),
      match.groups.type
    );
    count("version photos copied");
  } else {
    count("version photos already there");
  }
}

// Photos inline in CVs (and any in versions): stored by sha256 of the bytes,
// like new uploads.
const inlinePhotos = async (table) => {
  const rows = await db.query(
    `select id, data->'basics'->>'photo' as photo from ${table} where data->'basics'->>'photo' like 'data:%'`
  );
  for (const r of rows.rows) {
    const match = DATA_URL.exec(r.photo);
    if (!match) {
      count(`${table} odd inline photo (skipped)`);
      continue;
    }
    const bytes = Buffer.from(match.groups.data, "base64");
    const hash = createHash("sha256").update(bytes).digest("hex");
    if ((await size(`photos/${hash}`)) < 0) {
      await put(`photos/${hash}`, bytes, match.groups.type);
    }
    count(`${table} inline photos copied`);
    if (rewrite) {
      await db.query(
        `update ${table} set data = jsonb_set(data, '{basics,photo}', to_jsonb($2::text)) where id = $1 and data->'basics'->>'photo' = $3`,
        [r.id, `/api/photos/${hash}`, r.photo]
      );
      count(`${table} inline photos rewritten`);
    }
  }
};

await inlinePhotos("cv");

await inlinePhotos("cv_version");

if (rewrite) {
  const res = await db.query(`
    update cv_version
    set data = jsonb_set(data, '{basics,photo}',
      to_jsonb('/api/photos/' || substr(data->'basics'->>'photo', 7)))
    where data->'basics'->>'photo' like 'photo:%'`);
  stats["version refs rewritten"] = res.rowCount;
}

console.log(stats);

await db.end();
