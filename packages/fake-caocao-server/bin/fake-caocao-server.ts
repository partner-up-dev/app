import { startFakeCaocaoServer } from "../src/server";

const portRaw = process.env.PORT;
const port = portRaw ? Number.parseInt(portRaw, 10) : 0;

const server = await startFakeCaocaoServer({
  port: Number.isFinite(port) ? port : 0,
});

console.info(
  JSON.stringify(
    {
      fakeCaocao: {
        clientId: server.fixture.clientId,
        endpointBaseUrl: server.origin,
        signKey: server.fixture.signKey,
      },
      origin: server.origin,
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
