import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    name: "backend-unit",
    include: ["src/**/*.test.ts"],
    environment: "node",
    testTimeout: 10_000,
  },
});
