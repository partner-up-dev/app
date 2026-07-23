import {
  createCaocaoCallbackRouterConfigFromEnv,
  createCaocaoCallbackRouterServer,
} from "../../infra/edge/caocao-callback-router";

const config = createCaocaoCallbackRouterConfigFromEnv(process.env);
const server = createCaocaoCallbackRouterServer(config);

server.listen(config.port, config.host);

const shutdown = (): void => {
  server.close((error) => {
    if (error) {
      process.exit(1);
      return;
    }

    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
