import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import { i18n } from "@/locales/i18n";
import type { PRFormFields } from "@/domains/pr/model/types";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime();
const isoDateOrDateTimeSchema = z.union([isoDateTimeSchema, isoDateSchema]);

const MIN_MANUAL_PARTNERS = 1;
const MIN_PRESENT_MAX_PARTNERS = 2;

export const getMinPartnersAtLeastOneMessage = (): string =>
  i18n.global.t("validation.minPartnersAtLeastOne");

export const getMaxPartnersAtLeastTwoMessage = (): string =>
  i18n.global.t("validation.maxPartnersAtLeastTwo");

export const getMaxPartnersAtLeastMinPartnersMessage = (): string =>
  i18n.global.t("validation.maxPartnersMustBeAtLeastMinPartners");

export const validateManualPartnerBounds = (
  minPartners: number | null,
  maxPartners: number | null,
): string | null => {
  if (minPartners === null || minPartners < MIN_MANUAL_PARTNERS) {
    return getMinPartnersAtLeastOneMessage();
  }
  if (maxPartners !== null && maxPartners < MIN_PRESENT_MAX_PARTNERS) {
    return getMaxPartnersAtLeastTwoMessage();
  }
  if (maxPartners !== null && maxPartners < minPartners) {
    return getMaxPartnersAtLeastMinPartnersMessage();
  }

  return null;
};

type PartnerRequestFormSchemaOptions = {
  validateTime?: boolean;
};

const buildTimeSchema = (validateTime: boolean) =>
  z.tuple([
    (validateTime ? isoDateOrDateTimeSchema : z.string()).nullable(),
    (validateTime ? isoDateOrDateTimeSchema : z.string()).nullable(),
  ]);

const buildFieldsSchema = ({
  validateTime = true,
}: PartnerRequestFormSchemaOptions = {}) =>
  z
    .object({
      title: z.string().optional(),
      type: z.string().min(1, i18n.global.t("validation.typeRequired")),
      time: buildTimeSchema(validateTime),
      location: z.string().nullable(),
      route: z
        .custom<PRFormFields["route"]>(
          (value) => value === null || Array.isArray(value),
        )
        .default(null),
      minPartners: z.number().int().nonnegative().nullable(),
      maxPartners: z.number().int().nonnegative().nullable(),
      partners: z.array(z.number().int().positive()),
      budget: z.string().nullable().optional(),
      preferences: z.array(z.string()),
      notes: z.string().nullable(),
      meetingPoint: z
        .object({
          description: z.string().nullable(),
          imageUrl: z.string().nullable(),
        })
        .nullable()
        .optional(),
    })
    .superRefine((value, context) => {
      if (
        value.minPartners === null ||
        value.minPartners < MIN_MANUAL_PARTNERS
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minPartners"],
          message: getMinPartnersAtLeastOneMessage(),
        });
      }
      if (
        value.maxPartners !== null &&
        value.maxPartners < MIN_PRESENT_MAX_PARTNERS
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxPartners"],
          message: getMaxPartnersAtLeastTwoMessage(),
        });
        return;
      }
      if (
        value.minPartners !== null &&
        value.minPartners >= MIN_MANUAL_PARTNERS &&
        value.maxPartners !== null &&
        value.maxPartners < value.minPartners
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxPartners"],
          message: getMaxPartnersAtLeastMinPartnersMessage(),
        });
      }
    });

export const createNaturalLanguagePRSchema = z
  .object({
    rawText: z
      .string()
      .min(1, i18n.global.t("validation.naturalLanguageRequired"))
      .max(2000),
  })
  .refine(
    ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
    { message: i18n.global.t("validation.naturalLanguageWordLimit") },
  );

export const createNaturalLanguagePRValidationSchema = toTypedSchema(
  createNaturalLanguagePRSchema,
);

export const buildPartnerRequestFormSchema = (
  options: PartnerRequestFormSchemaOptions = {},
) =>
  z.object({
    fields: buildFieldsSchema(options),
  });

export const partnerRequestFormSchema = buildPartnerRequestFormSchema();

export const buildPartnerRequestFormValidationSchema = (
  options: PartnerRequestFormSchemaOptions = {},
) =>
  toTypedSchema(buildPartnerRequestFormSchema(options));

export const partnerRequestFormValidationSchema = buildPartnerRequestFormValidationSchema(
);

export type CreateNaturalLanguagePRInput = z.infer<
  typeof createNaturalLanguagePRSchema
>;
export type PartnerRequestFormInput = z.infer<typeof partnerRequestFormSchema>;
