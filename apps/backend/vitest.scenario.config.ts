import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    name: "backend-scenario",
    include: ["tests/**/*.scenario.test.ts"],
    environment: "node",
    globalSetup: ["./tests/_infra/vitest/global-setup.ts"],
    fileParallelism: false,
    isolate: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    sequence: {
      concurrent: false,
    },
  },
});
