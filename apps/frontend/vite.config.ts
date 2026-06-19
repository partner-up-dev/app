import { execSync } from "node:child_process";
import vue from "@vitejs/plugin-vue";
import { parse as parseJsonc } from "jsonc-parser";
import { resolve } from "path";
import unocss from "unocss/vite";
import { defineConfig, loadEnv } from "vite";

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

const deferCssPlugin = () => ({
  name: "defer-css",
  apply: "build",
  transformIndexHtml(html: string) {
    const stylesheetRegex = /<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi;

    return html.replace(stylesheetRegex, (match) => {
      const attrs = match
        .replace(/^<link\s*/i, "")
        .replace(/\/>$/i, "")
        .replace(/>$/i, "")
        .trim();
      const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);

      if (!hrefMatch) {
        return match;
      }

      const href = hrefMatch[1];
      const rest = attrs
        .replace(/\brel=["']stylesheet["']\s*/i, "")
        .replace(/\bhref=["'][^"']+["']\s*/i, "")
        .trim();
      const extra = rest.length > 0 ? ` ${rest}` : "";

      const preload = `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'"${extra}>`;
      const noscript = `<noscript><link rel="stylesheet" href="${href}"${extra}></noscript>`;

      return `${preload}${noscript}`;
    });
  },
});

const normalizeEnvValue = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parsePort = (value: string | undefined, fallback: number): number => {
  const port = Number.parseInt(value ?? "", 10);
  return Number.isFinite(port) ? port : fallback;
};

const resolvePortlessSiblingHost = (
  portlessUrl: string | null,
  currentAppName: string,
  siblingAppName: string,
): string => {
  if (!portlessUrl) {
    return `${siblingAppName}.localhost`;
  }

  try {
    const hostname = new URL(portlessUrl).hostname;

    if (hostname === currentAppName) {
      return siblingAppName;
    }

    if (hostname.startsWith(`${currentAppName}.`)) {
      return `${siblingAppName}${hostname.slice(currentAppName.length)}`;
    }
  } catch {
    return `${siblingAppName}.localhost`;
  }

  return `${siblingAppName}.localhost`;
};

const resolvePortlessProxyTarget = (portlessUrl: string | null): string => {
  if (!portlessUrl) {
    return "https://127.0.0.1";
  }

  try {
    const url = new URL(portlessUrl);
    return `${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`;
  } catch {
    return "https://127.0.0.1";
  }
};

const resolvePortlessHostHeader = (portlessUrl: string | null, hostname: string): string => {
  if (!portlessUrl) {
    return hostname;
  }

  try {
    const url = new URL(portlessUrl);
    return url.port ? `${hostname}:${url.port}` : hostname;
  } catch {
    return hostname;
  }
};

const readGitValue = (command: string): string | null => {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return normalizeEnvValue(output);
  } catch {
    return null;
  }
};

const frameworkVendorPackages = [
  "vue",
  "@vue/runtime-core",
  "@vue/runtime-dom",
  "@vue/reactivity",
  "@vue/shared",
  "vue-router",
  "vue-i18n",
  "@intlify/core-base",
  "@intlify/message-compiler",
  "@intlify/shared",
  "pinia",
  "pinia-plugin-persistedstate",
  "@tanstack/query-core",
  "@tanstack/vue-query",
  "@unhead/vue",
  "unhead",
  "hookable",
] as const;

const validationVendorPackages = ["zod", "vee-validate", "@vee-validate/zod"] as const;

const posterRenderingVendorPackages = ["html2canvas"] as const;
const qrCodeVendorPackages = ["qrcode"] as const;

const normalizeModuleId = (id: string): string => id.replace(/\\/g, "/");

const includesNodePackage = (id: string, packageName: string): boolean =>
  id.includes(`/node_modules/${packageName}/`);

const includesAnyNodePackage = (id: string, packageNames: readonly string[]): boolean =>
  packageNames.some((packageName) => includesNodePackage(id, packageName));

const getManualChunkName = (id: string): string | undefined => {
  const moduleId = normalizeModuleId(id);

  if (includesAnyNodePackage(moduleId, posterRenderingVendorPackages)) {
    return "vendor-poster-rendering";
  }

  if (includesAnyNodePackage(moduleId, qrCodeVendorPackages)) {
    return "vendor-qr-code";
  }

  if (includesAnyNodePackage(moduleId, validationVendorPackages)) {
    return "vendor-validation";
  }

  if (includesAnyNodePackage(moduleId, frameworkVendorPackages)) {
    return "vendor-framework";
  }

  if (moduleId.includes("/node_modules/")) {
    return "vendor";
  }

  if (moduleId.includes("/src/domains/share/") || moduleId.includes("/src/lib/poster-types")) {
    return "share";
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isPortless = Boolean(process.env.PORTLESS_URL);
  const serverHost = isPortless
    ? (normalizeEnvValue(process.env.HOST) ?? "127.0.0.1")
    : normalizeEnvValue(env.VITE_HOST);
  const serverPort = isPortless
    ? parsePort(process.env.PORT, 5173)
    : parsePort(env.VITE_PORT, 5173);
  const backendHost = normalizeEnvValue(env.VITE_BACKEND_HOST) ?? "localhost";
  const backendPort = normalizeEnvValue(env.VITE_BACKEND_PORT) ?? "3000";
  const portlessUrl = normalizeEnvValue(process.env.PORTLESS_URL);
  const portlessBackendHost = resolvePortlessSiblingHost(
    portlessUrl,
    "partner-up",
    "api.partner-up",
  );
  const portlessBackendHostHeader = resolvePortlessHostHeader(portlessUrl, portlessBackendHost);
  const backendProxyTarget =
    normalizeEnvValue(env.VITE_BACKEND_PROXY_TARGET) ??
    (isPortless ? resolvePortlessProxyTarget(portlessUrl) : `http://${backendHost}:${backendPort}`);
  const backendProxyUrl = new URL(backendProxyTarget);
  const backendProxyHeaders = isPortless ? { Host: portlessBackendHostHeader } : undefined;
  const frontendApiUrl = isPortless
    ? (portlessUrl ?? "")
    : (normalizeEnvValue(env.VITE_API_URL) ?? "");
  const frontendCommitHash =
    normalizeEnvValue(env.VITE_FRONTEND_COMMIT_HASH) ??
    readGitValue("git rev-parse HEAD") ??
    "unknown";

  return {
    plugins: [
      jsoncPlugin(),
      deferCssPlugin(),
      unocss(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith("wx-open-"),
          },
        },
      }),
    ],
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(frontendApiUrl),
      "import.meta.env.VITE_FRONTEND_COMMIT_HASH": JSON.stringify(frontendCommitHash),
    },
    build: {
      outDir: "./dist",
      rollupOptions: {
        output: {
          manualChunks: getManualChunkName,
        },
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: (source, file) => {
            const hasStyleNamespaces =
              source.includes(`@use "@partner-up-dev/design-web/styles/functions" as fn`) ||
              source.includes(`@use '@partner-up-dev/design-web/styles/functions' as fn`) ||
              source.includes(`@use "@partner-up-dev/design-web/styles/mixins" as mx`) ||
              source.includes(`@use '@partner-up-dev/design-web/styles/mixins' as mx`);

            if (
              file.includes("src/components/") ||
              file.includes("src/pages/") ||
              file.includes("src/widgets/") ||
              file.includes("src/features/") ||
              file.includes("src/shared/") ||
              file.includes("src/domains/")
            ) {
              if (hasStyleNamespaces) {
                return source;
              }
              return `@use "@partner-up-dev/design-web/styles/functions" as fn; @use "@partner-up-dev/design-web/styles/mixins" as mx;${source}`;
            }
            return source;
          },
        },
      },
    },
    server: {
      ...(serverHost ? { host: serverHost } : {}),
      port: serverPort,
      strictPort: isPortless,
      proxy: {
        "/api": {
          target: backendProxyTarget,
          changeOrigin: !isPortless,
          ...(backendProxyHeaders ? { headers: backendProxyHeaders } : {}),
          secure: !isPortless && !backendProxyUrl.hostname.endsWith(".localhost"),
        },
      },
    },
  };
});
