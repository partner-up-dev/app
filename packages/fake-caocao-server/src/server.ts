import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createFakeCaocaoFixture } from "./fixtures";
import { handleFakeCaocaoRequest } from "./routes";
import { FakeCaocaoState } from "./state";

export type FakeCaocaoServerOptions = {
  hostname?: string;
  port?: number;
  verifyRequests?: boolean;
};

export type StartedFakeCaocaoServer = {
  readonly origin: string;
  readonly fixture: ReturnType<typeof createFakeCaocaoFixture>;
  readonly state: FakeCaocaoState;
  close(): Promise<void>;
};

const resolveServerOrigin = (server: Server, hostname: string): string => {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fake Caocao server did not expose a TCP address");
  }
  return `http://${hostname}:${(address as AddressInfo).port}`;
};

export async function startFakeCaocaoServer(
  options: FakeCaocaoServerOptions = {},
): Promise<StartedFakeCaocaoServer> {
  const hostname = options.hostname ?? "127.0.0.1";
  const port = options.port ?? 0;
  const fixture = createFakeCaocaoFixture();
  const state = new FakeCaocaoState();
  const verifyRequests = options.verifyRequests ?? true;

  const server = createServer((req, res) => {
    void handleFakeCaocaoRequest(req, res, {
      fixture,
      state,
      verifyRequests,
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, hostname, resolve);
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
    origin: resolveServerOrigin(server, hostname),
    state,
  };
}
