import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createOffer,
  createPlacement,
  type CreateOfferInput,
  type CreatePlacementInput,
  type CreateProductSkuInput,
  type CreateProductSpuInput,
  createProductSku,
  createProductSpu,
  createSkuCancellationPolicy,
} from "../domains/merchandising";
import {
  confirmRentalBooking,
  recordRentalEntryGuidance,
  rejectRentalBooking,
} from "../domains/fulfillment";
import {
  getAdminCommerceFulfillmentWorkspace,
  getAdminCommerceOrderBillWorkspace,
  getAdminCommercePlacementOfferWorkspace,
  getAdminCommerceProductWorkspace,
  resolveAdminRentalFulfillmentCancellation,
  saveAdminCommerceSkuCancellationPolicy,
  updateAdminCommerceOffer,
  updateAdminCommercePlacement,
  updateAdminCommerceProductSku,
  updateAdminCommerceProductSpu,
} from "../domains/admin-commerce-management";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";

const app = new Hono<AdminAuthEnv>();

const productTypeSchema = z.enum(["RENTAL", "RIDE_HAILING"]);
const catalogStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
const offerStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);
const placementStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]);

const pricingRuleSchema = z.object({
  id: z.number().int(),
  label: z.string().trim().min(1),
  description: z.string().trim(),
  conditionRule: z.unknown(),
  action: z.union([
    z.object({
      type: z.literal("RESET"),
      payload: z.object({
        pricingModel: z.unknown(),
      }),
    }),
    z.object({
      type: z.literal("MINUS"),
      payload: z.object({
        amountFen: z.number().int(),
      }),
    }),
    z.object({
      type: z.literal("RATIO"),
      payload: z.object({
        ratioBps: z.number().int().nonnegative(),
      }),
    }),
  ]),
  target: z.union([
    z.object({
      level: z.literal("SKU"),
      skuId: z.number().int().positive().optional(),
    }),
    z.object({
      level: z.literal("SPU"),
      spuId: z.number().int().positive().optional(),
    }),
    z.object({
      level: z.literal("ORDER"),
    }),
  ]),
  continue: z.boolean(),
});

const salesPolicySchema = z.object({
  skuSelectionPolicy: z.object({
    type: z.literal("EXACTLY_ONE"),
  }),
  quantityPolicy: z.union([
    z.object({
      type: z.literal("FIXED"),
      quantity: z.number().int().positive(),
    }),
    z.object({
      type: z.literal("PER_PARTICIPANT"),
    }),
    z.object({
      type: z.literal("USER_SELECTED"),
      min: z.number().int().nonnegative(),
      max: z.number().int().positive(),
    }),
  ]),
});

const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const rentalServiceWindowSchema = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
});

const servicePolicySchema = z.union([
  z.object({
    type: z.literal("RENTAL"),
    bookingLeadTimeMinutes: z.number().int().nonnegative(),
    serviceWindow: rentalServiceWindowSchema.optional(),
    requiresContactPhone: z.boolean(),
    requiresRealName: z.boolean(),
    requiresNationalId: z.boolean(),
  }),
  z.object({
    type: z.literal("RIDE_HAILING"),
  }),
]);

const presentationSchema = z.object({
  heroImageAssetIds: z.array(z.string()),
  detailImageAssetIds: z.array(z.string()),
  sellingPoints: z.array(z.string()),
  parameterGroups: z.array(
    z.object({
      title: z.string(),
      items: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
    }),
  ),
  noticeBlocks: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    }),
  ),
});

const pricingModelSchema = z.union([
  z.object({
    type: z.literal("FIXED_TOTAL"),
    amountFen: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("DYNAMIC_QUOTE"),
    calculatorSpec: z.unknown(),
  }),
]);

const skuFactsSchema = z.union([
  z.object({
    type: z.literal("RENTAL"),
    zoneCode: z.string().trim().min(1),
    participantCount: z.number().int().positive(),
    durationMinutes: z.number().int().positive(),
  }),
  z.object({
    rideHailingProviderInstanceId: z.string().trim().min(1),
    providerVehicleTypeCode: z.string().trim().min(1),
  }),
]);

const productSpuInputSchema = z.object({
  name: z.string().trim().min(1),
  productType: productTypeSchema,
  status: catalogStatusSchema,
  salesPolicy: salesPolicySchema,
  servicePolicy: servicePolicySchema,
  presentation: presentationSchema,
  facts: z.record(z.string(), z.unknown()),
});

const productSkuInputSchema = z.object({
  spuId: z.number().int().positive(),
  name: z.string().trim().min(1),
  status: catalogStatusSchema,
  sortOrder: z.number().int(),
  facts: skuFactsSchema,
  pricingModel: pricingModelSchema,
  cancellationPolicyRef: z
    .object({
      policyId: z.string().trim().min(1),
      policyVersion: z.number().int().positive(),
    })
    .nullable()
    .optional(),
});

const cancellationTierSchema = z.object({
  code: z.string().trim().min(1),
  fromMinutesBeforeStart: z.number().int().nullable(),
  untilMinutesBeforeStart: z.number().int().nullable(),
  refundPercent: z.number().int().min(0).max(100),
  requiresOperatorHandling: z.boolean(),
  visibleLabel: z.string().trim().min(1),
});

const skuCancellationPolicyInputSchema = z.object({
  policyId: z.string().trim().min(1).optional(),
  policyVersion: z.number().int().positive().optional(),
  operatorBufferMinutes: z.number().int().nonnegative(),
  tiers: z.array(cancellationTierSchema).min(1),
});

const offerInputSchema = z.object({
  productType: productTypeSchema,
  spuIds: z.array(z.number().int().positive()).min(1),
  status: offerStatusSchema,
  pricingRules: z.array(pricingRuleSchema),
  termsVersion: z.number().int().positive(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
});

const placementBindingRuleSchema = z.object({
  fieldKey: z.string().trim().min(1),
  contextPath: z.string().trim().min(1),
  lock: z.literal(true),
});

const placementInputSchema = z.object({
  placementType: z.literal("BUTTON"),
  offerId: z.number().int().positive(),
  status: placementStatusSchema,
  effectiveFrom: z.string().datetime({ offset: true }).nullable().optional(),
  effectiveTo: z.string().datetime({ offset: true }).nullable().optional(),
  matchingRule: z.unknown(),
  priority: z.number().int(),
  creative: z.object({
    ctaLabel: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
  }),
  bindingRules: z.array(placementBindingRuleSchema),
});

const fulfillmentIdParamSchema = z.object({
  fulfillmentId: z.string().uuid(),
});

const spuIdParamSchema = z.object({
  spuId: z.coerce.number().int().positive(),
});

const skuIdParamSchema = z.object({
  skuId: z.coerce.number().int().positive(),
});

const offerIdParamSchema = z.object({
  offerId: z.coerce.number().int().positive(),
});

const placementIdParamSchema = z.object({
  placementId: z.coerce.number().int().positive(),
});

const recordEntryGuidanceInputSchema = z.object({
  entryByPhone: z.string().trim().nullable().optional(),
  entryByRealName: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

const rentalBookingDecisionInputSchema = z.object({
  bookingNote: z.string().trim().nullable().optional(),
});

const rentalCancellationDecisionInputSchema = z.object({
  reason: z.string().trim().nullable().optional(),
});

const toDate = (value: string | null | undefined): Date | null =>
  value ? new Date(value) : null;

type JsonEndpoint<
  Input,
  Output,
  Status extends number = 200,
> = {
  input: Input;
  output: Output;
  outputFormat: "json";
  status: Status;
};

type EmptyInput = {};
type NumericParam<Key extends string> = {
  param: Record<Key, string>;
};
type UuidParam<Key extends string> = {
  param: Record<Key, string>;
};

type AdminCommerceManagementSchema = {
  "/commerce/products/workspace": {
    $get: JsonEndpoint<
      EmptyInput,
      Awaited<ReturnType<typeof getAdminCommerceProductWorkspace>>
    >;
  };
  "/commerce/products/spus": {
    $post: JsonEndpoint<{ json: unknown }, Awaited<ReturnType<typeof createProductSpu>>>;
  };
  "/commerce/products/spus/:spuId": {
    $patch: JsonEndpoint<
      NumericParam<"spuId"> & { json: unknown },
      Awaited<ReturnType<typeof updateAdminCommerceProductSpu>>
    >;
  };
  "/commerce/products/skus": {
    $post: JsonEndpoint<{ json: unknown }, Awaited<ReturnType<typeof createProductSku>>>;
  };
  "/commerce/products/skus/:skuId": {
    $patch: JsonEndpoint<
      NumericParam<"skuId"> & { json: unknown },
      Awaited<ReturnType<typeof updateAdminCommerceProductSku>>
    >;
  };
  "/commerce/products/skus/:skuId/cancellation-policy": {
    $post: JsonEndpoint<NumericParam<"skuId"> & { json: unknown }, unknown>;
  };
  "/commerce/placement-offer/workspace": {
    $get: JsonEndpoint<
      EmptyInput,
      Awaited<ReturnType<typeof getAdminCommercePlacementOfferWorkspace>>
    >;
  };
  "/commerce/offers": {
    $post: JsonEndpoint<{ json: unknown }, Awaited<ReturnType<typeof createOffer>>>;
  };
  "/commerce/offers/:offerId": {
    $patch: JsonEndpoint<
      NumericParam<"offerId"> & { json: unknown },
      Awaited<ReturnType<typeof updateAdminCommerceOffer>>
    >;
  };
  "/commerce/placements": {
    $post: JsonEndpoint<{ json: unknown }, Awaited<ReturnType<typeof createPlacement>>>;
  };
  "/commerce/placements/:placementId": {
    $patch: JsonEndpoint<
      NumericParam<"placementId"> & { json: unknown },
      Awaited<ReturnType<typeof updateAdminCommercePlacement>>
    >;
  };
  "/commerce/orders-bills/workspace": {
    $get: JsonEndpoint<
      EmptyInput,
      Awaited<ReturnType<typeof getAdminCommerceOrderBillWorkspace>>
    >;
  };
  "/commerce/fulfillments/workspace": {
    $get: JsonEndpoint<
      EmptyInput,
      Awaited<ReturnType<typeof getAdminCommerceFulfillmentWorkspace>>
    >;
  };
  "/commerce/fulfillments/rental/:fulfillmentId/confirm-booking": {
    $post: JsonEndpoint<
      UuidParam<"fulfillmentId"> & { json: { bookingNote?: string | null } },
      Awaited<ReturnType<typeof confirmRentalBooking>>
    >;
  };
  "/commerce/fulfillments/rental/:fulfillmentId/reject-booking": {
    $post: JsonEndpoint<
      UuidParam<"fulfillmentId"> & { json: { bookingNote?: string | null } },
      Awaited<ReturnType<typeof rejectRentalBooking>>
    >;
  };
  "/commerce/fulfillments/rental/:fulfillmentId/approve-cancellation": {
    $post: JsonEndpoint<
      UuidParam<"fulfillmentId"> & { json: z.infer<typeof rentalCancellationDecisionInputSchema> },
      Awaited<ReturnType<typeof resolveAdminRentalFulfillmentCancellation>>
    >;
  };
  "/commerce/fulfillments/rental/:fulfillmentId/deny-cancellation": {
    $post: JsonEndpoint<
      UuidParam<"fulfillmentId"> & { json: z.infer<typeof rentalCancellationDecisionInputSchema> },
      Awaited<ReturnType<typeof resolveAdminRentalFulfillmentCancellation>>
    >;
  };
  "/commerce/fulfillments/rental/:fulfillmentId/entry-guidance": {
    $post: JsonEndpoint<
      UuidParam<"fulfillmentId"> & { json: z.infer<typeof recordEntryGuidanceInputSchema> },
      Awaited<ReturnType<typeof recordRentalEntryGuidance>>
    >;
  };
};

export const adminCommerceManagementRoute: Hono<
  AdminAuthEnv,
  AdminCommerceManagementSchema
> = app
  .use("*", adminAuthMiddleware)
  .get("/commerce/products/workspace", async (c) => {
    const result = await getAdminCommerceProductWorkspace();
    return c.json(result);
  })
  .post(
    "/commerce/products/spus",
    zValidator("json", productSpuInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createProductSpu(payload as CreateProductSpuInput);
      return c.json(result);
    },
  )
  .patch(
    "/commerce/products/spus/:spuId",
    zValidator("param", spuIdParamSchema),
    zValidator("json", productSpuInputSchema),
    async (c) => {
      const { spuId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminCommerceProductSpu({
        spuId,
        ...payload,
      } as Parameters<typeof updateAdminCommerceProductSpu>[0]);
      return c.json(result);
    },
  )
  .post(
    "/commerce/products/skus",
    zValidator("json", productSkuInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createProductSku({
        ...payload,
        cancellationPolicyRef: payload.cancellationPolicyRef ?? null,
      } as CreateProductSkuInput);
      return c.json(result);
    },
  )
  .patch(
    "/commerce/products/skus/:skuId",
    zValidator("param", skuIdParamSchema),
    zValidator("json", productSkuInputSchema.omit({ spuId: true })),
    async (c) => {
      const { skuId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminCommerceProductSku({
        skuId,
        ...payload,
        cancellationPolicyRef: payload.cancellationPolicyRef ?? null,
      } as Parameters<typeof updateAdminCommerceProductSku>[0]);
      return c.json(result);
    },
  )
  .post(
    "/commerce/products/skus/:skuId/cancellation-policy",
    zValidator("param", skuIdParamSchema),
    zValidator("json", skuCancellationPolicyInputSchema),
    async (c) => {
      const { skuId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result =
        payload.policyId && payload.policyVersion
          ? await createSkuCancellationPolicy({
              policyId: payload.policyId,
              policyVersion: payload.policyVersion,
              skuId,
              operatorBufferMinutes: payload.operatorBufferMinutes,
              tiers: payload.tiers,
            })
          : await saveAdminCommerceSkuCancellationPolicy({
              skuId,
              operatorBufferMinutes: payload.operatorBufferMinutes,
              tiers: payload.tiers,
            });
      return c.json(result);
    },
  )
  .get("/commerce/placement-offer/workspace", async (c) => {
    const result = await getAdminCommercePlacementOfferWorkspace();
    return c.json(result);
  })
  .post(
    "/commerce/offers",
    zValidator("json", offerInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createOffer({
        ...payload,
        startsAt: toDate(payload.startsAt),
        endsAt: toDate(payload.endsAt),
      } as CreateOfferInput);
      return c.json(result);
    },
  )
  .patch(
    "/commerce/offers/:offerId",
    zValidator("param", offerIdParamSchema),
    zValidator("json", offerInputSchema),
    async (c) => {
      const { offerId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminCommerceOffer({
        offerId,
        ...payload,
        startsAt: toDate(payload.startsAt),
        endsAt: toDate(payload.endsAt),
      } as Parameters<typeof updateAdminCommerceOffer>[0]);
      return c.json(result);
    },
  )
  .post(
    "/commerce/placements",
    zValidator("json", placementInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createPlacement({
        ...payload,
        effectiveFrom: toDate(payload.effectiveFrom),
        effectiveTo: toDate(payload.effectiveTo),
      } as CreatePlacementInput);
      return c.json(result);
    },
  )
  .patch(
    "/commerce/placements/:placementId",
    zValidator("param", placementIdParamSchema),
    zValidator("json", placementInputSchema),
    async (c) => {
      const { placementId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminCommercePlacement({
        placementId,
        ...payload,
        effectiveFrom: toDate(payload.effectiveFrom),
        effectiveTo: toDate(payload.effectiveTo),
      } as Parameters<typeof updateAdminCommercePlacement>[0]);
      return c.json(result);
    },
  )
  .get("/commerce/orders-bills/workspace", async (c) => {
    const result = await getAdminCommerceOrderBillWorkspace();
    return c.json(result);
  })
  .get("/commerce/fulfillments/workspace", async (c) => {
    const result = await getAdminCommerceFulfillmentWorkspace();
    return c.json(result);
  })
  .post(
    "/commerce/fulfillments/rental/:fulfillmentId/confirm-booking",
    zValidator("param", fulfillmentIdParamSchema),
    zValidator("json", rentalBookingDecisionInputSchema),
    async (c) => {
      const { fulfillmentId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await confirmRentalBooking({
        fulfillmentId,
        bookingNote: payload.bookingNote ?? null,
      });
      return c.json(result);
    },
  )
  .post(
    "/commerce/fulfillments/rental/:fulfillmentId/reject-booking",
    zValidator("param", fulfillmentIdParamSchema),
    zValidator("json", rentalBookingDecisionInputSchema),
    async (c) => {
      const { fulfillmentId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await rejectRentalBooking({
        fulfillmentId,
        bookingNote: payload.bookingNote ?? null,
      });
      return c.json(result);
    },
  )
  .post(
    "/commerce/fulfillments/rental/:fulfillmentId/approve-cancellation",
    zValidator("param", fulfillmentIdParamSchema),
    zValidator("json", rentalCancellationDecisionInputSchema),
    async (c) => {
      const { fulfillmentId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await resolveAdminRentalFulfillmentCancellation({
        fulfillmentId,
        outcome: "APPROVED",
        reason: payload.reason ?? null,
      });
      return c.json(result);
    },
  )
  .post(
    "/commerce/fulfillments/rental/:fulfillmentId/deny-cancellation",
    zValidator("param", fulfillmentIdParamSchema),
    zValidator("json", rentalCancellationDecisionInputSchema),
    async (c) => {
      const { fulfillmentId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await resolveAdminRentalFulfillmentCancellation({
        fulfillmentId,
        outcome: "DENIED",
        reason: payload.reason ?? null,
      });
      return c.json(result);
    },
  )
  .post(
    "/commerce/fulfillments/rental/:fulfillmentId/entry-guidance",
    zValidator("param", fulfillmentIdParamSchema),
    zValidator("json", recordEntryGuidanceInputSchema),
    async (c) => {
      const { fulfillmentId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await recordRentalEntryGuidance({
        fulfillmentId,
        entryByPhone: payload.entryByPhone ?? null,
        entryByRealName: payload.entryByRealName ?? null,
        note: payload.note ?? null,
      });
      return c.json(result);
    },
  );
