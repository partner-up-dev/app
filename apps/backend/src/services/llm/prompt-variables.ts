import type {
  PartnerRequestFields,
  WeekdayLabel,
} from "../../entities/partner-request";
import { toPromptJson, type PromptJsonObject } from "../../lib/prompt-variables";

type SharePromptPartnerRequest = Pick<
  PartnerRequestFields,
  "title" | "type" | "time" | "location" | "minPartners" | "partners"
>;

type ParticipantSummary = {
  currentParticipants: number;
  minParticipants: number | null;
  stillNeededFromMin: number | null;
};

const PRODUCT_TIME_ZONE = "Asia/Shanghai";
const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRODUCT_LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/;

const productLocalDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PRODUCT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const getDateTimePart = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPart["type"],
): string => parts.find((part) => part.type === type)?.value ?? "";

const formatProductLocalDateTime = (date: Date): string => {
  const parts = productLocalDateTimeFormatter.formatToParts(date);
  const year = getDateTimePart(parts, "year");
  const month = getDateTimePart(parts, "month");
  const day = getDateTimePart(parts, "day");
  const hour = getDateTimePart(parts, "hour");
  const minute = getDateTimePart(parts, "minute");

  if (!year || !month || !day || !hour || !minute) {
    return productLocalDateTimeFormatter.format(date);
  }

  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const formatSharePromptTime = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const productLocalMatch = PRODUCT_LOCAL_DATE_TIME_PATTERN.exec(trimmed);
  if (productLocalMatch) {
    const [, year, month, day, hour, minute] = productLocalMatch;
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime())
    ? trimmed
    : formatProductLocalDateTime(parsed);
};

const buildParticipantSummary = (
  minParticipants: number | null,
  partners: PartnerRequestFields["partners"],
): ParticipantSummary => {
  const currentParticipants = partners.length;
  const stillNeededFromMin =
    minParticipants === null
      ? null
      : Math.max(minParticipants - currentParticipants, 0);

  return {
    currentParticipants,
    minParticipants,
    stillNeededFromMin,
  };
};

const buildSharePromptContext = (
  pr: SharePromptPartnerRequest,
): PromptJsonObject => {
  const [startTime, endTime] = pr.time;
  const participants = buildParticipantSummary(pr.minPartners, pr.partners);

  return {
    activity: {
      title: pr.title ?? null,
      type: pr.type,
    },
    time: {
      start: formatSharePromptTime(startTime),
      end: formatSharePromptTime(endTime),
      timeZone: PRODUCT_TIME_ZONE,
    },
    location: pr.location,
    participants: {
      current: participants.currentParticipants,
      min: participants.minParticipants,
      stillNeededFromMin: participants.stillNeededFromMin,
    },
  };
};

export const buildXiaohongshuCaptionPromptVariablesJson = (
  pr: PartnerRequestFields,
): string => {
  return toPromptJson({
    context: buildSharePromptContext(pr),
  });
};

export const buildXhsPosterHtmlPromptVariablesJson = (
  pr: SharePromptPartnerRequest,
  caption: string,
): string => {
  return toPromptJson({
    caption,
    context: buildSharePromptContext(pr),
  });
};

export const buildWeChatThumbnailPromptVariablesJson = (
  pr: SharePromptPartnerRequest,
): string => {
  return toPromptJson({
    context: {
      title: pr.title ?? null,
      type: pr.type,
      location: pr.location,
    },
  });
};

export const buildPartnerRequestParsePromptVariablesJson = (
  rawText: string,
  nowIso: string,
  nowWeekday: WeekdayLabel | null,
  typeHints: {
    existingPRTypes: string[];
    anchorEventTypes: string[];
  } = {
    existingPRTypes: [],
    anchorEventTypes: [],
  },
): string => {
  const normalizedRawText = rawText.trim().length > 0 ? rawText.trim() : rawText;

  return toPromptJson({
    nowIso,
    nowWeekday,
    typeSelection: {
      priority: [
        "existingPRTypes",
        "anchorEventTypes",
        "newTypeWhenNoCandidateFits",
      ],
      existingPRTypes: typeHints.existingPRTypes,
      anchorEventTypes: typeHints.anchorEventTypes,
    },
    userInput: normalizedRawText,
  });
};
