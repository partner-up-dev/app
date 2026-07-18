import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { parse as parseJsonc } from "jsonc-parser";
import { defineProject } from "vitest/config";

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

export default defineProject({
  root: fileURLToPath(new URL(".", import.meta.url)),
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
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
      "@partner-up-dev/backend/contracts": fileURLToPath(
        new URL("../backend/src/contracts.ts", import.meta.url),
      ),
      "@partner-up-dev/backend": fileURLToPath(new URL("../backend/src/index.ts", import.meta.url)),
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
    name: "frontend-unit",
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
