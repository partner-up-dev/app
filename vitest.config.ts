import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { parse as parseJsonc } from "jsonc-parser";

const jsoncPlugin = () => ({
  name: "jsonc-loader",
  transform(source: string, id: string) {
    if (!id.endsWith(".jsonc")) {
      return null;
    }

    const parsed = parseJsonc(source);
    return {
      code: `export default ${JSON.stringify(parsed)};`,
      map: null,
    };
  },
});

export default defineConfig({
  plugins: [
    jsoncPlugin(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("wx-open-"),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/frontend/src", import.meta.url)),
      "@/": fileURLToPath(new URL("./apps/frontend/src/", import.meta.url)),
      "@partner-up-dev/backend": fileURLToPath(
        new URL("./apps/backend/src/index.ts", import.meta.url),
      ),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData:
          '@use "@partner-up-dev/design-web/styles/functions" as fn; @use "@partner-up-dev/design-web/styles/mixins" as mx;',
      },
    },
  },
  test: {
    reporters: ["agent"],
    projects: [
      {
        extends: true,
        test: {
          name: "backend-unit",
          include: ["apps/backend/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "frontend-unit",
          include: ["apps/frontend/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "backend-scenario",
          include: ["apps/backend/tests/**/*.scenario.test.ts"],
          environment: "node",
          globalSetup: ["./apps/backend/tests/_infra/vitest/global-setup.ts"],
          fileParallelism: false,
          isolate: false,
          maxWorkers: 1,
          testTimeout: 60_000,
          sequence: {
            concurrent: false,
          },
        },
      },
      {
        extends: true,
        test: {
          name: "system-scenario",
          include: ["tests/scenario/**/*.scenario.test.ts"],
          environment: "node",
          globalSetup: ["./tests/scenario/_infra/vitest/global-setup.ts"],
          setupFiles: ["./tests/scenario/_infra/vitest/setup-file.ts"],
          fileParallelism: false,
          isolate: false,
          maxWorkers: 1,
          testTimeout: 60_000,
          sequence: {
            concurrent: false,
          },
        },
      },
    ],
  },
});
