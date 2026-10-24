import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
  env: core.env,
  extends: [core, react, tanstack],
  globals: { __BUILD_ID__: "readonly" },
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "src/routeTree.gen.ts",
    "src/paraglide/**",
    "project.inlang/**",
    "src/components/ui/**",
    "src/components/reui/**",
    "drizzle/**",
    "tmp/**",
  ],
  jsPlugins: ["./lint/i18n.mjs"],
  overrides: [
    {
      // Legal pages stay English-only (they are not translated)
      files: ["src/**/*.{ts,tsx}"],
      excludeFiles: ["src/content/legal/**"],
      rules: {
        "i18n/jsx-text": "error",
        "i18n/props": "error",
      },
    },
  ],
});
