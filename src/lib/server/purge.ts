import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db";
import { cvFile, cv as cvTable, user as userTable } from "#/db/schema";
import { deleteUnusedPhotos, photoHashesOf } from "#/lib/server/photos";
import { avatarKey, deleteObjects, fileKey } from "#/lib/server/storage";

export const deleteUserAndFiles = async (userId: string) => {
  const files = await db
    .select({ id: cvFile.id })
    .from(cvFile)
    .where(eq(cvFile.userId, userId));
  const photos = await photoHashesOf(sql`${cvTable.userId} = ${userId}`);
  await db.delete(userTable).where(eq(userTable.id, userId));
  await deleteObjects([...files.map((f) => fileKey(f.id)), avatarKey(userId)]);
  await deleteUnusedPhotos(photos);
};

export const deleteCvAndFiles = async (cvId: string, userId: string) => {
  const [own] = await db
    .select({ id: cvTable.id })
    .from(cvTable)
    .where(and(eq(cvTable.id, cvId), eq(cvTable.userId, userId)));
  if (!own) {
    return;
  }
  const files = await db
    .select({ id: cvFile.id })
    .from(cvFile)
    .where(eq(cvFile.cvId, cvId));
  const photos = await photoHashesOf(sql`${cvTable.id} = ${cvId}`);
  await db.delete(cvTable).where(eq(cvTable.id, cvId));
  await deleteObjects(files.map((f) => fileKey(f.id)));
  await deleteUnusedPhotos(photos);
};
