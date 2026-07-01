import { serve, type ServerType } from "@hono/node-server";
import { z } from "zod";
import { createFakeCaocaoFixture } from "./fixtures";
import type { FakeCaocaoRoutePlanner } from "./route-planning";
import { createFakeCaocaoApp } from "./routes";
import { FakeCaocaoState } from "./state";

export const fakeCaocaoServerOptionsSchema = z.object({
  callbackBaseUrl: z.string().url().nullable().optional(),
  hostname: z.string().min(1).default("127.0.0.1"),
  port: z.number().int().nonnegative().default(0),
  verifyRequests: z.boolean().default(true),
});

export type FakeCaocaoServerOptions = Partial<
  z.input<typeof fakeCaocaoServerOptionsSchema>
> & {
  routePlanner?: FakeCaocaoRoutePlanner | null;
};

export type StartedFakeCaocaoServer = {
  readonly origin: string;
  readonly fixture: ReturnType<typeof createFakeCaocaoFixture>;
  readonly state: FakeCaocaoState;
  close(): Promise<void>;
};

const resolveServerOrigin = (server: ServerType, hostname: string): string => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fake Caocao server did not expose a TCP address");
  }
  return `http://${hostname}:${address.port}`;
};

export async function startFakeCaocaoServer(
  rawOptions: FakeCaocaoServerOptions = {},
): Promise<StartedFakeCaocaoServer> {
  const options = fakeCaocaoServerOptionsSchema.parse(rawOptions);
  const fixture = createFakeCaocaoFixture();
  const state = new FakeCaocaoState();
  const app = createFakeCaocaoApp({
    callbackBaseUrl: options.callbackBaseUrl ?? null,
    fixture,
    routePlanner: rawOptions.routePlanner,
    state,
    verifyRequests: options.verifyRequests,
  });

  const server = await new Promise<ServerType>((resolve, reject) => {
    const startedServer = serve(
      {
        fetch: app.fetch,
        hostname: options.hostname,
        port: options.port,
      },
      () => resolve(startedServer),
    );
    startedServer.once("error", reject);
  });

  return {
    close: async () => {
      if (!server.listening) return;
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
    fixture,
    origin: resolveServerOrigin(server, options.hostname),
    state,
  };
}
