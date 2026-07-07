export interface FrontendBuildInfo {
  frontendCommitHash: string;
  repositoryUrl: string;
}

const normalizeValue = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const frontendBuildInfo: FrontendBuildInfo = {
  frontendCommitHash:
    normalizeValue(import.meta.env.VITE_FRONTEND_COMMIT_HASH) ?? "unknown",
  repositoryUrl: "https://github.com/partner-up-dev/app",
};
