"use strict";

const parsePositiveInt = (raw, fallback) => {
  if (!raw) return fallback;
  const num = Number.parseInt(raw, 10);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
};

const readRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const parseTickUrls = (raw) => {
  const urls = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (urls.length === 0) {
    throw new Error("JOB_RUNNER_TICK_URL contains no valid URL");
  }
  return urls;
};

const triggerSingleUrl = async (tickUrl, token, requestTimeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(tickUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": token,
      },
      body: "{}",
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`status=${response.status}, body=${body}`);
    }

    return {
      url: tickUrl,
      statusCode: response.status,
      body,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

exports.handler = async function handler() {
  const tickUrls = parseTickUrls(readRequiredEnv("JOB_RUNNER_TICK_URL"));
  const token = readRequiredEnv("JOB_RUNNER_INTERNAL_TOKEN");
  const requestTimeoutMs = parsePositiveInt(
    process.env.JOB_RUNNER_TRIGGER_REQUEST_TIMEOUT_MS,
    25_000,
  );

  const settled = await Promise.allSettled(
    tickUrls.map(async (tickUrl) => {
      try {
        return await triggerSingleUrl(tickUrl, token, requestTimeoutMs);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`[${tickUrl}] ${message}`);
      }
    }),
  );

  const successes = [];
  const failures = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      successes.push(result.value);
    } else {
      failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `job tick failed for ${failures.length}/${tickUrls.length} url(s): ${failures.join(" | ")}`,
    );
  }

  return {
    ok: true,
    total: tickUrls.length,
    succeeded: successes.length,
    results: successes,
  };
};
