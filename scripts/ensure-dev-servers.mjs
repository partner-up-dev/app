import { spawn, spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { request } from "node:https";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const defaultRouteNames = new Set(["frontend", "backend"]);

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
  {
    name: "caocao",
    portlessName: "caocao.partner-up",
    portlessArgs: [
      "--name",
      "caocao.partner-up",
      "--force",
      "--",
      "pnpm",
      "--filter",
      "@partner-up-dev/fake-caocao-server",
      "dev",
    ],
    readinessPath: "/health",
  },
  {
    name: "wechatpay",
    portlessName: "wechatpay.partner-up",
    portlessArgs: [
      "--name",
      "wechatpay.partner-up",
      "--force",
      "--",
      "pnpm",
      "--filter",
      "@partner-up-dev/fake-wechatpay-server",
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

const selectedRouteName = parseOptionalStringArg("only");

const getSelectedRouteDefinitions = () => {
  if (!selectedRouteName) {
    return routeDefinitions.filter((route) => defaultRouteNames.has(route.name));
  }

  const selectedRoutes = routeDefinitions.filter((route) => route.name === selectedRouteName);

  if (selectedRoutes.length === 0) {
    throw new Error(
      `Unknown dev server "${selectedRouteName}". Expected one of: ${routeDefinitions
        .map((route) => route.name)
        .join(", ")}`,
    );
  }

  return selectedRoutes;
};

const selectedRouteDefinitions = getSelectedRouteDefinitions();

const getRuntimeEnv = () => {
  const env = { ...process.env };
  const lanIp = parseOptionalStringArg("ip");
  const stateDir = parseOptionalStringArg("state-dir");
  const shouldUseLan = process.argv.includes("--lan") || lanIp || isTruthyEnv(env.PORTLESS_LAN);

  if (stateDir) {
    env.PORTLESS_STATE_DIR = stateDir;
  }

  if (shouldUseLan) {
    env.PORTLESS_LAN = "1";
  } else {
    env.PORTLESS_LAN = "0";
  }

  if (lanIp) {
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
const routes = selectedRouteDefinitions.map((route) => ({
  ...route,
  url: `https://${route.portlessName}.${portlessTld}`,
}));
const routeGroupLabel = `${routes.map((route) => route.name).join(" and ")} dev server${
  routes.length === 1 ? "" : "s"
}`;
const routeGroupSubject = `${routeGroupLabel[0].toUpperCase()}${routeGroupLabel.slice(1)}`;
const routeGroupVerb = routes.length === 1 ? "is" : "are";
const routeWord = routes.length === 1 ? "route" : "routes";

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
const shouldRunForeground = process.argv.includes("--foreground");
const foregroundReadyMarker = "DEV_ENSURE_FOREGROUND_READY";

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

const startDetachedDevServer = (route) => {
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

const startForegroundDevServers = (routesToStart) => {
  const children = new Set();
  let exitCode = 0;
  let isTerminating = false;
  let hasStartedChildren = false;
  let resolveExitCode;
  const exitPromise = new Promise((resolve) => {
    resolveExitCode = resolve;
  });
  const handleSigint = () => terminateChildren("SIGINT");
  const handleSigterm = () => terminateChildren("SIGTERM");

  const cleanup = () => {
    process.off("SIGINT", handleSigint);
    process.off("SIGTERM", handleSigterm);
  };

  const resolveIfDone = () => {
    if (hasStartedChildren && children.size === 0) {
      cleanup();
      resolveExitCode(exitCode);
    }
  };

  function terminateChildren(signal) {
    isTerminating = true;

    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
      }
    }
  }

  process.once("SIGINT", handleSigint);
  process.once("SIGTERM", handleSigterm);

  for (const route of routesToStart) {
    console.log(`Starting ${route.name} dev server in foreground through portless: ${route.url}`);

    const child = spawn(process.execPath, ["./scripts/portless.mjs", ...route.portlessArgs], {
      cwd: repoRoot,
      env: runtimeEnv,
      stdio: "inherit",
      windowsHide: true,
    });

    children.add(child);

    child.on("error", (error) => {
      console.error(`Failed to start ${route.name} dev server: ${error.message}`);
      children.delete(child);
      exitCode = 1;
      terminateChildren("SIGTERM");
      resolveIfDone();
    });

    child.on("exit", (code, signal) => {
      children.delete(child);

      if (!isTerminating) {
        if (signal) {
          console.error(`${route.name} dev server exited after receiving signal ${signal}.`);
          exitCode = 1;
        } else {
          exitCode = code ?? 1;

          if (exitCode === 0) {
            console.log(`${route.name} dev server exited.`);
          } else {
            console.error(`${route.name} dev server exited with code ${exitCode}.`);
          }
        }

        terminateChildren("SIGTERM");
      }

      resolveIfDone();
    });
  }

  hasStartedChildren = true;
  resolveIfDone();

  return { exitPromise, stop: terminateChildren };
};

const sleep = (seconds) =>
  new Promise((resolveSleep) => {
    setTimeout(resolveSleep, seconds * 1000);
  });

const waitForRoutesReady = async (readyMessage) => {
  let unavailableRoutes = routes;
  const deadline = Date.now() + timeoutSeconds * 1000;

  do {
    await sleep(pollIntervalSeconds);

    const currentRouteList = getPortlessListText();
    unavailableRoutes = await getUnavailableRoutes(currentRouteList);

    if (unavailableRoutes.length === 0) {
      console.log(readyMessage);
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

const main = async () => {
  assertCommandAvailable("portless");
  assertCommandAvailable("pnpm");

  const initialRouteList = getPortlessListText();
  let unavailableRoutes = await getUnavailableRoutes(initialRouteList);

  if (shouldRunForeground) {
    if (unavailableRoutes.length === 0) {
      console.log(`${routeGroupSubject} ${routeGroupVerb} already ready.`);
      console.log(
        `Foreground mode will take over the ${routeWord} so this terminal owns the logs.`,
      );
    } else {
      console.log(`Foreground mode will start or take over the ${routeGroupLabel} ${routeWord}.`);
    }

    for (const route of routes) {
      console.log(`  ${route.url}`);
    }

    const foreground = startForegroundDevServers(routes);
    let firstForegroundResult;

    try {
      firstForegroundResult = await Promise.race([
        waitForRoutesReady(`${routeGroupSubject} ${routeGroupVerb} ready:`).then(() => ({
          type: "ready",
        })),
        foreground.exitPromise.then((exitCode) => ({
          exitCode,
          type: "exit",
        })),
      ]);
    } catch (error) {
      foreground.stop("SIGTERM");
      throw error;
    }

    if (firstForegroundResult.type === "exit") {
      process.exit(firstForegroundResult.exitCode);
    }

    console.log(foregroundReadyMarker);

    const exitCode = await foreground.exitPromise;
    process.exit(exitCode);
  }

  if (unavailableRoutes.length === 0) {
    console.log(`${routeGroupSubject} ${routeGroupVerb} already registered:`);
    for (const route of routes) {
      console.log(`  ${route.url}`);
    }
    return;
  }

  for (const route of unavailableRoutes) {
    startDetachedDevServer(route);
  }

  await waitForRoutesReady(`${routeGroupSubject} ${routeGroupVerb} ready:`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
