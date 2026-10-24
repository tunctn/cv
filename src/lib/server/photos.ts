import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "#/db";
import { cv as cvTable, cvVersion } from "#/db/schema";
import type { CV } from "#/lib/cv/schema";
import { deleteObjects, photoKey, putObject } from "#/lib/server/storage";

/** CV photos live in R2 by content hash and are served at /api/photos/<hash>. */
export const PHOTO_PATH = "/api/photos/";
/** How versions saved before R2 referenced a photo (same hash, now in R2). */
const LEGACY_REF = "photo:";
const DATA_URL = /^data:(image\/[a-z+.-]+);base64,(.+)$/;
export const PHOTO_HASH = /^[0-9a-f]{40,64}$/;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export async function storePhoto(bytes: Uint8Array, contentType: string) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  await putObject(photoKey(hash), bytes, contentType);
  return `${PHOTO_PATH}${hash}`;
}

export function photoHashOf(photo: string | undefined | null) {
  if (photo?.startsWith(PHOTO_PATH)) {
    return photo.slice(PHOTO_PATH.length).split("?")[0];
  }
  if (photo?.startsWith(LEGACY_REF)) {
    return photo.slice(LEGACY_REF.length);
  }
  return null;
}

/**
 * The CV with its photo as a URL: an inline data URL (older clients) is
 * uploaded to R2, an old version reference is pointed at R2.
 */
export async function externalizePhoto(cv: CV): Promise<CV> {
  const { photo } = cv.basics;
  if (photo.startsWith(LEGACY_REF)) {
    return withPhoto(cv, `${PHOTO_PATH}${photo.slice(LEGACY_REF.length)}`);
  }
  const match = DATA_URL.exec(photo);
  if (!match) {
    return cv;
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    return withPhoto(cv, "");
  }
  return withPhoto(cv, await storePhoto(bytes, match[1]));
}

function withPhoto(cv: CV, photo: string): CV {
  return { ...cv, basics: { ...cv.basics, photo } };
}

/** Photo hashes a set of CVs (and their versions) use. */
export async function photoHashesOf(where: ReturnType<typeof sql>) {
  const rows = await db.execute<{ photo: string | null }>(sql`
    select ${cvTable.data}->'basics'->>'photo' as photo from ${cvTable} where ${where}
    union
    select v.data->'basics'->>'photo' from ${cvVersion} v
      join ${cvTable} on ${cvTable.id} = v.cv_id where ${where}`);
  return [
    ...new Set(
      rows.rows
        .map((r) => photoHashOf(r.photo))
        .filter((h): h is string => Boolean(h))
    ),
  ];
}

/** Removes photos from R2 that no CV or version uses any more. */
export async function deleteUnusedPhotos(hashes: string[]) {
  if (hashes.length === 0) {
    return;
  }
  const used = await db.execute<{ hash: string }>(sql`
    select h as hash from unnest(array[${sql.join(
      hashes.map((h) => sql`${h}`),
      sql`, `
    )}]::text[]) h
    where exists (select 1 from ${cvTable} where ${cvTable.data}->'basics'->>'photo' in (${PHOTO_PATH} || h, ${LEGACY_REF} || h))
       or exists (select 1 from ${cvVersion} where ${cvVersion.data}->'basics'->>'photo' in (${PHOTO_PATH} || h, ${LEGACY_REF} || h))`);
  const keep = new Set(used.rows.map((r) => r.hash));
  await deleteObjects(
    hashes.filter((h) => !keep.has(h)).map((h) => photoKey(h))
  );
}
