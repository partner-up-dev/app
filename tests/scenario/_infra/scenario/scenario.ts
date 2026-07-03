import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestContext } from "vitest";
import { test } from "vitest";

export type ScenarioRecordValue =
  | null
  | boolean
  | number
  | string
  | readonly ScenarioRecordValue[]
  | { readonly [key: string]: ScenarioRecordValue };

export type ScenarioContext = {
  readonly name: string;
  record(key: string, value: ScenarioRecordValue): void;
  getRecords(): Readonly<Record<string, ScenarioRecordValue>>;
};

type ScenarioOptions = {
  timeoutMs?: number;
};

const resultDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.result/scenario-records",
);

const sanitizeScenarioName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "scenario";

const summarizeRecords = (records: Readonly<Record<string, ScenarioRecordValue>>): string => {
  const entries = Object.entries(records).slice(0, 8);
  if (entries.length === 0) {
    return "  records: {}";
  }

  return entries
    .map(([key, value]) => {
      const encoded = JSON.stringify(value);
      const summary = encoded.length > 120 ? `${encoded.slice(0, 117)}...` : encoded;
      return `  ${key}: ${summary}`;
    })
    .join("\n");
};

const writeScenarioRecords = (
  name: string,
  records: Readonly<Record<string, ScenarioRecordValue>>,
): string => {
  mkdirSync(resultDirectory, { recursive: true });
  const artifactPath = path.join(resultDirectory, `${sanitizeScenarioName(name)}.json`);
  writeFileSync(artifactPath, `${JSON.stringify({ scenario: name, records }, null, 2)}\n`);
  return artifactPath;
};

export function scenario(
  name: string,
  run: (context: ScenarioContext) => Promise<void>,
  options: ScenarioOptions = {},
): void {
  const runScenario = async ({ annotate }: TestContext) => {
    const records: Record<string, ScenarioRecordValue> = {};
    const context: ScenarioContext = {
      name,
      record(key, value) {
        records[key] = value;
      },
      getRecords() {
        return records;
      },
    };

    try {
      await run(context);
    } catch (error) {
      const artifactPath = writeScenarioRecords(name, records);
      await annotate(`scenario records: ${artifactPath}`, {
        path: artifactPath,
        contentType: "application/json",
      });
      if (error instanceof Error) {
        error.message = `${error.message}\nScenario context:\n${summarizeRecords(
          records,
        )}\n  artifact: ${artifactPath}`;
      }
      throw error;
    }
  };

  if (options.timeoutMs) {
    test(name, { timeout: options.timeoutMs }, runScenario);
    return;
  }
  test(name, runScenario);
}
