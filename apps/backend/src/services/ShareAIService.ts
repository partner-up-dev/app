import { generateObject } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import type { PartnerRequestFields } from "../entities/partner-request";
import { env } from "../lib/env";
import { PromptTemplate } from "../lib/prompt-template";
import { ConfigService } from "./ConfigService";
import {
  buildWeChatThumbnailPromptVariablesJson,
  buildXhsPosterHtmlPromptVariablesJson,
  buildXiaohongshuCaptionPromptVariablesJson,
} from "./llm/prompt-variables";
import { z } from "zod";
const CONFIG_KEY_XIAOHONGSHU_STYLE_PROMPT = "xiaohongshu_style_prompt";
const CONFIG_KEY_SHARE_WECHAT_CARD_THUMBNAIL_HTML_STYLE_PROMPTS =
  "share.wechat_card_thumbnail_html_style_prompts";

export type PosterHtmlResponse = {
  html: string;
  width: number;
  height: number;
  backgroundColor?: string;
  meta?: {
    keyText?: string;
  };
};

const DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT = `你是一位小红书文案写手和视觉设计师，专长于撰写有分享力的搭子合伙文案，并设计与之匹配的海报风格。

写作要求：
- caption: 一句话，不超过16个字，口语化、有亲和力、有感染力，可以适当使用1-2个emoji表情，必须包含核心信息：做什么、什么时间、在哪、还差几人，风格要活泼、友好，让人有参与的欲望
- posterStylePrompt: 与caption语义对齐的海报设计提示词，用于生成小红书海报HTML，要求简洁、可信、非营销，强调文字易读性和几何图形装饰。禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`;

const DEFAULT_SHARE_XHS_POSTER_HTML_STYLE_PROMPTS: readonly string[] = [
  `你是一位中文信息海报设计师。

目标：为小红书生成一张“干净、可信、非营销”的搭子需求海报 HTML。

硬性要求：
- 海报比例 2:3，尺寸必须为 720x1080。
- 文字必须非常大、易读。
- 只允许：文字 + 简单几何图形（圆角矩形/圆/线条）。
- 禁止任何营销/广告语、夸张情绪化词汇。

HTML/CSS 约束：
- 输出必须是一个完整 HTML 文档字符串。
- 只允许内联 CSS（<style> 可用）。
- 禁止 <script>、事件处理器、外链资源（无图片/无外链字体/无外链CSS）。
- 必须包含且仅包含一个根节点：<div id="poster-root">...</div>，并且根节点固定宽高。
`,
  `你是一位极简信息视觉设计师。

目标：输出可信赖、用户自述式的小红书搭子海报 HTML（不是广告）。

硬性要求：
- 尺寸 720x1080（2:3）。
- 以大标题/大段文本为主，留白充足。
- 只使用系统字体，颜色克制。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root 根节点）。
`,
  `你是一位信息可视化排版师。

目标：把给定文案排版成小红书海报 HTML，强调可读性与可信感。

硬性要求：
- 尺寸 720x1080。
- 文案必须是视觉中心，字号必须大。
- 允许少量几何装饰（线/点/圆角块），不要复杂效果。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root 根节点）。
`,
];

const DEFAULT_SHARE_WECHAT_THUMBNAIL_HTML_STYLE_PROMPTS: readonly string[] = [
  `你是一位极简主义 UI 设计师。

目标：生成微信分享卡片缩略图 HTML（300x300），风格极简克制。

硬性要求：
- 尺寸 300x300。
- 只显示 1 个 emoji 或 ≤3 个汉字，字号非常大。
- 背景使用单一淡色或纯色。
- 无边框、无装饰。

HTML/CSS 约束：
- 输出完整 HTML 文档。
- 只允许内联 CSS（<style> 可用），禁止脚本与外链资源。
- 必须包含根节点 <div id="poster-root">...</div> 并固定宽高。

特色：留白充足，强调信息本身。
`,
  `你是一位现代几何风格设计师。

目标：生成微信分享卡片缩略图 HTML（300x300），突出现代感。

硬性要求：
- 尺寸 300x300。
- 显示 1 个 emoji 或 ≤3 个汉字。
- 搭配现代几何图形：圆形、方形、对角线等。
- 使用 2-3 种互补色。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root）。

特色：通过几何元素增加视觉层次。
`,
  `你是一位温暖亲切的设计师。

目标：生成微信分享卡片缩略图 HTML（300x300），传达友善和参与感。

硬性要求：
- 尺寸 300x300。
- 显示 1 个表情 emoji 或 ≤3 个汉字。
- 背景使用温暖色调（米色、淡橙、淡红等）。
- 可使用圆形、圆角元素。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root）。

特色：营造温暖、包容的氛围。
`,
  `你是一位信息化风格的设计师。

目标：生成微信分享卡片缩略图 HTML（300x300），突出信息属性。

硬性要求：
- 尺寸 300x300。
- 显示 1 个 emoji 或 ≤3 个汉字。
- 使用网格或条纹作为背景纹理。
- 可配合简单的标签或框。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root）。

特色：强调结构感和专业性。
`,
  `你是一位渐变色设计师。

目标：生成微信分享卡片缩略图 HTML（300x300），使用渐变增加视觉吸引力。

硬性要求：
- 尺寸 300x300。
- 显示 1 个 emoji 或 ≤3 个汉字。
- 背景使用平缓的线性渐变或径向渐变。
- 文字颜色需与背景形成充分对比。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root）。

特色：通过渐变营造动态感。
`,
  `你是一位高对比度设计师。

目标：生成微信分享卡片缩略图 HTML（300x300），强调清晰度和易识别性。

硬性要求：
- 尺寸 300x300。
- 显示 1 个 emoji 或 ≤3 个汉字。
- 使用黑白或深浅对比色组合。
- 增加边框或框线以增强边界感。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root）。

特色：高清晰度和易识别。
`,
];

const DEFAULT_POSTER_STYLE_PROMPT = DEFAULT_SHARE_XHS_POSTER_HTML_STYLE_PROMPTS[0];

const xhsPosterHtmlResponseSchema = z.object({
  html: z.string().min(1),
  width: z.literal(720),
  height: z.literal(1080),
  backgroundColor: z.string().optional(),
});

const wechatThumbnailHtmlResponseSchema = z.object({
  html: z.string().min(1),
  width: z.literal(300),
  height: z.literal(300),
  backgroundColor: z.string().optional(),
  meta: z
    .object({
      keyText: z.string().min(1).max(4),
    })
    .optional(),
});

const wechatCardDescriptionResponseSchema = z.object({
  description: z.string().min(1).max(80),
});

const XIAOHONGSHU_CAPTION_PROMPT_TEMPLATE = PromptTemplate.fromTemplate<{
  variablesJson: string;
}>(
  [
    "Generate a Xiaohongshu caption and aligned posterStylePrompt from the variables.",
    "",
    "Variables:",
    "{variablesJson}",
  ].join("\n"),
);

const XHS_POSTER_HTML_PROMPT_TEMPLATE = PromptTemplate.fromTemplate<{
  variablesJson: string;
}>(
  [
    "Generate Xiaohongshu poster HTML using the provided variables.",
    'Use participants.stillNeededFromMin for the phrase "还差几人" (do not infer from max).',
    "Return a complete HTML document string.",
    "Do not include markdown fences.",
    "Forbidden: <script, <link, <iframe, javascript:, inline event handlers (onclick/onerror/etc).",
    "",
    "Variables:",
    "{variablesJson}",
  ].join("\n"),
);

const WECHAT_THUMBNAIL_HTML_PROMPT_TEMPLATE = PromptTemplate.fromTemplate<{
  variablesJson: string;
}>(
  [
    "Generate WeChat share thumbnail HTML and pick keyText (one emoji or <=3 Chinese characters).",
    "Return a complete HTML document string.",
    "Do not include markdown fences.",
    "Forbidden: <script, <link, <iframe, javascript:, inline event handlers (onclick/onerror/etc).",
    "",
    "Variables:",
    "{variablesJson}",
  ].join("\n"),
);

const WECHAT_CARD_DESCRIPTION_PROMPT_TEMPLATE = PromptTemplate.fromTemplate<{
  variablesJson: string;
}>(
  [
    "Generate a WeChat share card description (≤80 characters) from the partner request.",
    "The description should be a concise summary that complements the title.",
    "Include key details like what they're looking for, location, and time if relevant.",
    "Avoid just repeating the title; provide additional useful context.",
    "",
    "Variables:",
    "{variablesJson}",
  ].join("\n"),
);

// 多风格文案系统prompt定义（作为默认回退值）
const XIAOHONGSHU_STYLE_PROMPTS = {
  friendly: DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT,
  concise: `你是一位简洁高效的文案写手和视觉设计师，专注于快速传达核心信息并设计匹配的海报风格。

写作要求：
- caption: 一句话，不超过16个字，直接明了，重点突出，包含核心信息：做什么、什么时间、在哪、还差几人，风格简洁干练，适合商务和学习场景
- posterStylePrompt: 与caption语义对齐的海报设计提示词，强调简洁布局和大字体，适合商务和学习场景。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
  warm: `你是一位温暖治愈的文案写手和视觉设计师，善于营造温馨共情的氛围并设计温暖的海报风格。

写作要求：
- caption: 一句话，不超过16个字，温暖有爱，充满关怀，可以适当使用温馨的emoji表情，包含核心信息：做什么、什么时间、在哪、还差几人，风格温暖治愈，让人感受到陪伴和支持
- posterStylePrompt: 与caption语义对齐的海报设计提示词，使用温暖色调和柔和几何图形，营造治愈氛围。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
  trendy: `你是一位潮流文案写手和视觉设计师，精通年轻人的表达方式和网络文化，设计时尚的海报风格。

写作要求：
- caption: 一句话，不超过16个字，使用潮流网络用语和emoji，充满活力和时尚感，包含核心信息：做什么、什么时间、在哪、还差几人，风格年轻酷炫，适合潮流和创新活动
- posterStylePrompt: 与caption语义对齐的海报设计提示词，使用现代几何图形和活力色彩，体现潮流感。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
  professional: `你是一位专业正式的文案写手和视觉设计师，专长于商务和专业场景的表达，设计专业海报风格。

写作要求：
- caption: 一句话，不超过15个字，正式专业，值得信赖，措辞严谨，信息准确，包含核心信息：做什么、什么时间、在哪、还差几人，风格专业正式，适合行业交流和技能分享
- posterStylePrompt: 与caption语义对齐的海报设计提示词，使用克制配色和专业布局，强调可信度和正式感。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
} as const;

export type XiaohongshuStyle = keyof typeof XIAOHONGSHU_STYLE_PROMPTS;

export class ShareAIService {
  private client: typeof openai;
  private configService: ConfigService;

  constructor() {
    if (env.LLM_BASE_URL) {
      this.client = createOpenAI({
        apiKey: env.LLM_API_KEY,
        baseURL: env.LLM_BASE_URL,
      });
    } else {
      this.client = openai;
    }

    this.configService = new ConfigService();
  }

  async generateXiaohongshuCaption(
    prData: PartnerRequestFields,
    style?: number | XiaohongshuStyle,
  ): Promise<{ caption: string; posterStylePrompt: string }> {
    const styles = await this.getXiaohongshuStylePrompts();

    let systemPrompt: string;

    if (typeof style === "number") {
      if (styles.length === 0) {
        systemPrompt = DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT;
      } else {
        const idx = Math.floor(style);
        const n = styles.length;
        const selected = ((idx % n) + n) % n; // wraparound, handle negative
        systemPrompt = styles[selected];
      }
    } else if (typeof style === "string" && XIAOHONGSHU_STYLE_PROMPTS[style]) {
      systemPrompt = XIAOHONGSHU_STYLE_PROMPTS[style];
    } else {
      // no style specified or unknown string style -> random
      systemPrompt =
        styles.length > 0
          ? styles[Math.floor(Math.random() * styles.length)]
          : DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT;
    }

    const prompt = await this.buildXiaohongshuCaptionPrompt(prData);

    try {
      const { object } = await generateObject({
        model: this.client(env.LLM_DEFAULT_MODEL),
        schema: z.object({
          caption: z.string().max(100),
          posterStylePrompt: z.string(),
        }),
        system: systemPrompt,
        prompt,
        temperature: 0.7,
      });

      return {
        caption: object.caption,
        posterStylePrompt: object.posterStylePrompt || DEFAULT_POSTER_STYLE_PROMPT,
      };
    } catch {
      // Fallback: generate caption only and use default posterStylePrompt
      const { object } = await generateObject({
        model: this.client(env.LLM_DEFAULT_MODEL),
        schema: z.object({
          caption: z.string().max(100),
        }),
        system: systemPrompt
          .replace(/posterStylePrompt.*?\n/g, "")
          .replace(
            /输出只包含JSON格式的caption和posterStylePrompt字段/g,
            "输出只包含文案内容，不要其他解释。",
          ),
        prompt,
        temperature: 0.7,
      });

      return {
        caption: object.caption,
        posterStylePrompt: DEFAULT_POSTER_STYLE_PROMPT,
      };
    }
  }

  async generateXiaohongshuPosterHtml(params: {
    pr: PartnerRequestFields;
    caption: string;
    posterStylePrompt: string;
  }): Promise<PosterHtmlResponse> {
    const baseConstraints = `你是一位中文信息海报设计师。

目标：为小红书生成一张"干净、可信、非营销"的搭子需求海报 HTML。

硬性要求：
- 海报比例 2:3，尺寸必须为 720x1080。
- 文字必须非常大、易读。
- 只允许：文字 + 简单几何图形（圆角矩形/圆/线条）。
- 禁止任何营销/广告语、夸张情绪化词汇。

HTML/CSS 约束：
- 输出必须是一个完整 HTML 文档字符串。
- 只允许内联 CSS（<style> 可用）。
- 禁止 <script>、事件处理器、外链资源（无图片/无外链字体/无外链CSS）。
- 必须包含且仅包含一个根节点：<div id="poster-root">...</div>，并且根节点固定宽高。`;

    const system = `${baseConstraints}\n\n设计风格：${params.posterStylePrompt}`;

    const prompt = await this.buildXhsPosterHtmlPrompt(params.pr, params.caption);

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: xhsPosterHtmlResponseSchema,
      system,
      prompt,
      temperature: 0.4,
    });

    return object;
  }

  async generateWeChatCardThumbnailHtml(params: {
    pr: PartnerRequestFields;
    style?: number;
  }): Promise<PosterHtmlResponse> {
    const stylePrompts = await this.getShareWeChatThumbnailHtmlStylePrompts();
    const system = this.pickPromptByIndex(stylePrompts, params.style);

    const prompt = await this.buildWeChatThumbnailHtmlPrompt(params.pr);

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: wechatThumbnailHtmlResponseSchema,
      system,
      prompt,
      temperature: 0.3,
    });

    return object;
  }

  async generateWeChatCardDescription(params: { pr: PartnerRequestFields }): Promise<string> {
    const prompt = await this.buildWeChatCardDescriptionPrompt(params.pr);

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: wechatCardDescriptionResponseSchema,
      system:
        "你是一位文案写手，专长于为微信分享卡片撰写简洁、有吸引力的描述。描述应该补充而不是重复标题，提供关键信息如场景、地点、时间等。限制80个字符以内。",
      prompt,
      temperature: 0.7,
    });

    return object.description;
  }

  private async buildXiaohongshuCaptionPrompt(prData: PartnerRequestFields): Promise<string> {
    const variablesJson = buildXiaohongshuCaptionPromptVariablesJson(prData);

    return await XIAOHONGSHU_CAPTION_PROMPT_TEMPLATE.format({ variablesJson });
  }

  private async getXiaohongshuStylePrompts(): Promise<string[]> {
    const fallback = Object.values(XIAOHONGSHU_STYLE_PROMPTS) as string[];
    return await this.configService.getJsonArrayOrFallback(
      CONFIG_KEY_XIAOHONGSHU_STYLE_PROMPT,
      fallback,
    );
  }

  private pickPromptByIndex(prompts: string[], style?: number): string {
    if (prompts.length === 0) return "";

    if (typeof style === "number" && Number.isFinite(style)) {
      const idx = Math.floor(style);
      const n = prompts.length;
      const selected = ((idx % n) + n) % n;
      return prompts[selected];
    }

    return prompts[0];
  }

  private async getShareWeChatThumbnailHtmlStylePrompts(): Promise<string[]> {
    return await this.configService.getJsonArrayOrFallback(
      CONFIG_KEY_SHARE_WECHAT_CARD_THUMBNAIL_HTML_STYLE_PROMPTS,
      [...DEFAULT_SHARE_WECHAT_THUMBNAIL_HTML_STYLE_PROMPTS],
    );
  }

  private async buildXhsPosterHtmlPrompt(
    pr: PartnerRequestFields,
    caption: string,
  ): Promise<string> {
    const variablesJson = buildXhsPosterHtmlPromptVariablesJson(pr, caption);

    return await XHS_POSTER_HTML_PROMPT_TEMPLATE.format({ variablesJson });
  }

  private async buildWeChatThumbnailHtmlPrompt(pr: PartnerRequestFields): Promise<string> {
    const variablesJson = buildWeChatThumbnailPromptVariablesJson(pr);

    return await WECHAT_THUMBNAIL_HTML_PROMPT_TEMPLATE.format({
      variablesJson,
    });
  }

  private async buildWeChatCardDescriptionPrompt(pr: PartnerRequestFields): Promise<string> {
    const variablesJson = buildWeChatThumbnailPromptVariablesJson(pr);

    return await WECHAT_CARD_DESCRIPTION_PROMPT_TEMPLATE.format({
      variablesJson,
    });
  }
}
