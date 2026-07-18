import { throwHttpProblem } from "../lib/problem-details";
import type { PartnerRequestFields, PRId } from "../entities/partner-request";
import { getPR } from "../domains/pr/queries";
import { ShareAIService, type PosterHtmlResponse } from "./ShareAIService";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import { assertPRDraftAccess } from "../domains/pr/services/draft-access-policy.service";
import { readPartnerRequestById } from "../domains/pr/services/pr-read.service";

const denyList: ReadonlyArray<RegExp> = [
  /<script/i,
  /on\w+\s*=/i,
  /javascript:/i,
  /<link/i,
  /<iframe/i,
];

const findUnsafePattern = (html: string): RegExp | null => {
  for (const pattern of denyList) {
    if (pattern.test(html)) {
      return pattern;
    }
  }
  return null;
};

const sanitizeGeneratedHtml = (html: string): string => {
  let sanitized = html;
  for (let i = 0; i < 3; i += 1) {
    const next = sanitized
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<script[^>]*>/gi, "")
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
      .replace(/(?:\s|\/)on[a-z0-9_-]+\s*=\s*(?:"[\s\S]*?"|'[\s\S]*?'|[^\s>]+)/gi, " ")
      .replace(/(?:\s|\/)on[a-z0-9_-]+\s*=\s*(?=>)/gi, " ")
      .replace(/javascript:/gi, "");

    if (next === sanitized) {
      break;
    }
    sanitized = next;
  }

  // Last-resort neutralization to avoid false positives on raw "on...=" tokens.
  sanitized = sanitized.replace(/on\w+\s*=/gi, "data-removed=");

  return sanitized;
};

const assertHtmlSafe = (html: string): void => {
  const pattern = findUnsafePattern(html);
  if (pattern) {
    return throwHttpProblem({
      status: 500,
      detail: `LLM produced unsafe HTML (${pattern.source})`,
    });
  }
};

const sanitizeAndAssertHtmlSafe = (html: string): string => {
  const firstPattern = findUnsafePattern(html);
  if (!firstPattern) {
    return html;
  }

  const sanitized = sanitizeGeneratedHtml(html);
  const secondPattern = findUnsafePattern(sanitized);
  if (secondPattern) {
    return throwHttpProblem({
      status: 500,
      detail: `LLM produced unsafe HTML (${secondPattern.source})`,
    });
  }

  return sanitized;
};

const buildStrictSafetyStylePrompt = (posterStylePrompt: string): string => {
  const safetySuffix = [
    "Safety constraints:",
    "- Do NOT use <script>, <link>, <iframe>.",
    "- Do NOT use inline event handlers like onclick/onerror.",
    "- Do NOT use javascript: URLs.",
    "- Return plain HTML only (no markdown code fences).",
  ].join("\n");

  if (posterStylePrompt.includes("Safety constraints:")) {
    return posterStylePrompt;
  }

  return `${posterStylePrompt}\n\n${safetySuffix}`;
};

const sanitizePosterResponse = (result: PosterHtmlResponse): PosterHtmlResponse => {
  return {
    ...result,
    html: sanitizeAndAssertHtmlSafe(result.html),
  };
};

const sanitizeThumbnailResponse = (result: PosterHtmlResponse): PosterHtmlResponse => {
  return {
    ...result,
    html: sanitizeAndAssertHtmlSafe(result.html),
  };
};

const assertNotEmptyHtml = (html: string): void => {
  if (html.trim().length === 0) {
    return throwHttpProblem({ status: 500, detail: "LLM produced empty HTML" });
  }
};

export class ShareService {
  private shareAIService: ShareAIService;
  private prRepo: PartnerRequestRepository;

  constructor() {
    this.shareAIService = new ShareAIService();
    this.prRepo = new PartnerRequestRepository();
  }

  async generateXiaohongshuPosterHtml(params: {
    prId: PRId;
    caption: string;
    posterStylePrompt: string;
  }): Promise<PosterHtmlResponse> {
    // Always generate HTML (poster image URL caching is handled via cache endpoints)
    const pr = await getPR(params.prId);
    const prFields = this.toPartnerRequestFields(pr);
    const result = await this.shareAIService.generateXiaohongshuPosterHtml({
      pr: prFields,
      caption: params.caption,
      posterStylePrompt: params.posterStylePrompt,
    });

    try {
      const safe = sanitizePosterResponse(result);
      assertNotEmptyHtml(safe.html);
      assertHtmlSafe(safe.html);
      return safe;
    } catch {
      // Retry once with stricter style constraints to reduce unsafe constructs.
      const strictResult = await this.shareAIService.generateXiaohongshuPosterHtml({
        pr: prFields,
        caption: params.caption,
        posterStylePrompt: buildStrictSafetyStylePrompt(params.posterStylePrompt),
      });

      const safe = sanitizePosterResponse(strictResult);
      assertNotEmptyHtml(safe.html);
      assertHtmlSafe(safe.html);
      return safe;
    }
  }

  async generateWeChatCardThumbnailHtml(params: {
    prId: PRId;
    style?: number;
  }): Promise<PosterHtmlResponse> {
    // Always generate HTML (thumbnail image URL caching is handled via cache endpoints)
    const pr = await getPR(params.prId);
    const prFields = this.toPartnerRequestFields(pr);

    const result = await this.shareAIService.generateWeChatCardThumbnailHtml({
      pr: prFields,
      style: params.style,
    });

    const safe = sanitizeThumbnailResponse(result);
    assertNotEmptyHtml(safe.html);
    assertHtmlSafe(safe.html);
    return safe;
  }

  async generateWeChatCardDescription(params: { prId: PRId }): Promise<string> {
    const pr = await getPR(params.prId);
    const prFields = this.toPartnerRequestFields(pr);

    const description = await this.shareAIService.generateWeChatCardDescription({
      pr: prFields,
    });

    return description;
  }

  async cacheXiaohongshuPoster(params: {
    prId: PRId;
    caption: string;
    posterStylePrompt: string;
    posterUrl: string;
  }): Promise<void> {
    await this.assertPublicCacheAccess(params.prId);
    await this.prRepo.addXiaohongshuPoster(params.prId, {
      caption: params.caption,
      posterStylePrompt: params.posterStylePrompt,
      posterUrl: params.posterUrl,
      createdAt: new Date().toISOString(),
    });
  }

  private isRemoteUrl(url: string): boolean {
    return url.startsWith("https://") || url.startsWith("http://");
  }

  async getCachedXiaohongshuPoster(params: {
    prId: PRId;
    caption: string;
    posterStylePrompt: string;
  }): Promise<string | null> {
    await this.assertPublicCacheAccess(params.prId);
    const url = await this.prRepo.findXiaohongshuPoster(
      params.prId,
      params.caption,
      params.posterStylePrompt,
    );

    if (!url) return null;
    if (!this.isRemoteUrl(url)) return null;
    return url;
  }

  async cacheWechatThumbnail(params: {
    prId: PRId;
    style: number;
    posterUrl: string;
  }): Promise<void> {
    await this.assertPublicCacheAccess(params.prId);
    await this.prRepo.addWechatThumbnail(params.prId, {
      style: params.style,
      posterUrl: params.posterUrl,
      createdAt: new Date().toISOString(),
    });
  }

  async getCachedWechatThumbnail(params: { prId: PRId; style: number }): Promise<string | null> {
    await this.assertPublicCacheAccess(params.prId);
    const url = await this.prRepo.findWechatThumbnail(params.prId, params.style);
    if (!url) return null;
    if (!this.isRemoteUrl(url)) return null;
    return url;
  }

  private async assertPublicCacheAccess(prId: PRId): Promise<void> {
    const request = await readPartnerRequestById(prId, { consistency: "eventual" });
    if (!request) {
      return throwHttpProblem({ status: 404, detail: "Partner request not found" });
    }
    assertPRDraftAccess({
      request,
      actor: { userId: null, roles: ["anonymous"] },
      operation: "read",
    });
  }

  private toPartnerRequestFields(pr: {
    title?: string;
    type: string;
    time: PartnerRequestFields["time"];
    location: string | null;
    route: PartnerRequestFields["route"];
    minPartners: number | null;
    maxPartners: number | null;
    partners: PartnerRequestFields["partners"];
    budget: string | null;
    preferences: string[];
    notes: string | null;
  }): PartnerRequestFields {
    return {
      title: pr.title ?? undefined,
      type: pr.type,
      time: pr.time,
      location: pr.location,
      route: pr.route,
      minPartners: pr.minPartners,
      maxPartners: pr.maxPartners,
      partners: pr.partners,
      budget: pr.budget,
      preferences: pr.preferences,
      notes: pr.notes,
    };
  }
}
