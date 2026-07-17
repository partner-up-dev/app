#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontendFilter = "@partner-up-dev/web";
const packageName = "@partner-up-dev/design-web";
const skillName = "design-web";
const skillRoot = resolve(repoRoot, "apps/web/node_modules", packageName, "skills", skillName);
const codexHookPath = resolve(repoRoot, ".codex", "hooks.json");
const doHookInstall = !process.argv.includes("--skip-hooks");
const sessionStartHookTimeoutSeconds = 60;
const hookArgs = ["exec", "intent", "hooks", "install", "--scope", "project", "--agents", "codex"];

const usage = `Usage:
  node scripts/sync-design-web-package.mjs [version-or-spec]

Examples:
  node scripts/sync-design-web-package.mjs
  node scripts/sync-design-web-package.mjs latest
  node scripts/sync-design-web-package.mjs 0.4.8
  node scripts/sync-design-web-package.mjs @partner-up-dev/design-web@0.4.8
  node scripts/sync-design-web-package.mjs --skip-hooks 0.4.9
`;

const print = (...args) => process.stdout.write(`${args.join(" ")}\n`);
const warn = (...args) => process.stderr.write(`Warning: ${args.join(" ")}\n`);

const configureProjectHooks = () => {
  if (!existsSync(codexHookPath)) {
    return;
  }

  try {
    const hooksConfig = JSON.parse(readFileSync(codexHookPath, "utf8"));
    if (!hooksConfig?.hooks || typeof hooksConfig.hooks !== "object") {
      return;
    }

    if (Array.isArray(hooksConfig.hooks.SessionStart)) {
      hooksConfig.hooks.SessionStart = hooksConfig.hooks.SessionStart.map((entry) => {
        if (!entry || typeof entry !== "object") {
          return entry;
        }

        if (Array.isArray(entry.hooks)) {
          entry.hooks = entry.hooks.map((hook) => {
            if (!hook || typeof hook !== "object") {
              return hook;
            }

            return {
              ...hook,
              timeout: sessionStartHookTimeoutSeconds,
            };
          });
        }

        return entry;
      });
    }

    delete hooksConfig.hooks.PreToolUse;

    writeFileSync(codexHookPath, JSON.stringify(hooksConfig, null, 2) + "\n", "utf8");
  } catch {
    warn(`Unable to parse or rewrite ${codexHookPath}, keep hook install result as-is.`);
  }
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${output}`);
  }

  return result.stdout ?? "";
};

const ensureSkillInIntentList = (jsonText) => {
  if (!jsonText.includes(`${packageName}#${skillName}`)) {
    throw new Error(`Intent list output does not include ${packageName}#${skillName}.`);
  }
};

const main = () => {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    print(usage);
    return;
  }

  const positionalArgs = args.filter((arg) => !arg.startsWith("-"));
  const input = positionalArgs[0] ?? "latest";
  const packageSpec = input.includes(packageName) ? input : `${packageName}@${input}`;
  const totalSteps = 3 + (doHookInstall ? 1 : 0);

  print(`[step 1/${totalSteps}] Sync package in frontend workspace: ${packageSpec}`);
  run("pnpm", ["--filter", frontendFilter, "add", packageSpec]);

  if (doHookInstall) {
    print(`[step 2/${totalSteps}] Install/refresh Codex session hook for design-web skill loading`);
    run("pnpm", hookArgs);
  } else {
    print(`[step 2/${totalSteps}] Skip Codex hook install (passed --skip-hooks)`);
  }
  configureProjectHooks();
  print(
    `[step 2/${totalSteps}] SessionStart hook policy applied; PreToolUse removed; timeout set to ${sessionStartHookTimeoutSeconds}s`,
  );

  print(`[step 3/${totalSteps}] Verify intent skill discovery for ${packageName}#${skillName}`);
  const listOutput = run("pnpm", ["exec", "intent", "list", "--json"]);
  ensureSkillInIntentList(listOutput);

  print(`[step ${totalSteps}/${totalSteps}] Load + validate package-shipped skill`);
  run("pnpm", ["exec", "intent", "load", `${packageName}#${skillName}`]);
  run("pnpm", ["exec", "intent", "validate", skillRoot]);

  const packageJsonPath = resolve(repoRoot, "apps/web/node_modules", packageName, "package.json");
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    print(
      `Done. Current installed version: ${packageName}@${packageJson.version} (stored in apps/web/package.json).`,
    );
  } catch {
    warn(`Installed package file not found or unreadable: ${packageJsonPath}`);
    print("Done.");
  }
};

main();
