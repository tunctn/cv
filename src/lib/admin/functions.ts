import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createEmailVerificationToken } from "better-auth/api";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import {
  account,
  aiUsage,
  cvFile,
  cv as cvTable,
  session as sessionTable,
  user as userTable,
} from "#/db/schema";
import { auth } from "#/lib/auth";
import { normalizeCv } from "#/lib/cv/schema";
import { adminEmails, adminFromHeaders } from "#/lib/server/admin-guard";
import { sendAccountEmail } from "#/lib/server/email";
import { deleteUserAndFiles } from "#/lib/server/purge";
import { m } from "#/paraglide/messages.js";

const PAGE = 50;
const DAY = 24 * 60 * 60 * 1000;

/** Every admin server function starts here. */
async function requireAdmin() {
  const admin = await adminFromHeaders(getRequestHeaders());
  if (!admin) {
    throw new Error(m.admin_forbidden());
  }
  return admin;
}

const num = (v: unknown) => Number(v ?? 0) || 0;
const iso = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString() : null;

/** Whether the visitor may open /admin (used by the route guard). */
export const getAdminAccess = createServerFn({ method: "GET" }).handler(
  async () => {
    const admin = await adminFromHeaders(getRequestHeaders());
    return admin ? { email: admin.email } : null;
  }
);

/** Numbers for the overview: people, CVs, AI spend, and 30 days of cost. */
export const getAdminOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();
    const now = Date.now();
    const d7 = new Date(now - 7 * DAY);
    const d30 = new Date(now - 30 * DAY);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [users] = await db
      .select({
        total: count(),
        guests: sql<number>`count(*) filter (where ${userTable.isAnonymous})`,
        new7: sql<number>`count(*) filter (where ${userTable.createdAt} >= ${d7})`,
        newRegistered7: sql<number>`count(*) filter (where ${userTable.createdAt} >= ${d7} and not coalesce(${userTable.isAnonymous}, false))`,
        banned: sql<number>`count(*) filter (where ${userTable.banned})`,
      })
      .from(userTable);
    const [active] = await db
      .select({
        n: sql<number>`count(distinct ${sessionTable.userId})`,
      })
      .from(sessionTable)
      .where(gte(sessionTable.updatedAt, d7));
    const [cvs] = await db
      .select({
        total: count(),
        new7: sql<number>`count(*) filter (where ${cvTable.createdAt} >= ${d7})`,
        shared: sql<number>`count(*) filter (where ${cvTable.shareId} is not null)`,
      })
      .from(cvTable);
    const [files] = await db
      .select({
        total: count(),
        bytes: sql<number>`coalesce(sum(${cvFile.size}), 0)`,
      })
      .from(cvFile);
    const [ai] = await db
      .select({
        chats: sql<number>`count(*) filter (where ${aiUsage.kind} = 'chat')`,
        chats7: sql<number>`count(*) filter (where ${aiUsage.kind} = 'chat' and ${aiUsage.createdAt} >= ${d7})`,
        errors7: sql<number>`count(*) filter (where ${aiUsage.error} is not null and ${aiUsage.createdAt} >= ${d7})`,
        costToday: sql<number>`coalesce(sum(${aiUsage.costUsd}) filter (where ${aiUsage.createdAt} >= ${today}), 0)`,
        cost7: sql<number>`coalesce(sum(${aiUsage.costUsd}) filter (where ${aiUsage.createdAt} >= ${d7}), 0)`,
        cost30: sql<number>`coalesce(sum(${aiUsage.costUsd}) filter (where ${aiUsage.createdAt} >= ${d30}), 0)`,
        costAll: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`,
        searches30: sql<number>`coalesce(sum(${aiUsage.webSearches}) filter (where ${aiUsage.createdAt} >= ${d30}), 0)`,
      })
      .from(aiUsage);

    const dayExpr = sql<string>`to_char(date_trunc('day', ${aiUsage.createdAt}), 'YYYY-MM-DD')`;
    const daily = await db
      .select({
        day: dayExpr,
        kind: aiUsage.kind,
        cost: sql<number>`sum(${aiUsage.costUsd})`,
        requests: count(),
      })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, d30))
      .groupBy(dayExpr, aiUsage.kind);
    const signupDay = sql<string>`to_char(date_trunc('day', ${userTable.createdAt}), 'YYYY-MM-DD')`;
    const signups = await db
      .select({
        day: signupDay,
        guests: sql<number>`count(*) filter (where ${userTable.isAnonymous})`,
        registered: sql<number>`count(*) filter (where not coalesce(${userTable.isAnonymous}, false))`,
      })
      .from(userTable)
      .where(gte(userTable.createdAt, d30))
      .groupBy(signupDay);

    const days: {
      day: string;
      chat: number;
      translate: number;
      faq: number;
      requests: number;
      guests: number;
      registered: number;
    }[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now - i * DAY).toISOString().slice(0, 10);
      days.push({
        day: d,
        chat: 0,
        translate: 0,
        faq: 0,
        requests: 0,
        guests: 0,
        registered: 0,
      });
    }
    const byDay = new Map(days.map((d) => [d.day, d]));
    for (const row of daily) {
      const d = byDay.get(row.day);
      if (d) {
        const k = row.kind as "chat" | "translate" | "faq";
        if (k in d) {
          d[k] += num(row.cost);
        }
        d.requests += num(row.requests);
      }
    }
    for (const row of signups) {
      const d = byDay.get(row.day);
      if (d) {
        d.guests = num(row.guests);
        d.registered = num(row.registered);
      }
    }

    const topSpenders = await db
      .select({
        userId: aiUsage.userId,
        name: userTable.name,
        email: userTable.email,
        isAnonymous: userTable.isAnonymous,
        cost: sql<number>`sum(${aiUsage.costUsd})`,
        requests: count(),
      })
      .from(aiUsage)
      .leftJoin(userTable, eq(userTable.id, aiUsage.userId))
      .where(and(gte(aiUsage.createdAt, d30), isNotNull(aiUsage.userId)))
      .groupBy(
        aiUsage.userId,
        userTable.name,
        userTable.email,
        userTable.isAnonymous
      )
      .orderBy(desc(sql`sum(${aiUsage.costUsd})`))
      .limit(5);

    return {
      users: {
        total: num(users?.total),
        guests: num(users?.guests),
        registered: num(users?.total) - num(users?.guests),
        new7: num(users?.new7),
        newRegistered7: num(users?.newRegistered7),
        banned: num(users?.banned),
        active7: num(active?.n),
      },
      cvs: {
        total: num(cvs?.total),
        new7: num(cvs?.new7),
        shared: num(cvs?.shared),
      },
      files: { total: num(files?.total), bytes: num(files?.bytes) },
      ai: {
        chats: num(ai?.chats),
        chats7: num(ai?.chats7),
        errors7: num(ai?.errors7),
        costToday: num(ai?.costToday),
        cost7: num(ai?.cost7),
        cost30: num(ai?.cost30),
        costAll: num(ai?.costAll),
        searches30: num(ai?.searches30),
      },
      days,
      topSpenders: topSpenders.map((t) => ({
        userId: t.userId,
        name: t.name ?? "",
        email: t.email ?? "",
        isAnonymous: Boolean(t.isAnonymous),
        cost: num(t.cost),
        requests: num(t.requests),
      })),
    };
  }
);

const listInput = z.object({
  q: z.string().max(200).optional(),
  filter: z.enum(["all", "registered", "guests", "banned"]).optional(),
  page: z.number().int().min(0).max(10_000).optional(),
});

/** Users with their CV count, AI use, spend and last activity. */
export const listAdminUsers = createServerFn({ method: "GET" })
  .validator(listInput)
  .handler(async ({ data }) => {
    await requireAdmin();
    const where: SQL[] = [];
    const q = data.q?.trim();
    if (q) {
      const like = `%${q}%`;
      const match = or(
        ilike(userTable.email, like),
        ilike(userTable.name, like),
        eq(userTable.id, q)
      );
      if (match) {
        where.push(match);
      }
    }
    if (data.filter === "registered") {
      where.push(sql`not coalesce(${userTable.isAnonymous}, false)`);
    } else if (data.filter === "guests") {
      where.push(sql`coalesce(${userTable.isAnonymous}, false)`);
    } else if (data.filter === "banned") {
      where.push(sql`coalesce(${userTable.banned}, false)`);
    }
    const page = data.page ?? 0;
    // Correlated subqueries, written with qualified names (drizzle leaves
    // columns unqualified inside sql``, which would match the inner table).
    const cvCount = sql<number>`(select count(*) from "cv" c where c.user_id = "user".id)`;
    const aiCount = sql<number>`(select count(*) from "ai_usage" a where a.user_id = "user".id and a.kind = 'chat')`;
    const aiCost = sql<number>`(select coalesce(sum(a.cost_usd), 0) from "ai_usage" a where a.user_id = "user".id)`;
    const lastActive = sql<Date | null>`greatest(
      (select max(s.updated_at) from "session" s where s.user_id = "user".id),
      (select max(c.updated_at) from "cv" c where c.user_id = "user".id),
      "user".updated_at
    )`;
    const rows = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
        isAnonymous: userTable.isAnonymous,
        emailVerified: userTable.emailVerified,
        banned: userTable.banned,
        createdAt: userTable.createdAt,
        cvCount,
        aiCount,
        aiCost,
        lastActive,
      })
      .from(userTable)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(lastActive))
      .limit(PAGE + 1)
      .offset(page * PAGE);
    const [total] = await db
      .select({ n: count() })
      .from(userTable)
      .where(where.length ? and(...where) : undefined);
    return {
      total: num(total?.n),
      hasMore: rows.length > PAGE,
      page,
      rows: rows.slice(0, PAGE).map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        image: r.image,
        isAnonymous: Boolean(r.isAnonymous),
        emailVerified: r.emailVerified,
        banned: Boolean(r.banned),
        createdAt: iso(r.createdAt) as string,
        lastActive: iso(r.lastActive),
        cvCount: num(r.cvCount),
        aiCount: num(r.aiCount),
        aiCost: num(r.aiCost),
      })),
    };
  });

/** One user: profile, sign-in methods, CVs, files, AI spend. */
export const getAdminUser = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const [u] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, data.id));
    if (!u) {
      return null;
    }
    const providers = await db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, u.id));
    const sessions = await db
      .select({
        updatedAt: sessionTable.updatedAt,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, u.id))
      .orderBy(desc(sessionTable.updatedAt))
      .limit(1);
    const cvs = await db
      .select({
        id: cvTable.id,
        title: cvTable.title,
        template: cvTable.template,
        data: cvTable.data,
        shareId: cvTable.shareId,
        pages: cvTable.pages,
        messages: sql<number>`jsonb_array_length(${cvTable.chat})`,
        createdAt: cvTable.createdAt,
        updatedAt: cvTable.updatedAt,
      })
      .from(cvTable)
      .where(eq(cvTable.userId, u.id))
      .orderBy(desc(cvTable.updatedAt));
    const files = await db
      .select({
        id: cvFile.id,
        cvId: cvFile.cvId,
        name: cvFile.name,
        mediaType: cvFile.mediaType,
        size: cvFile.size,
        createdAt: cvFile.createdAt,
      })
      .from(cvFile)
      .where(eq(cvFile.userId, u.id))
      .orderBy(desc(cvFile.createdAt));
    const [usage] = await db
      .select({
        requests: count(),
        chats: sql<number>`count(*) filter (where ${aiUsage.kind} = 'chat')`,
        cost: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`,
        inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
        outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
        errors: sql<number>`count(*) filter (where ${aiUsage.error} is not null)`,
      })
      .from(aiUsage)
      .where(eq(aiUsage.userId, u.id));
    return {
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        isAnonymous: Boolean(u.isAnonymous),
        emailVerified: u.emailVerified,
        banned: Boolean(u.banned),
        banReason: u.banReason,
        banExpires: iso(u.banExpires),
        guestAiMessages: u.aiMessages,
        createdAt: iso(u.createdAt) as string,
        lastSeen: iso(sessions[0]?.updatedAt),
        userAgent: sessions[0]?.userAgent ?? null,
        providers: providers.map((p) => p.providerId),
        isAdmin: (await adminEmails()).includes(u.email.toLowerCase()),
      },
      cvs: cvs.map((c) => ({
        id: c.id,
        title: c.title,
        template: c.template,
        data: normalizeCv(c.data),
        shareId: c.shareId,
        pages: c.pages,
        messages: num(c.messages),
        createdAt: iso(c.createdAt) as string,
        updatedAt: iso(c.updatedAt) as string,
      })),
      files: files.map((f) => ({
        ...f,
        createdAt: iso(f.createdAt) as string,
      })),
      usage: {
        requests: num(usage?.requests),
        chats: num(usage?.chats),
        cost: num(usage?.cost),
        inputTokens: num(usage?.inputTokens),
        outputTokens: num(usage?.outputTokens),
        errors: num(usage?.errors),
      },
    };
  });

/** A CV with its chat, read-only, for any owner. */
export const getAdminCv = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const [row] = await db
      .select({
        cv: cvTable,
        ownerName: userTable.name,
        ownerEmail: userTable.email,
        ownerGuest: userTable.isAnonymous,
      })
      .from(cvTable)
      .innerJoin(userTable, eq(userTable.id, cvTable.userId))
      .where(eq(cvTable.id, data.id));
    if (!row) {
      return null;
    }
    const files = await db
      .select({
        id: cvFile.id,
        name: cvFile.name,
        mediaType: cvFile.mediaType,
        size: cvFile.size,
        createdAt: cvFile.createdAt,
      })
      .from(cvFile)
      .where(eq(cvFile.cvId, row.cv.id))
      .orderBy(desc(cvFile.createdAt));
    const [usage] = await db
      .select({
        requests: count(),
        cost: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`,
      })
      .from(aiUsage)
      .where(eq(aiUsage.cvId, row.cv.id));
    return {
      id: row.cv.id,
      userId: row.cv.userId,
      owner: {
        name: row.ownerName,
        email: row.ownerEmail,
        isAnonymous: Boolean(row.ownerGuest),
      },
      title: row.cv.title,
      template: row.cv.template,
      data: normalizeCv(row.cv.data),
      chatJson: JSON.stringify(row.cv.chat ?? []),
      shareId: row.cv.shareId,
      createdAt: iso(row.cv.createdAt) as string,
      updatedAt: iso(row.cv.updatedAt) as string,
      files: files.map((f) => ({
        ...f,
        createdAt: iso(f.createdAt) as string,
      })),
      usage: { requests: num(usage?.requests), cost: num(usage?.cost) },
    };
  });

/** Bans a user: no new sessions, current ones signed out. */
export const banAdminUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().max(100),
      reason: z.string().max(500).optional(),
      /** Ban length in days; none bans until lifted. */
      days: z.number().int().min(1).max(3650).optional(),
    })
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (admin.id === data.id) {
      throw new Error(m.admin_cannot_self());
    }
    await db
      .update(userTable)
      .set({
        banned: true,
        banReason: data.reason?.trim() || null,
        banExpires: data.days ? new Date(Date.now() + data.days * DAY) : null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, data.id));
    await db.delete(sessionTable).where(eq(sessionTable.userId, data.id));
    return { ok: true };
  });

export const unbanAdminUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await db
      .update(userTable)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, data.id));
    return { ok: true };
  });

/** Deletes a user and everything they made (FK cascade); AI usage stays. */
export const deleteAdminUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (admin.id === data.id) {
      throw new Error(m.admin_cannot_self());
    }
    await deleteUserAndFiles(data.id);
    return { ok: true };
  });

/** Every file attached in a chat, newest first. */
export const listAdminFiles = createServerFn({ method: "GET" })
  .validator(listInput.pick({ q: true, page: true }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const page = data.page ?? 0;
    const q = data.q?.trim();
    const where = q
      ? or(
          ilike(cvFile.name, `%${q}%`),
          ilike(userTable.email, `%${q}%`),
          ilike(cvFile.mediaType, `%${q}%`)
        )
      : undefined;
    const rows = await db
      .select({
        id: cvFile.id,
        name: cvFile.name,
        mediaType: cvFile.mediaType,
        size: cvFile.size,
        createdAt: cvFile.createdAt,
        cvId: cvFile.cvId,
        cvTitle: cvTable.title,
        userId: cvFile.userId,
        userEmail: userTable.email,
        userName: userTable.name,
        isAnonymous: userTable.isAnonymous,
      })
      .from(cvFile)
      .innerJoin(userTable, eq(userTable.id, cvFile.userId))
      .innerJoin(cvTable, eq(cvTable.id, cvFile.cvId))
      .where(where)
      .orderBy(desc(cvFile.createdAt))
      .limit(PAGE + 1)
      .offset(page * PAGE);
    const [total] = await db
      .select({
        n: count(),
        bytes: sql<number>`coalesce(sum(${cvFile.size}), 0)`,
      })
      .from(cvFile)
      .innerJoin(userTable, eq(userTable.id, cvFile.userId))
      .where(where);
    return {
      total: num(total?.n),
      bytes: num(total?.bytes),
      hasMore: rows.length > PAGE,
      page,
      rows: rows.slice(0, PAGE).map((r) => ({
        ...r,
        isAnonymous: Boolean(r.isAnonymous),
        createdAt: iso(r.createdAt) as string,
      })),
    };
  });

/** AI requests, newest first, with tokens and cost. */
export const listAdminUsage = createServerFn({ method: "GET" })
  .validator(
    z.object({
      kind: z.enum(["all", "chat", "translate", "faq"]).optional(),
      userId: z.string().max(100).optional(),
      errors: z.boolean().optional(),
      page: z.number().int().min(0).max(10_000).optional(),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const page = data.page ?? 0;
    const where: SQL[] = [];
    if (data.kind && data.kind !== "all") {
      where.push(eq(aiUsage.kind, data.kind));
    }
    if (data.userId) {
      where.push(eq(aiUsage.userId, data.userId));
    }
    if (data.errors) {
      where.push(isNotNull(aiUsage.error));
    }
    const cond = where.length ? and(...where) : undefined;
    const rows = await db
      .select({
        id: aiUsage.id,
        kind: aiUsage.kind,
        model: aiUsage.model,
        inputTokens: aiUsage.inputTokens,
        outputTokens: aiUsage.outputTokens,
        cachedInputTokens: aiUsage.cachedInputTokens,
        reasoningTokens: aiUsage.reasoningTokens,
        webSearches: aiUsage.webSearches,
        steps: aiUsage.steps,
        tools: aiUsage.tools,
        costUsd: aiUsage.costUsd,
        durationMs: aiUsage.durationMs,
        error: aiUsage.error,
        createdAt: aiUsage.createdAt,
        userId: aiUsage.userId,
        userEmail: userTable.email,
        isAnonymous: userTable.isAnonymous,
        cvId: aiUsage.cvId,
        cvTitle: cvTable.title,
      })
      .from(aiUsage)
      .leftJoin(userTable, eq(userTable.id, aiUsage.userId))
      .leftJoin(cvTable, eq(cvTable.id, aiUsage.cvId))
      .where(cond)
      .orderBy(desc(aiUsage.createdAt))
      .limit(PAGE + 1)
      .offset(page * PAGE);
    const [total] = await db
      .select({
        n: count(),
        cost: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`,
        input: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)`,
        output: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)`,
        searches: sql<number>`coalesce(sum(${aiUsage.webSearches}), 0)`,
      })
      .from(aiUsage)
      .where(cond);
    return {
      total: num(total?.n),
      cost: num(total?.cost),
      inputTokens: num(total?.input),
      outputTokens: num(total?.output),
      webSearches: num(total?.searches),
      hasMore: rows.length > PAGE,
      page,
      rows: rows.slice(0, PAGE).map((r) => ({
        ...r,
        tools: r.tools ?? [],
        costUsd: num(r.costUsd),
        isAnonymous: Boolean(r.isAnonymous),
        userEmail: r.userEmail ?? null,
        cvTitle: r.cvTitle ?? null,
        createdAt: iso(r.createdAt) as string,
      })),
    };
  });

/** One AI request with everything recorded about it. */
export const getAdminUsage = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const [r] = await db
      .select({
        usage: aiUsage,
        userEmail: userTable.email,
        userName: userTable.name,
        isAnonymous: userTable.isAnonymous,
        cvTitle: cvTable.title,
      })
      .from(aiUsage)
      .leftJoin(userTable, eq(userTable.id, aiUsage.userId))
      .leftJoin(cvTable, eq(cvTable.id, aiUsage.cvId))
      .where(eq(aiUsage.id, data.id));
    if (!r) {
      return null;
    }
    const u = r.usage;
    return {
      id: u.id,
      kind: u.kind,
      model: u.model,
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      cachedInputTokens: u.cachedInputTokens,
      reasoningTokens: u.reasoningTokens,
      webSearches: u.webSearches,
      steps: u.steps,
      tools: u.tools ?? [],
      costUsd: num(u.costUsd),
      durationMs: u.durationMs,
      error: u.error,
      createdAt: iso(u.createdAt) as string,
      userId: u.userId,
      userEmail: r.userEmail ?? null,
      userName: r.userName ?? null,
      isAnonymous: Boolean(r.isAnonymous),
      cvId: u.cvId,
      cvTitle: r.cvTitle ?? null,
      /** JSON text: the detail is free-form and only read by the admin UI. */
      detailJson: u.detail ? JSON.stringify(u.detail) : null,
    };
  });

async function memberById(id: string) {
  const [u] = await db.select().from(userTable).where(eq(userTable.id, id));
  if (!u || u.isAnonymous) {
    throw new Error(m.admin_verify_guest());
  }
  return u;
}

/**
 * Emails the user a confirmation link (in the admin's language). Also works
 * for an already confirmed address when the admin chooses to send anyway.
 */
export const sendAdminVerification = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const u = await memberById(data.id);
    const ctx = await auth.$context;
    const token = await createEmailVerificationToken(ctx.secret, u.email);
    const url = `${ctx.baseURL}/verify-email?token=${token}&callbackURL=${encodeURIComponent("/settings")}`;
    await sendAccountEmail("verify", { to: u.email, url });
    return { ok: true };
  });

/**
 * Marks the email as confirmed or not. Unconfirmed accounts get the guest
 * limits again (src/lib/guest.ts limitKindFor).
 */
export const setAdminEmailVerified = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(100), verified: z.boolean() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await memberById(data.id);
    await db
      .update(userTable)
      .set({ emailVerified: data.verified, updatedAt: new Date() })
      .where(eq(userTable.id, data.id));
    return { ok: true };
  });
