import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const taskDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(taskDir, ".env");
const shouldApply = process.argv.includes("--apply");

const parseEnvLine = (line) => {
  const trimmed = line.trim();

  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return key.length > 0 ? [key, value] : null;
};

const loadLocalEnv = () => {
  if (!existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envPath, "utf8").split(/\r?\n/).flatMap((line) => {
      const entry = parseEnvLine(line);
      return entry === null ? [] : [entry];
    }),
  );
};

const normalizeEnvValue = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const requireConfig = (env, name) => {
  const value = normalizeEnvValue(env[name]);

  if (!value) {
    throw new Error(`Missing ${name}. Add it to ${envPath}.`);
  }

  return value;
};

const isValidIpv4Address = (value) => {
  const octets = value.split(".").map((octet) => Number.parseInt(octet, 10));
  return (
    octets.length === 4 &&
    octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
  );
};

const ensureTrailingDotless = (value) => value.replace(/\.+$/, "");

const resolveRecordDomains = (zone, records) =>
  records.split(",").flatMap((record) => {
    const value = ensureTrailingDotless(record.trim());

    if (value.length === 0) {
      return [];
    }

    return value.endsWith(`.${zone}`) || value === zone ? [value] : [`${value}.${zone}`];
  });

const callTechnitium = async (apiUrl, token, path, params) => {
  const url = new URL(path, apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const bodyText = await response.text();
  let body;

  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new Error(`Technitium returned non-JSON HTTP ${response.status}: ${bodyText}`);
  }

  if (!response.ok || body.status !== "ok") {
    const message =
      typeof body.errorMessage === "string"
        ? body.errorMessage
        : JSON.stringify(body, null, 2);
    throw new Error(`Technitium API failed for ${path}: HTTP ${response.status}: ${message}`);
  }

  return body;
};

const upsertARecord = async ({ apiUrl, domain, ipAddress, token, ttl, zone }) =>
  callTechnitium(apiUrl, token, "api/zones/records/add", {
    comments: "PartnerUp dev DNS smoke test",
    domain,
    ipAddress,
    overwrite: "true",
    ttl,
    type: "A",
    zone,
  });

const getARecord = async ({ apiUrl, domain, token, zone }) => {
  const body = await callTechnitium(apiUrl, token, "api/zones/records/get", {
    domain,
    listZone: "false",
    zone,
  });
  const records = Array.isArray(body.response?.records) ? body.response.records : [];
  return records.find(
    (record) =>
      record?.name === domain &&
      record?.type === "A" &&
      typeof record?.rData?.ipAddress === "string",
  );
};

const main = async () => {
  const env = { ...process.env, ...loadLocalEnv() };
  const apiUrl = requireConfig(env, "TECHNITIUM_API_URL");
  const token = requireConfig(env, "TECHNITIUM_API_TOKEN");
  const zone = ensureTrailingDotless(requireConfig(env, "DEV_DNS_ZONE"));
  const ipAddress = requireConfig(env, "DEV_DNS_TARGET_IP");
  const ttl = normalizeEnvValue(env.DEV_DNS_TTL) ?? "60";
  const records = normalizeEnvValue(env.DEV_DNS_RECORDS) ?? "web-app,api,caocao,wechatpay";
  const domains = resolveRecordDomains(zone, records);

  if (!isValidIpv4Address(ipAddress)) {
    throw new Error(`DEV_DNS_TARGET_IP must be an IPv4 address. Received: ${ipAddress}`);
  }

  if (!/^\d+$/.test(ttl) || Number.parseInt(ttl, 10) <= 0) {
    throw new Error(`DEV_DNS_TTL must be a positive integer. Received: ${ttl}`);
  }

  console.log(`${shouldApply ? "Applying" : "Dry run for"} Technitium A records:`);
  console.log(`  API: ${apiUrl}`);
  console.log(`  Zone: ${zone}`);
  console.log(`  Target IP: ${ipAddress}`);
  console.log(`  TTL: ${ttl}`);

  for (const domain of domains) {
    console.log(`  ${domain} -> ${ipAddress}`);
  }

  if (!shouldApply) {
    console.log("Dry run only. Re-run with --apply to write records.");
    return;
  }

  for (const domain of domains) {
    await upsertARecord({ apiUrl, domain, ipAddress, token, ttl, zone });
    const record = await getARecord({ apiUrl, domain, token, zone });
    const actualIpAddress = record?.rData?.ipAddress;

    if (actualIpAddress !== ipAddress) {
      throw new Error(
        `Verification failed for ${domain}. Expected ${ipAddress}, got ${
          actualIpAddress ?? "no A record"
        }.`,
      );
    }

    console.log(`Verified ${domain} -> ${actualIpAddress}`);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
