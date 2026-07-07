import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type ViteDevServer } from "vite";

export type StartedFrontendServer = {
  readonly origin: string;
  close(): Promise<void>;
};

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDirectory, "../../../..");
const frontendRoot = path.join(repoRoot, "apps/web");

export async function startFrontendServer(input: {
  backendPort: number;
  port: number;
}): Promise<StartedFrontendServer> {
  process.env.VITE_BACKEND_PORT = String(input.backendPort);
  process.env.VITE_PORT = String(input.port);
  process.env.VITE_API_URL = `http://127.0.0.1:${input.port}`;
  process.env.VITE_USE_MOCK = "false";

  const previousWorkingDirectory = process.cwd();
  let server: ViteDevServer;
  try {
    process.chdir(frontendRoot);
    server = await createServer({
      configFile: path.join(frontendRoot, "vite.config.ts"),
      logLevel: "error",
      root: frontendRoot,
      server: {
        host: "127.0.0.1",
        port: input.port,
        strictPort: true,
      },
    });
  } finally {
    process.chdir(previousWorkingDirectory);
  }

  await server.listen();

  return {
    origin: `http://127.0.0.1:${input.port}`,
    close: async () => {
      await server.close();
    },
  };
}
