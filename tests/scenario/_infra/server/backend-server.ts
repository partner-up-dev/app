import { serve, type ServerType } from "@hono/node-server";

export type StartedBackendServer = {
  readonly origin: string;
  close(): Promise<void>;
};

export async function startBackendServer(port: number): Promise<StartedBackendServer> {
  const { app } = await import("../../../../apps/backend/src/index");

  const server = await new Promise<ServerType>((resolve, reject) => {
    const startedServer = serve(
      {
        fetch: app.fetch,
        hostname: "127.0.0.1",
        port,
      },
      () => {
        resolve(startedServer);
      },
    );

    startedServer.once("error", reject);
  });

  return {
    origin: `http://127.0.0.1:${port}`,
    close: async () => {
      if (!server.listening) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
