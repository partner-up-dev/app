import { readFile } from "node:fs/promises";
import {
  parseRideHailingProviderRegistrationConfig,
  registerRideHailingProviderInstance,
} from "../../domains/ride-hailing/commands";

const configPath = process.argv[2];
if (!configPath) {
  console.error(
    "Usage: pnpm --filter @partner-up-dev/backend ride-hailing:register-provider <config.json>",
  );
  process.exit(1);
}

const rawConfig = await readFile(configPath, "utf8");
const config = parseRideHailingProviderRegistrationConfig(JSON.parse(rawConfig) as unknown);
const result = await registerRideHailingProviderInstance(config);

console.info(
  JSON.stringify(
    {
      providerInstanceId: result.providerInstanceId,
    },
    null,
    2,
  ),
);
