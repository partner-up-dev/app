import { startFakeWeChatPayServer } from "../src/server";

const portRaw = process.env.PORT;
const port = portRaw ? Number.parseInt(portRaw, 10) : 0;

const server = await startFakeWeChatPayServer({
  port: Number.isFinite(port) ? port : 0,
});
const publicOrigin = process.env.PORTLESS_URL || server.origin;

console.info(
  JSON.stringify(
    {
      fakeWeChatPay: {
        apiV3Key: server.fixture.apiV3Key,
        appId: server.fixture.appId,
        endpointBaseUrl: publicOrigin,
        mchId: server.fixture.mchId,
        merchantCertificate: server.fixture.merchantCertificate,
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
