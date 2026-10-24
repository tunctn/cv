import { createServerFn } from "@tanstack/react-start";
import { count } from "drizzle-orm";

import { db } from "#/db";
import { cv } from "#/db/schema";

const TTL = 60_000;
let cache: { cvs: number; at: number } | null = null;

/** How many CVs exist, counted from the database and cached for a minute. */
export const getCvCount = createServerFn({ method: "GET" }).handler(
  async () => {
    if (cache && Date.now() - cache.at < TTL) {
      return cache.cvs;
    }
    try {
      const [row] = await db.select({ n: count() }).from(cv);
      cache = { cvs: row?.n ?? 0, at: Date.now() };
      return cache.cvs;
    } catch {
      return cache?.cvs ?? null;
    }
  }
);
