import { execFileSync } from "node:child_process";

export interface BuildMetadata {
  backendCommitHash: string;
  repositoryUrl: string;
}

const normalizeValue = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readGitValue = (): string | null => {
  try {
    const output = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return normalizeValue(output);
  } catch {
    return null;
  }
};

const REPOSITORY_URL = "https://github.com/partner-up-dev/app";

const backendCommitHash =
  normalizeValue(process.env.BACKEND_COMMIT_HASH) ?? readGitValue() ?? "unknown";

export const buildMetadata: BuildMetadata = {
  backendCommitHash,
  repositoryUrl: REPOSITORY_URL,
};
