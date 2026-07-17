import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const normalizeEnvKey = (key: string): string =>
  process.platform === "win32" ? key.toUpperCase() : key;

const externalEnvKeys = new Set(Object.keys(process.env).map(normalizeEnvKey));

const workspaceEnvFiles = ["apps/web/.env", "apps/backend/.env"] as const;

export function loadWorkspaceEnvFiles(repoRoot: string): void {
  for (const relativePath of workspaceEnvFiles) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }

    const parsed = parseEnv(readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!externalEnvKeys.has(normalizeEnvKey(key))) {
        process.env[key] = value;
      }
    }
  }
}
