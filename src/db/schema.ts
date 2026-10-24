import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Better Auth tables (core + anonymous plugin)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false),
  /** AI messages sent while a guest (guests get a few for free). */
  aiMessages: integer("ai_messages").notNull().default(0),
  // Better Auth admin plugin: bans are enforced when a session is created.
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
);

// App tables
export const cv = pgTable(
  "cv",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled CV"),
    template: text("template").notNull().default("classic"),
    data: jsonb("data").notNull(),
    chat: jsonb("chat").notNull().default([]),
    /** Public link id; null while the CV is private. */
    shareId: text("share_id").unique(),
    /** Whether the public page also shows the AI chat. */
    shareChat: boolean("share_chat").notNull().default(false),
    /** Pages as last laid out in the editor; lets the share page reserve
     * the right height before it lays the CV out itself. */
    pages: integer("pages").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("cv_user_id_idx").on(t.userId)]
);

/** Every saved state of a CV, for the History tab and undo across reloads. */
export const cvVersion = pgTable(
  "cv_version",
  {
    id: text("id").primaryKey(),
    cvId: text("cv_id")
      .notNull()
      .references(() => cv.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    source: text("source").notNull(),
    template: text("template").notNull(),
    /** The CV with its photo replaced by a reference into cv_photo. */
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("cv_version_cv_id_created_idx").on(t.cvId, t.createdAt)]
);

/** Legacy: photos by hash from before R2 (now photos/<hash>); no longer written. */
export const cvPhoto = pgTable("cv_photo", {
  hash: text("hash").primaryKey(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Files attached in the chat (old CVs, screenshots), served to the owner. */
export const cvFile = pgTable(
  "cv_file",
  {
    id: text("id").primaryKey(),
    cvId: text("cv_id")
      .notNull()
      .references(() => cv.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mediaType: text("media_type").notNull(),
    size: integer("size").notNull(),
    /** Legacy: base64 bytes from before R2 (files/<id>); no longer written. */
    data: text("data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("cv_file_cv_id_idx").on(t.cvId)]
);

/**
 * Guest usage per device (salted hash of a browser fingerprint), so starting
 * over as a new guest doesn't reset the free limits.
 */
export const guestDevice = pgTable("guest_device", {
  hash: text("hash").primaryKey(),
  cvs: integer("cvs").notNull().default(0),
  aiMessages: integer("ai_messages").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * One row per AI request (a chat reply with all its steps, a CV
 * translation, an FAQ answer) with its tokens and estimated cost, for the
 * admin page. User and CV links survive deletion as nulls.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    cvId: text("cv_id").references(() => cv.id, { onDelete: "set null" }),
    /** chat | translate | faq */
    kind: text("kind").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    webSearches: integer("web_searches").notNull().default(0),
    steps: integer("steps").notNull().default(1),
    /** Tool names used, in order, deduplicated. */
    tools: jsonb("tools").$type<string[]>().notNull().default([]),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    durationMs: integer("duration_ms").notNull().default(0),
    error: text("error"),
    /**
     * What happened, for the admin detail view: steps with their tokens and
     * tool calls, the prompt and reply text (capped, no file data), prices
     * used. Capped at ~20KB; older rows have none.
     */
    detail: jsonb("detail"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ai_usage_created_idx").on(t.createdAt),
    index("ai_usage_user_idx").on(t.userId, t.createdAt),
  ]
);

/** Profile pictures uploaded in Settings (256×256), served at /api/avatar/:userId. */
export const userAvatar = pgTable("user_avatar", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(),
  /** Legacy: base64 bytes from before R2 (avatars/<userId>); no longer written. */
  data: text("data"),
  /** The picture the sign-in provider gave (Google), restored on "Remove". */
  providerImage: text("provider_image"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
