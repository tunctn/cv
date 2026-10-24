import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { cv as cvTable } from "#/db/schema";
import { verifyPrintToken } from "#/lib/server/print-token";

import { normalizeCv } from "./schema";

export const getPrintCv = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    if (!verifyPrintToken(data.id, data.token)) {
      return null;
    }
    const [row] = await db
      .select()
      .from(cvTable)
      .where(eq(cvTable.id, data.id));
    if (!row) {
      return null;
    }
    return { template: row.template, data: normalizeCv(row.data) };
  });
