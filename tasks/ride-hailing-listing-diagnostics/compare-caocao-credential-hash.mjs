#!/usr/bin/env node
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";

const expected = {
  // EC1 /root/deployment/ride_hailing/0.1.0, ENV=production
  endpointBaseUrl: { length: 28, sha256Prefix: "6ca97fac109298a8" },
  caocaoClientId: { length: 16, sha256Prefix: "100d734c716415bc" },
  signKey: { length: 32, sha256Prefix: "c16b886f49e47e6b" },
};

const { values } = parseArgs({
  options: {
    endpointBaseUrl: { type: "string" },
    caocaoClientId: { type: "string" },
    signKey: { type: "string" },
  },
});

const compare = (name, actualValue) => {
  if (typeof actualValue !== "string") {
    return {
      name,
      ok: false,
      reason: "missing",
      expected: expected[name],
      actual: null,
    };
  }

  const actual = {
    length: actualValue.length,
    sha256Prefix: createHash("sha256").update(actualValue).digest("hex").slice(0, 16),
  };
  const ok =
    actual.length === expected[name].length &&
    actual.sha256Prefix === expected[name].sha256Prefix;

  return {
    name,
    ok,
    expected: expected[name],
    actual,
  };
};

const results = [
  compare("endpointBaseUrl", values.endpointBaseUrl),
  compare("caocaoClientId", values.caocaoClientId),
  compare("signKey", values.signKey),
];

for (const result of results) {
  console.log(
    [
      result.ok ? "OK " : "BAD",
      result.name,
      `expected(len=${result.expected.length}, sha256=${result.expected.sha256Prefix})`,
      result.actual
        ? `actual(len=${result.actual.length}, sha256=${result.actual.sha256Prefix})`
        : "actual=<missing>",
      result.reason ? `reason=${result.reason}` : null,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

process.exitCode = results.every((result) => result.ok) ? 0 : 1;
