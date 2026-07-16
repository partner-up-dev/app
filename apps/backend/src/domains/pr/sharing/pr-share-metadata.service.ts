import crypto from "crypto";
import { env } from "../../../lib/env";
import { buildPRRouteSummary } from "../../pr-core/services/pr-place-mode.service";
import type { PublicPR } from "../read-models/public-pr-view.service";

export type PRCanonicalShareMetadata = {
  title: string;
  description: string;
  canonicalPath: string;
  defaultImagePath: string;
  revision: string;
};

const DEFAULT_SHARE_IMAGE_PATH = "/share-logo.png";

const normalizeWhitespace = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const truncate = (value: string, maxLength: number): string => {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
};

const joinSummaryParts = (parts: Array<string | null | undefined>): string =>
  truncate(
    parts
      .map((part) => normalizeWhitespace(part))
      .filter((part) => part.length > 0)
      .join(" · "),
    80,
  );

const resolveCanonicalPath = (pr: Pick<PublicPR, "id">): string => `/pr/${pr.id}`;

const resolveTitle = (pr: PublicPR): string => {
  const explicitTitle = normalizeWhitespace(pr.title);
  if (explicitTitle.length > 0) {
    return explicitTitle;
  }

  const type = normalizeWhitespace(pr.type);
  if (type.length > 0) {
    return type;
  }

  const routeSummary = buildPRRouteSummary(pr.route);
  if (routeSummary) {
    return routeSummary;
  }

  const location = normalizeWhitespace(pr.location);
  if (location.length > 0) {
    return location;
  }

  return "搭子请求";
};

const resolveDescription = (pr: PublicPR): string => {
  const summary = joinSummaryParts([
    pr.type,
    buildPRRouteSummary(pr.route),
    pr.location,
    pr.budget,
    ...pr.preferences.slice(0, 2),
    pr.notes,
  ]);
  if (summary.length > 0) {
    return summary;
  }

  return "查看搭子请求";
};

const buildRevision = (pr: PublicPR): string => {
  const revisionSource = JSON.stringify({
    id: pr.id,
    status: pr.status,
    title: pr.title ?? null,
    type: pr.type,
    time: pr.time,
    location: pr.location,
    route: pr.route,
    minPartners: pr.minPartners,
    maxPartners: pr.maxPartners,
    budget: pr.budget,
    preferences: pr.preferences,
    notes: pr.notes,
    createdAt: pr.createdAt.toISOString(),
    wechatThumbnailCreatedAt: pr.wechatThumbnail?.createdAt ?? null,
  });

  return crypto.createHash("sha1").update(revisionSource).digest("hex");
};

const resolveDefaultImagePath = (): string => {
  const frontendUrl = env.FRONTEND_URL?.trim();
  if (!frontendUrl) {
    return DEFAULT_SHARE_IMAGE_PATH;
  }

  try {
    return new URL(DEFAULT_SHARE_IMAGE_PATH, frontendUrl).toString();
  } catch {
    return DEFAULT_SHARE_IMAGE_PATH;
  }
};

export const buildPRCanonicalShareMetadata = (pr: PublicPR): PRCanonicalShareMetadata => ({
  title: resolveTitle(pr),
  description: resolveDescription(pr),
  canonicalPath: resolveCanonicalPath(pr),
  defaultImagePath: resolveDefaultImagePath(),
  revision: buildRevision(pr),
});
