#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { classifyReport, scanArchitecture, stableJson } from "./lib.mjs";

function parseArguments(argv) {
  const options = { baseline: undefined, checkNew: false, format: "text", root: process.cwd() };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--baseline") options.baseline = argv[++index];
    else if (argument === "--format") options.format = argv[++index];
    else if (argument === "--check-new") options.checkNew = true;
    else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function usage() {
  return [
    "Usage: node tools/architecture-fitness/cli.mjs [options]",
    "",
    "  --root <path>       repository root (default: cwd)",
    "  --baseline <path>   task-local reviewed baseline JSON",
    "  --format <text|json>",
    "  --check-new         exit 1 only when findings are absent from the supplied baseline",
  ].join("\n");
}

function textReport(report) {
  const counts = new Map();
  for (const item of report.findings) {
    const previous = counts.get(item.rule) ?? { known: 0, new: 0 };
    previous[item.classification] += 1;
    counts.set(item.rule, previous);
  }

  const lines = [
    "Architecture fitness report (report-first)",
    `scope ${report.scopeDigest}`,
    `files ${report.metrics.files}; edges ${report.metrics.edges}; unresolved ${report.metrics.unresolvedImports}`,
    `findings ${report.metrics.findings}; known ${report.classification.known}; new ${report.classification.new}; stale-known ${report.classification.staleKnown}`,
  ];

  for (const [rule, count] of [...counts].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`${rule}: known=${count.known} new=${count.new}`);
  }
  for (const item of report.findings) {
    lines.push(
      `${item.classification.toUpperCase()} ${item.rule} ${item.source}:${item.line} -> ${item.target}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }
  if (options.format !== "text" && options.format !== "json") {
    throw new Error(`Unsupported format: ${options.format}`);
  }
  if (options.checkNew && !options.baseline) {
    throw new Error("--check-new requires --baseline");
  }

  const baseline = options.baseline
    ? JSON.parse(fs.readFileSync(path.resolve(options.baseline), "utf8"))
    : { knownFindings: [] };
  const report = classifyReport(scanArchitecture(options.root), baseline);
  process.stdout.write(options.format === "json" ? stableJson(report) : textReport(report));
  if (options.checkNew && report.classification.new > 0) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage()}\n`);
  process.exitCode = 2;
}
