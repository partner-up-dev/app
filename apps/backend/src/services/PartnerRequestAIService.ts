import { generateObject } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import {
  naturalLanguagePartnerRequestFieldsSchema,
  type NaturalLanguagePartnerRequestFields,
  type WeekdayLabel,
} from "../entities/partner-request";
import { env } from "../lib/env";
import { PromptTemplate } from "../lib/prompt-template";
import { ConfigService } from "./ConfigService";
import { buildPartnerRequestParsePromptVariablesJson } from "./llm/prompt-variables";
import { DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT } from "./prompts/partnerRequestParsePrompt";

const CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT = "partner_request.parse_system_prompt";

type PartnerRequestParseTypeHints = {
  existingPRTypes: string[];
  anchorEventTypes: string[];
};

const PARTNER_REQUEST_PARSE_PROMPT_TEMPLATE = PromptTemplate.fromTemplate<{
  variablesJson: string;
}>(
  [
    "Parse the user request and output structured PartnerRequest fields.",
    "Use nowIso as the current reference time context.",
    "If nowWeekday is provided, use it to resolve relative day expressions from the user's wall-clock perspective.",
    "",
    "Variables:",
    "{variablesJson}",
  ].join("\n"),
);

export class PartnerRequestAIService {
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

  async parseRequest(
    rawText: string,
    nowIso: string,
    nowWeekday: WeekdayLabel | null,
    typeHints?: PartnerRequestParseTypeHints,
  ): Promise<NaturalLanguagePartnerRequestFields> {
    const systemPrompt = await this.configService.getValueOrFallback(
      CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
      DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
    );

    const variablesJson = buildPartnerRequestParsePromptVariablesJson(
      rawText,
      nowIso,
      nowWeekday,
      typeHints,
    );
    const prompt = await PARTNER_REQUEST_PARSE_PROMPT_TEMPLATE.format({
      variablesJson,
    });

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: naturalLanguagePartnerRequestFieldsSchema,
      system: systemPrompt,
      prompt,
      temperature: 0.3,
    });

    return object;
  }
}
