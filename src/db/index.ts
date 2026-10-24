import { drizzle } from "drizzle-orm/node-postgres";

import { account, cv, session, user, verification } from "./schema.ts";

export const schema = { user, session, account, verification, cv };

export const db = drizzle(process.env.DATABASE_URL as string, { schema });
