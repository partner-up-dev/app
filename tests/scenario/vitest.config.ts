import { fileURLToPath } from "node:url";
import { defineProject } from "vitest/config";

export default defineProject({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  resolve: {
    alias: {
      "@partner-up-dev/backend/contracts": fileURLToPath(
        new URL("../../apps/backend/src/contracts.ts", import.meta.url),
      ),
      "@partner-up-dev/backend": fileURLToPath(
        new URL("../../apps/backend/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    name: "system-scenario",
    include: ["**/*.scenario.test.ts"],
    environment: "node",
    globalSetup: ["./_infra/vitest/global-setup.ts"],
    setupFiles: ["./_infra/vitest/setup-file.ts"],
    fileParallelism: false,
    isolate: false,
    maxWorkers: 1,
    testTimeout: 60_000,
    sequence: {
      concurrent: false,
    },
  },
});
