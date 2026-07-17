import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: ["agent"],
    projects: ["apps/backend/vitest.unit.config.ts", "apps/backend/vitest.scenario.config.ts"],
  },
});
