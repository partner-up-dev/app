import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "caocao-callback-router": "src/scripts/ride-hailing/caocao-callback-router.ts",
  },
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node20",
  sourcemap: true,
  clean: true,
  bundle: true,
  splitting: false,
  skipNodeModulesBundle: true,
});
