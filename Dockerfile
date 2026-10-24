FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm i -g pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Hugeicons Pro comes from a private registry. pnpm no longer expands env
# vars in a project .npmrc, so the token goes into the build user's config
# for this one step and is removed right after; it never reaches the
# runtime image.
ARG HUGEICONS_TOKEN
RUN printf '//npm.hugeicons.com/:_authToken=%s\n' "$HUGEICONS_TOKEN" > /root/.npmrc \
    && pnpm install --frozen-lockfile \
    && rm -f /root/.npmrc
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    INTERNAL_URL=http://127.0.0.1:3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
# Headless Chromium for PDF/PNG export, matching the installed playwright-core.
RUN node node_modules/playwright-core/cli.js install --with-deps --only-shell chromium \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.output ./.output
COPY drizzle ./drizzle
COPY scripts ./scripts
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && node scripts/migrate-files-to-r2.mjs --rewrite && node scripts/migrate-files-to-r2.mjs --verify && node .output/server/index.mjs"]
