import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";

const isWindows = process.platform === "win32";

const normalizeEnvValue = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getGlobalArgs = () => {
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf("--");

  return separatorIndex === -1 ? args : args.slice(0, separatorIndex);
};

const getArgValue = (args, flag) => {
  const prefixedArg = args.find((arg) => arg.startsWith(`${flag}=`));
  const argIndex = args.indexOf(flag);
  const separateArg = argIndex === -1 ? undefined : args[argIndex + 1];
  const value = prefixedArg?.slice(flag.length + 1) ?? separateArg;

  if (value === undefined || value.startsWith("-")) {
    return null;
  }

  return normalizeEnvValue(value);
};

const isCustomTld = (tld) => tld !== null && tld !== "local" && tld !== "localhost";

const getConfiguredTld = (args) =>
  getArgValue(args, "--tld") ?? normalizeEnvValue(process.env.PORTLESS_TLD);

const appendDomainBaseToPortlessName = (name, domainBase) =>
  name.endsWith(`.${domainBase}`) ? name : `${name}.${domainBase}`;

const getForwardedArgs = () => {
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf("--");
  const globalEndIndex = separatorIndex === -1 ? args.length : separatorIndex;
  const domainBase = normalizeEnvValue(process.env.PORTLESS_DOMAIN_BASE);
  const configuredTld = getConfiguredTld(args);
  const shouldUseCustomTld = isCustomTld(configuredTld);
  const forwardedArgs = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (index >= globalEndIndex) {
      forwardedArgs.push(arg);
      continue;
    }

    if (shouldUseCustomTld && arg === "--lan") {
      continue;
    }

    if (shouldUseCustomTld && arg === "--ip") {
      index += 1;
      continue;
    }

    if (shouldUseCustomTld && arg.startsWith("--ip=")) {
      continue;
    }

    if (domainBase && arg.startsWith("--name=")) {
      forwardedArgs.push(
        `--name=${appendDomainBaseToPortlessName(arg.slice("--name=".length), domainBase)}`,
      );
      continue;
    }

    if (domainBase && index > 0 && args[index - 1] === "--name") {
      forwardedArgs.push(appendDomainBaseToPortlessName(arg, domainBase));
      continue;
    }

    forwardedArgs.push(arg);
  }

  return forwardedArgs;
};

const hasGlobalFlag = (flag) => getGlobalArgs().includes(flag);

const hasGlobalFlagValue = (flag) => {
  const args = getGlobalArgs();

  return args.some((arg, index) => {
    if (arg.startsWith(`${flag}=`)) {
      return true;
    }

    return arg === flag && args[index + 1] !== undefined && !args[index + 1].startsWith("-");
  });
};

const isUsableIpv4Address = (address) => {
  const octets = address.split(".").map((octet) => Number.parseInt(octet, 10));

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  const [first, second] = octets;

  return first !== 0 && first !== 127 && first < 224 && !(first === 169 && second === 254);
};

const getLinuxDefaultRouteInterface = () => {
  if (process.platform !== "linux") {
    return null;
  }

  try {
    const routeTable = readFileSync("/proc/net/route", "utf8");

    for (const line of routeTable.trim().split("\n").slice(1)) {
      const [iface, destination, _gateway, flagsText] = line.trim().split(/\s+/);
      const flags = Number.parseInt(flagsText, 16);

      if (destination === "00000000" && (flags & 0x1) === 0x1) {
        return iface;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const detectLanIpv4Address = () => {
  const interfaces = networkInterfaces();
  const candidates = Object.entries(interfaces).flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter(
        (address) =>
          address.family === "IPv4" && !address.internal && isUsableIpv4Address(address.address),
      )
      .map((address) => ({ address: address.address, name })),
  );

  const defaultRouteInterface = getLinuxDefaultRouteInterface();
  const defaultRouteCandidate = candidates.find(
    (candidate) => candidate.name === defaultRouteInterface,
  );

  if (defaultRouteCandidate) {
    return defaultRouteCandidate.address;
  }

  if (candidates.length === 1) {
    return candidates[0].address;
  }

  return null;
};

const shouldDetectLanIp = (env) =>
  !env.PORTLESS_LAN_IP &&
  !hasGlobalFlagValue("--ip") &&
  !isCustomTld(getConfiguredTld(getGlobalArgs())) &&
  (env.PORTLESS_LAN === "1" || env.PORTLESS_LAN === "true" || hasGlobalFlag("--lan"));

const shouldUseLanMode = (env) => {
  if (isCustomTld(getConfiguredTld(getGlobalArgs()))) {
    return false;
  }

  return (
    env.PORTLESS_LAN === "1" ||
    env.PORTLESS_LAN === "true" ||
    hasGlobalFlag("--lan") ||
    hasGlobalFlagValue("--ip")
  );
};

const getPortlessEnv = () => {
  const env = { ...process.env };

  if (!shouldUseLanMode(env)) {
    env.PORTLESS_LAN = "0";
    delete env.PORTLESS_LAN_IP;
  }

  if (shouldDetectLanIp(env)) {
    const lanIp = detectLanIpv4Address();

    if (lanIp) {
      env.PORTLESS_LAN_IP = lanIp;
      console.log(`Using LAN IP ${lanIp} for portless.`);
    }
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

const child = spawn("portless", getForwardedArgs(), {
  env: getPortlessEnv(),
  shell: isWindows,
  stdio: "inherit",
});

const forwardSignal = (signal) => {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
  }
};

const forwardSigint = () => forwardSignal("SIGINT");
const forwardSigterm = () => forwardSignal("SIGTERM");

process.once("SIGINT", forwardSigint);
process.once("SIGTERM", forwardSigterm);

child.on("error", (error) => {
  if (error.code === "ENOENT") {
    console.error(
      "portless is not available on PATH. Install it globally with: npm install -g portless",
    );
    process.exit(1);
  }

  console.error(`portless failed to start: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  process.off("SIGINT", forwardSigint);
  process.off("SIGTERM", forwardSigterm);

  if (signal) {
    console.error(`portless exited after receiving signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
