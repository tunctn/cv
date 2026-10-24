import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "src/routeTree.gen.ts",
    "src/paraglide/**",
    "project.inlang/**",
    "src/components/ui/**",
    "src/components/reui/**",
    "src/styles/scroll.css",
    "drizzle/**",
    "tmp/**",
  ],
});
