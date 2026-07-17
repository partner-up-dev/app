import { spawnSync } from "node:child_process";

const strict = process.argv.includes("--strict");
const report = process.argv.includes("--report");

if (strict === report) {
  console.error("Usage: node scripts/run-semgrep.mjs --report|--strict");
  process.exit(2);
}

const args = [
  "scan",
  "--config",
  "tools/semgrep/security.yml",
  "--metrics=off",
  "--quiet",
  strict ? "--error" : "--no-error",
];

const resolveCommand = process.platform === "win32" ? "where semgrep" : "command -v semgrep";
const resolved = spawnSync(resolveCommand, {
  stdio: "ignore",
  shell: true,
});

if ((resolved.status ?? 1) !== 0) {
  const message = strict
    ? "semgrep is not installed; the strict security check cannot run. CI installs semgrep before running this command."
    : "semgrep is not installed; skipping the security report. CI installs semgrep before running this command.";

  if (strict) {
    console.error(message);
    process.exit(1);
  }

  console.warn(message);
  process.exit(0);
}

const result = spawnSync("semgrep", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  const message =
    result.error.code === "ENOENT"
      ? strict
        ? "semgrep is not installed; the strict security check cannot run. CI installs semgrep before running this command."
        : "semgrep is not installed; skipping the security report. CI installs semgrep before running this command."
      : `semgrep failed to start: ${result.error.message}`;

  if (strict) {
    console.error(message);
    process.exit(1);
  }

  console.warn(message);
  process.exit(0);
}

if (strict) {
  process.exit(result.status ?? 1);
}

if ((result.status ?? 0) !== 0) {
  console.warn(
    `semgrep exited with status ${result.status ?? "unknown"}; report mode remains non-blocking.`,
  );
}
