import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { request } from "node:https";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const routeDefinitions = [
  {
    name: "frontend",
    portlessName: "partner-up",
    portlessArgs: [
      "--name",
      "partner-up",
      "--force",
      "--",
      "pnpm",
      "--filter",
      "@partner-up-dev/frontend",
      "dev",
    ],
    readinessPath: "/",
  },
  {
    name: "backend",
    portlessName: "api.partner-up",
    portlessArgs: [
      "--name",
      "api.partner-up",
      "--force",
      "--",
      "pnpm",
      "--filter",
      "@partner-up-dev/backend",
      "dev",
    ],
    readinessPath: "/health",
  },
];

const parseOptionalStringArg = (name) => {
  const prefixedArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  const argIndex = process.argv.indexOf(`--${name}`);
  const separateArg = argIndex === -1 ? undefined : process.argv[argIndex + 1];
  const argValue = prefixedArg?.slice(name.length + 3) ?? separateArg;

  if (argValue === undefined || argValue.startsWith("--")) {
    return null;
  }

  const value = argValue.trim();
  return value.length > 0 ? value : null;
};

const isTruthyEnv = (value) => value === "1" || value === "true";

const normalizeEnvValue = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getRuntimeEnv = () => {
  const env = { ...process.env };
  const lanIp = parseOptionalStringArg("ip");
  const stateDir = parseOptionalStringArg("state-dir");

  if (stateDir) {
    env.PORTLESS_STATE_DIR = stateDir;
  }

  if (process.argv.includes("--lan")) {
    env.PORTLESS_LAN = "1";
  }

  if (lanIp) {
    env.PORTLESS_LAN = "1";
    env.PORTLESS_LAN_IP = lanIp;
  }

  if (isWindows) {
    const gitOpenSslBin = "C:\\Program Files\\Git\\usr\\bin";
    const gitOpenSslPath = join(gitOpenSslBin, "openssl.exe");

    if (existsSync(gitOpenSslPath)) {
      const currentPath = env.Path ?? env.PATH ?? "";
      env.Path = `${gitOpenSslBin};${currentPath}`;
    }
  }

  return env;
};

const runtimeEnv = getRuntimeEnv();

const getPortlessTld = () => {
  if (isTruthyEnv(runtimeEnv.PORTLESS_LAN)) {
    return "local";
  }

  return normalizeEnvValue(runtimeEnv.PORTLESS_TLD) ?? "localhost";
};

const portlessTld = getPortlessTld();
const routes = routeDefinitions.map((route) => ({
  ...route,
  url: `https://${route.portlessName}.${portlessTld}`,
}));

const parsePositiveIntegerArg = (name, fallback) => {
  const prefixedArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  const argIndex = process.argv.indexOf(`--${name}`);
  const separateArg = argIndex === -1 ? undefined : process.argv[argIndex + 1];
  const argValue = prefixedArg?.slice(name.length + 3) ?? separateArg;

  if (argValue === undefined) {
    return fallback;
  }

  const value = Number.parseInt(argValue, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be greater than 0.`);
  }

  return value;
};

const timeoutSeconds = parsePositiveIntegerArg("timeout-seconds", 90);
const pollIntervalSeconds = parsePositiveIntegerArg("poll-interval-seconds", 2);

const assertCommandAvailable = (commandName) => {
  const command = isWindows ? "where" : "command";
  const args = isWindows ? [commandName] : ["-v", commandName];
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: runtimeEnv,
    shell: isWindows || command === "command",
    stdio: "ignore",
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(
      `${commandName} is not available on PATH. Install it globally with: npm install -g ${commandName}`,
    );
  }
};

const getPortlessListText = () => {
  const result = spawnSync("portless", ["list"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: runtimeEnv,
    shell: isWindows,
  });

  if (result.error) {
    throw new Error(`portless list failed: ${result.error.message}`);
  }

  if ((result.status ?? 1) !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`portless list failed:\n${output}`);
  }

  return [result.stdout, result.stderr].filter(Boolean).join("\n");
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getRegisteredRouteUrl = (routeListText, route) => {
  const routeUrl = new URL(route.url);
  const routeUrlPattern = new RegExp(
    `https://${escapeRegExp(routeUrl.hostname)}(?::\\d+)?(?=\\s|$)`,
  );
  const match = routeListText.match(routeUrlPattern);

  return match ? match[0] : null;
};

const isReadyStatus = (statusCode) => statusCode >= 200 && statusCode < 400;

const isRouteHttpReady = (route, registeredUrl) =>
  new Promise((resolveReady) => {
    const routeUrl = new URL(route.readinessPath, registeredUrl);
    const req = request(
      {
        headers: {
          Host: routeUrl.host,
        },
        host: "127.0.0.1",
        method: "HEAD",
        path: `${routeUrl.pathname}${routeUrl.search}`,
        port: routeUrl.port === "" ? 443 : Number(routeUrl.port),
        rejectUnauthorized: false,
        servername: routeUrl.hostname,
        timeout: 3_000,
      },
      (res) => {
        res.resume();
        resolveReady(isReadyStatus(res.statusCode ?? 599));
      },
    );

    req.on("error", () => {
      resolveReady(false);
    });

    req.on("timeout", () => {
      req.destroy();
      resolveReady(false);
    });

    req.end();
  });

const getUnavailableRoutes = async (routeListText) => {
  const routeRegistrations = routes.map((route) => ({
    registeredUrl: getRegisteredRouteUrl(routeListText, route),
    route,
  }));
  const unregisteredRoutes = routeRegistrations
    .filter((registration) => registration.registeredUrl === null)
    .map((registration) => registration.route);
  const registeredRoutes = routeRegistrations.filter(
    (registration) => registration.registeredUrl !== null,
  );
  const readinessChecks = await Promise.all(
    registeredRoutes.map(async ({ registeredUrl, route }) => ({
      ready: await isRouteHttpReady(route, registeredUrl),
      route,
    })),
  );
  const unreadyRoutes = readinessChecks
    .filter((result) => !result.ready)
    .map((result) => result.route);

  return [...unregisteredRoutes, ...unreadyRoutes];
};

const getTimestamp = () =>
  new Date()
    .toISOString()
    .replaceAll("-", "")
    .replace("T", "-")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "");

const startDevServer = (route) => {
  const logDir = join(repoRoot, ".codex-tmp", "dev-servers");
  mkdirSync(logDir, { recursive: true });

  const stamp = getTimestamp();
  const stdoutPath = join(logDir, `${stamp}-${route.name}.out.log`);
  const stderrPath = join(logDir, `${stamp}-${route.name}.err.log`);

  console.log(`Starting ${route.name} dev server through portless: ${route.url}`);
  console.log(`Logs: ${stdoutPath}`);

  const stdoutFd = openSync(stdoutPath, "a");
  const stderrFd = openSync(stderrPath, "a");

  try {
    const child = spawn(process.execPath, ["./scripts/portless.mjs", ...route.portlessArgs], {
      cwd: repoRoot,
      detached: true,
      env: runtimeEnv,
      stdio: ["ignore", stdoutFd, stderrFd],
      windowsHide: true,
    });

    child.unref();
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
  }
};

const sleep = (seconds) =>
  new Promise((resolveSleep) => {
    setTimeout(resolveSleep, seconds * 1000);
  });

const main = async () => {
  assertCommandAvailable("portless");
  assertCommandAvailable("pnpm");

  const initialRouteList = getPortlessListText();
  let unavailableRoutes = await getUnavailableRoutes(initialRouteList);

  if (unavailableRoutes.length === 0) {
    console.log("Frontend and backend dev servers are already registered:");
    for (const route of routes) {
      console.log(`  ${route.url}`);
    }
    return;
  }

  for (const route of unavailableRoutes) {
    startDevServer(route);
  }

  const deadline = Date.now() + timeoutSeconds * 1000;

  do {
    await sleep(pollIntervalSeconds);

    const currentRouteList = getPortlessListText();
    unavailableRoutes = await getUnavailableRoutes(currentRouteList);

    if (unavailableRoutes.length === 0) {
      console.log("Frontend and backend dev servers are ready:");
      for (const route of routes) {
        console.log(`  ${route.url}`);
      }
      return;
    }
  } while (Date.now() < deadline);

  throw new Error(
    `Timed out waiting for dev server route(s): ${unavailableRoutes
      .map((route) => route.name)
      .join(", ")}`,
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
