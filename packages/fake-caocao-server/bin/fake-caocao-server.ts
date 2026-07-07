import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createTencentDrivingRoutePlanner } from "../src/route-planning";
import { startFakeCaocaoServer } from "../src/server";

const frontendEnvPath = fileURLToPath(new URL("../../../apps/web/.env", import.meta.url));

const loadFrontendEnvFile = (): void => {
  if (!existsSync(frontendEnvPath)) return;
  const lines = readFileSync(frontendEnvPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key.startsWith("VITE_TENCENT_LBS_")) continue;
    if (process.env[key]) continue;
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
};

loadFrontendEnvFile();

const portRaw = process.env.PORT;
const port = portRaw ? Number.parseInt(portRaw, 10) : 0;
const hostname = process.env.HOST || undefined;
const tencentLbsKey =
  process.env.VITE_TENCENT_LBS_WEB_SERVICE_KEY?.trim() ||
  process.env.VITE_TENCENT_LBS_JS_KEY?.trim() ||
  "";
const routePlanner =
  tencentLbsKey.length > 0
    ? createTencentDrivingRoutePlanner({
        apiKey: tencentLbsKey,
      })
    : null;

const server = await startFakeCaocaoServer({
  hostname,
  port: Number.isFinite(port) ? port : 0,
  routePlanner,
});
const publicOrigin = process.env.PORTLESS_URL || server.origin;

console.info(
  JSON.stringify(
    {
      fakeCaocao: {
        clientId: server.fixture.clientId,
        endpointBaseUrl: publicOrigin,
        signKey: server.fixture.signKey,
      },
      origin: publicOrigin,
      listenOrigin: server.origin,
    },
    null,
    2,
  ),
);

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.once("SIGINT", () => {
  void shutdown();
});
process.once("SIGTERM", () => {
  void shutdown();
});
