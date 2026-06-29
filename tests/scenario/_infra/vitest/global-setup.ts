import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import {
  startFakeWeChatPayServer,
  type StartedFakeWeChatPayServer,
} from "@partner-up-dev/fake-wechatpay-server";
import {
  startFakeCaocaoServer,
  type StartedFakeCaocaoServer,
} from "@partner-up-dev/fake-caocao-server";
import {
  createScenarioDatabase,
  installScenarioDatabaseEnv,
  resetAndMigrateTestDatabase,
  type ScenarioDatabaseHandle,
} from "../../../../apps/backend/tests/_infra/db/test-database";
import {
  startBackendServer,
  type StartedBackendServer,
} from "../server/backend-server";
import {
  startFrontendServer,
  type StartedFrontendServer,
} from "../server/frontend-server";
import { getAvailablePort } from "../server/ports";
import { loadWorkspaceEnvFiles } from "../environment/env-files";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

let backendServer: StartedBackendServer | null = null;
let database: ScenarioDatabaseHandle | null = null;
let fakeCaocaoServer: StartedFakeCaocaoServer | null = null;
let fakeWeChatPayServer: StartedFakeWeChatPayServer | null = null;
let frontendServer: StartedFrontendServer | null = null;

export async function setup(project: TestProject): Promise<void> {
  loadWorkspaceEnvFiles(repoRoot);

  const backendPort = await getAvailablePort();
  const frontendPort = await getAvailablePort();
  const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;

  process.env.PORT = String(backendPort);
  process.env.FRONTEND_URL = frontendBaseUrl;
  process.env.PAYMENT_NOTIFY_BASE_URL = `http://127.0.0.1:${backendPort}`;
  process.env.VITE_BACKEND_PORT = String(backendPort);
  process.env.VITE_PORT = String(frontendPort);
  process.env.VITE_API_URL = frontendBaseUrl;

  fakeWeChatPayServer = await startFakeWeChatPayServer();
  fakeCaocaoServer = await startFakeCaocaoServer({
    callbackBaseUrl: `http://127.0.0.1:${backendPort}`,
  });

  database = await createScenarioDatabase();
  const databaseUrl = installScenarioDatabaseEnv(database.databaseUrl);

  await resetAndMigrateTestDatabase(databaseUrl);

  backendServer = await startBackendServer(backendPort);
  frontendServer = await startFrontendServer({
    backendPort,
    port: frontendPort,
  });

  project.provide("systemScenarioEnvironment", {
    backendBaseUrl: backendServer.origin,
    fakeCaocao: {
      clientId: fakeCaocaoServer.fixture.clientId,
      origin: fakeCaocaoServer.origin,
      signKey: fakeCaocaoServer.fixture.signKey,
    },
    fakeWeChatPay: {
      apiV3Key: fakeWeChatPayServer.fixture.apiV3Key,
      appId: fakeWeChatPayServer.fixture.appId,
      mchId: fakeWeChatPayServer.fixture.mchId,
      merchantCertificate: fakeWeChatPayServer.fixture.merchantCertificate,
      origin: fakeWeChatPayServer.origin,
    },
    frontendBaseUrl: frontendServer.origin,
  });
}

export async function teardown(): Promise<void> {
  let closeDbError: unknown;

  await frontendServer?.close();
  await backendServer?.close();
  await fakeCaocaoServer?.close();
  await fakeWeChatPayServer?.close();
  frontendServer = null;
  backendServer = null;
  fakeCaocaoServer = null;
  fakeWeChatPayServer = null;

  try {
    const { closeDb } = await import("../../../../apps/backend/src/lib/db");
    await closeDb();
  } catch (error) {
    closeDbError = error;
  }

  await database?.cleanup();
  database = null;

  if (closeDbError) {
    throw closeDbError;
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    systemScenarioEnvironment: {
      backendBaseUrl: string;
      fakeCaocao: {
        origin: string;
        clientId: string;
        signKey: string;
      };
      fakeWeChatPay: {
        origin: string;
        appId: string;
        mchId: string;
        apiV3Key: string;
        merchantCertificate: {
          serialNo: string;
          privateKeyPem: string;
          certificatePem: string;
        };
      };
      frontendBaseUrl: string;
    };
  }
}
