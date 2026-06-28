import {
  createCaocaoCallbackRouterConfigFromEnv,
  createCaocaoCallbackRouterServer,
} from "../../infra/edge/caocao-callback-router";

const config = createCaocaoCallbackRouterConfigFromEnv(process.env);
const server = createCaocaoCallbackRouterServer(config);

server.listen(config.port, config.host, () => {
  console.info(
    JSON.stringify({
      event: "caocao_callback_router_started",
      host: config.host,
      port: config.port,
      callbackPath: config.callbackPath,
      stagingOrigin: config.stagingOrigin.origin,
      productionOrigin: config.productionOrigin.origin,
      maxBodyBytes: config.maxBodyBytes,
      upstreamTimeoutMs: config.upstreamTimeoutMs,
    }),
  );
});

const shutdown = (signal: NodeJS.Signals): void => {
  console.info(
    JSON.stringify({
      event: "caocao_callback_router_stopping",
      signal,
    }),
  );

  server.close((error) => {
    if (error) {
      console.error(
        JSON.stringify({
          event: "caocao_callback_router_stop_failed",
          message: error.message,
        }),
      );
      process.exit(1);
      return;
    }

    console.info(
      JSON.stringify({
        event: "caocao_callback_router_stopped",
      }),
    );
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
