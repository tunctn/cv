import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const apiImagesInDev = (): Plugin => ({
  name: "api-images-in-dev",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url?.startsWith("/api/")) {
        req.headers["sec-fetch-dest"] = undefined;
      }
      next();
    });
  },
});

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Stamped into every page (<meta name="build">) so a deploy can be
  // checked: the live page must show the new id.
  define: {
    __BUILD_ID__: JSON.stringify(
      process.env.SOURCE_COMMIT?.slice(0, 7) ||
        new Date().toISOString().replaceAll(/[-:]/gu, "").slice(0, 15)
    ),
  },
  plugins: [
    devtools(),
    // Compiles messages/*.json into src/paraglide on dev start and in every
    // build, so the generated folder stays out of git.
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      // "custom-html" reads <html lang> set by the server render, so the
      // client always hydrates in the locale the server picked.
      strategy: ["cookie", "custom-html", "preferredLanguage", "baseLocale"],
    }),
    apiImagesInDev(),
    nitro({ rollupConfig: { external: [/^@sentry\//u] } }),
    tailwindcss(),
    tanstackStart({
      // Moved off the default "/_serverFn" once: browsers had cached some
      // data responses during a CDN misconfiguration; a new path makes those
      // copies unreachable. Responses now carry no-store (src/server.ts).
      serverFns: { base: "/_fn" },
    }),
    viteReact(),
  ],
});

export default config;
