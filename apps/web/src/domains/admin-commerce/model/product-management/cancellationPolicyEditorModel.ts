import type { AdminSkuCancellationPolicyInput } from "@/domains/admin-commerce/queries/useAdminCommerce";
import {
  createDraftId,
  parseIntegerField,
  parseNullableNonnegativeInteger,
  type NumberInput,
} from "@/domains/admin-commerce/model/product-management/shared";

export type CancellationTierDraft = {
  id: string;
  code: string;
  fromMinutesBeforeStartText: string;
  untilMinutesBeforeStartText: string;
  refundPercent: NumberInput;
  requiresOperatorHandling: boolean;
  visibleLabel: string;
};

export type PolicyEditorForm = {
  operatorBufferMinutes: NumberInput;
  tiers: CancellationTierDraft[];
};

export type PolicyBuildLabels = {
  operatorBufferMinutesLabel: string;
  tierFromLabel: string;
  tierUntilLabel: string;
  refundPercentLabel: string;
};

export const emptyPolicyInput = (): AdminSkuCancellationPolicyInput => ({
  operatorBufferMinutes: 30,
  tiers: [
    {
      code: "DEFAULT",
      fromMinutesBeforeStart: null,
      untilMinutesBeforeStart: null,
      refundPercent: 100,
      requiresOperatorHandling: false,
      visibleLabel: "默认全额退款",
    },
  ],
});

export const toPolicyForm = (
  input: AdminSkuCancellationPolicyInput,
): PolicyEditorForm => ({
  operatorBufferMinutes: input.operatorBufferMinutes,
  tiers: input.tiers.map((tier) => ({
    id: createDraftId("tier"),
    code: tier.code,
    fromMinutesBeforeStartText:
      tier.fromMinutesBeforeStart === null ? "" : String(tier.fromMinutesBeforeStart),
    untilMinutesBeforeStartText:
      tier.untilMinutesBeforeStart === null ? "" : String(tier.untilMinutesBeforeStart),
    refundPercent: tier.refundPercent,
    requiresOperatorHandling: tier.requiresOperatorHandling,
    visibleLabel: tier.visibleLabel,
  })),
});
export const createCancellationTierDraft = (): CancellationTierDraft => ({
  id: createDraftId("tier"),
  code: "",
  fromMinutesBeforeStartText: "",
  untilMinutesBeforeStartText: "",
  refundPercent: 100,
  requiresOperatorHandling: false,
  visibleLabel: "",
});

export const buildPolicyInput = (
  form: PolicyEditorForm,
  labels: PolicyBuildLabels,
): AdminSkuCancellationPolicyInput => ({
  operatorBufferMinutes: parseIntegerField(
    form.operatorBufferMinutes,
    labels.operatorBufferMinutesLabel,
    { min: 0 },
  ),
  tiers: form.tiers.map((tier) => ({
    code: tier.code.trim(),
    fromMinutesBeforeStart: parseNullableNonnegativeInteger(
      tier.fromMinutesBeforeStartText,
      labels.tierFromLabel,
    ),
    untilMinutesBeforeStart: parseNullableNonnegativeInteger(
      tier.untilMinutesBeforeStartText,
      labels.tierUntilLabel,
    ),
    refundPercent: parseIntegerField(tier.refundPercent, labels.refundPercentLabel, {
      min: 0,
      max: 100,
    }),
    requiresOperatorHandling: tier.requiresOperatorHandling,
    visibleLabel: tier.visibleLabel.trim(),
  })),
});
