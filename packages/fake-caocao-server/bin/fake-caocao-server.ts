import { startFakeCaocaoServer } from "../src/server";

const portRaw = process.env.PORT;
const port = portRaw ? Number.parseInt(portRaw, 10) : 0;
const hostname = process.env.HOST || undefined;

const server = await startFakeCaocaoServer({
  hostname,
  port: Number.isFinite(port) ? port : 0,
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
