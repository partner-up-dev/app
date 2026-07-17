import { serve, type ServerType } from "@hono/node-server";
import { z } from "zod";
import { createFakeWeChatPayFixture } from "./fixtures";
import { createFakeWeChatPayApp, type FakeWeChatPayServerAppInput } from "./routes";
import { FakeWeChatPayState } from "./state";

export const fakeWeChatPayServerOptionsSchema = z.object({
  hostname: z.string().min(1).default("127.0.0.1"),
  port: z.number().int().nonnegative().default(0),
  verifyRequests: z.boolean().default(true),
});

export type FakeWeChatPayServerOptions = Partial<z.input<typeof fakeWeChatPayServerOptionsSchema>>;

export type StartedFakeWeChatPayServer = {
  readonly origin: string;
  readonly fixture: FakeWeChatPayServerAppInput["fixture"];
  readonly state: FakeWeChatPayState;
  close(): Promise<void>;
};

const resolveServerOrigin = (server: ServerType, hostname: string): string => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fake WeChatPay server did not expose a TCP address");
  }
  return `http://${hostname}:${address.port}`;
};

export async function startFakeWeChatPayServer(
  rawOptions: FakeWeChatPayServerOptions = {},
): Promise<StartedFakeWeChatPayServer> {
  const options = fakeWeChatPayServerOptionsSchema.parse(rawOptions);
  const fixture = createFakeWeChatPayFixture();
  const state = new FakeWeChatPayState();
  const app = createFakeWeChatPayApp({
    fixture,
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

  const origin = resolveServerOrigin(server, options.hostname);

  return {
    fixture,
    origin,
    state,
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
  };
}
