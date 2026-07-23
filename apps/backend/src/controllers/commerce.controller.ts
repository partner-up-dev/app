import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, authMiddleware } from "../auth/middleware";
import {
  getBillDetail,
  getBillDetailByOrderId,
  getBillLineCheckoutTarget,
  listViewerBills,
} from "../domains/bill/queries";
import { reconcileRideHailingOrder } from "../domains/ride-hailing/commands";
import {
  cancelOrderFromOrderDetail,
  createOrderCommand,
  simulateRentalBookingConfirmation,
} from "../domains/trade/commands";
import {
  getCommerceOrderDetail,
  listOfferListing,
  queryRideHailingCancellationFeeFromOrderDetail,
} from "../domains/trade/queries";
import { requireAuthenticatedUserId } from "./pr-controller.shared";

const app = new Hono<AuthEnv>();

const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

const billIdParamSchema = z.object({
  billId: z.string().uuid(),
});

const billLineIdParamSchema = z.object({
  billLineId: z.string().uuid(),
});

const registrantSchema = z.object({
  fullName: z.string().trim().min(1),
  nationalId: z.string().trim().nullable().optional(),
});

const listingParticipantSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().nullable().optional(),
  phoneMasked: z.string().trim().nullable().optional(),
});

const fixedQuoteBoundOrderItemCommandSchema = z.object({
  kind: z.literal("FIXED"),
  quoteId: z.string().uuid(),
  quantity: z.number().int().positive().nullable().optional(),
});

const choiceSetQuoteBoundOrderItemCommandSchema = z.object({
  kind: z.literal("CHOICE_SET"),
  candidateQuoteIds: z.array(z.string().uuid()).min(1),
  quantity: z.literal(1).nullable().optional(),
});

const quoteBoundOrderItemCommandSchema = z.union([
  fixedQuoteBoundOrderItemCommandSchema,
  choiceSetQuoteBoundOrderItemCommandSchema,
]);

const rideHailingPlaceSnapshotSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
});

const rideHailingRouteSnapshotSchema = z.object({
  origin: rideHailingPlaceSnapshotSchema,
  waypoints: z.array(rideHailingPlaceSnapshotSchema),
  destination: rideHailingPlaceSnapshotSchema,
  drivingPlan: z
    .object({
      distanceMeters: z.number().int().nonnegative().nullable().optional(),
      durationSeconds: z.number().int().nonnegative().nullable().optional(),
      polyline: z
        .array(z.object({ latitude: z.number(), longitude: z.number() }))
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const genericCreateOrderCommandSchema = z.object({
  prId: z.number().int().positive().nullable().optional(),
  items: z.array(quoteBoundOrderItemCommandSchema).min(1),
});

const createOrderHeaderSchema = z.object({
  "idempotency-key": z.string().trim().min(8).max(128),
});

const offerIdParamSchema = z.object({
  offerId: z.coerce.number().int().positive(),
});

const offerListingInputSchema = z.union([
  z.object({
    productType: z.literal("RENTAL"),
    participants: z.array(listingParticipantSchema).min(1),
    serviceStartAt: z.string().datetime({ offset: true }),
    serviceEndAt: z.string().datetime({ offset: true }),
    contactPhone: z.string().trim().min(1),
    registrants: z.array(registrantSchema).min(1),
  }),
  z.object({
    productType: z.literal("RIDE_HAILING"),
    participants: z.array(listingParticipantSchema).min(1),
    route: rideHailingRouteSnapshotSchema,
    departureAt: z.string().datetime({ offset: true }).nullable().optional(),
    riders: z.array(listingParticipantSchema).min(1),
    contactPhone: z.string().trim().min(1),
  }),
]);

type JsonEndpoint<Input, Output, Status extends number = 200> = {
  input: Input;
  output: Output;
  outputFormat: "json";
  status: Status;
};

type UuidParam<Key extends string> = {
  param: Record<Key, string>;
};

type CommerceRouteSchema = {
  "/offers/:offerId/listing": {
    $post: JsonEndpoint<
      { param: z.infer<typeof offerIdParamSchema>; json: z.infer<typeof offerListingInputSchema> },
      Awaited<ReturnType<typeof listOfferListing>>
    >;
  };
  "/orders": {
    $post: JsonEndpoint<
      {
        header: z.infer<typeof createOrderHeaderSchema>;
        json: z.infer<typeof genericCreateOrderCommandSchema>;
      },
      Awaited<ReturnType<typeof createOrderCommand>>,
      201 | 202
    >;
  };
  "/orders/:orderId": {
    $get: JsonEndpoint<UuidParam<"orderId">, Awaited<ReturnType<typeof getCommerceOrderDetail>>>;
  };
  "/orders/:orderId/bill": {
    $get: JsonEndpoint<UuidParam<"orderId">, Awaited<ReturnType<typeof getBillDetailByOrderId>>>;
  };
  "/orders/:orderId/ride-hailing/reconcile": {
    $post: JsonEndpoint<
      UuidParam<"orderId">,
      Awaited<ReturnType<typeof reconcileRideHailingOrder>>
    >;
  };
  "/bills": {
    $get: JsonEndpoint<{}, Awaited<ReturnType<typeof listViewerBills>>>;
  };
  "/bills/:billId": {
    $get: JsonEndpoint<UuidParam<"billId">, Awaited<ReturnType<typeof getBillDetail>>>;
  };
  "/bill-lines/:billLineId": {
    $get: JsonEndpoint<
      UuidParam<"billLineId">,
      Awaited<ReturnType<typeof getBillLineCheckoutTarget>>
    >;
  };
  "/orders/:orderId/cancel": {
    $post: JsonEndpoint<
      UuidParam<"orderId">,
      Awaited<ReturnType<typeof cancelOrderFromOrderDetail>>
    >;
  };
  "/orders/:orderId/cancel-fee-preview": {
    $get: JsonEndpoint<
      UuidParam<"orderId">,
      Awaited<ReturnType<typeof queryRideHailingCancellationFeeFromOrderDetail>>
    >;
  };
  "/orders/:orderId/mock-rental-booking-confirmation": {
    $post: JsonEndpoint<
      UuidParam<"orderId">,
      Awaited<ReturnType<typeof simulateRentalBookingConfirmation>>
    >;
  };
};

export const commerceRoute: Hono<AuthEnv, CommerceRouteSchema> = app
  .use("*", authMiddleware)
  .post(
    "/offers/:offerId/listing",
    zValidator("param", offerIdParamSchema),
    zValidator("json", offerListingInputSchema),
    async (c) => {
      const { offerId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const userId = requireAuthenticatedUserId(c);
      const result = await listOfferListing({
        offerId,
        viewerUserId: userId,
        listingInput: payload,
      });
      return c.json(result);
    },
  )
  .post(
    "/orders",
    zValidator("header", createOrderHeaderSchema),
    zValidator("json", genericCreateOrderCommandSchema),
    async (c) => {
      const { "idempotency-key": idempotencyKey } = c.req.valid("header");
      const payload = c.req.valid("json");
      const userId = requireAuthenticatedUserId(c);
      const result = await createOrderCommand({
        ...payload,
        createdBy: userId,
        idempotencyKey,
      });
      return result.outcome === "PROCESSING" ? c.json(result, 202) : c.json(result, 201);
    },
  )
  .get("/orders/:orderId", zValidator("param", orderIdParamSchema), async (c) => {
    const { orderId } = c.req.valid("param");
    const auth = c.get("auth");
    const result = await getCommerceOrderDetail({
      orderId,
      viewerUserId: auth.userId,
    });
    return c.json(result);
  })
  .get("/orders/:orderId/bill", zValidator("param", orderIdParamSchema), async (c) => {
    const { orderId } = c.req.valid("param");
    const auth = c.get("auth");
    const result = await getBillDetailByOrderId({
      orderId,
      viewerUserId: auth.userId,
    });
    return c.json(result);
  })
  .post(
    "/orders/:orderId/ride-hailing/reconcile",
    zValidator("param", orderIdParamSchema),
    async (c) => {
      const { orderId } = c.req.valid("param");
      const userId = requireAuthenticatedUserId(c);
      const result = await reconcileRideHailingOrder({
        orderId,
        viewerUserId: userId,
      });
      return c.json(result);
    },
  )
  .get("/bills", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const result = await listViewerBills({
      viewerUserId: userId,
    });
    return c.json(result);
  })
  .get("/bills/:billId", zValidator("param", billIdParamSchema), async (c) => {
    const { billId } = c.req.valid("param");
    const auth = c.get("auth");
    const result = await getBillDetail({
      billId,
      viewerUserId: auth.userId,
    });
    return c.json(result);
  })
  .get("/bill-lines/:billLineId", zValidator("param", billLineIdParamSchema), async (c) => {
    const { billLineId } = c.req.valid("param");
    const auth = c.get("auth");
    const result = await getBillLineCheckoutTarget({
      billLineId,
      viewerUserId: auth.userId,
    });
    return c.json(result);
  })
  .post("/orders/:orderId/cancel", zValidator("param", orderIdParamSchema), async (c) => {
    const { orderId } = c.req.valid("param");
    const userId = requireAuthenticatedUserId(c);
    const result = await cancelOrderFromOrderDetail({
      orderId,
      actorUserId: userId,
    });
    return c.json(result);
  })
  .get(
    "/orders/:orderId/cancel-fee-preview",
    zValidator("param", orderIdParamSchema),
    async (c) => {
      const { orderId } = c.req.valid("param");
      const userId = requireAuthenticatedUserId(c);
      const result = await queryRideHailingCancellationFeeFromOrderDetail({
        orderId,
        actorUserId: userId,
      });
      return c.json(result);
    },
  )
  .post(
    "/orders/:orderId/mock-rental-booking-confirmation",
    zValidator("param", orderIdParamSchema),
    async (c) => {
      const { orderId } = c.req.valid("param");
      const userId = requireAuthenticatedUserId(c);
      const result = await simulateRentalBookingConfirmation({
        orderId,
        actorUserId: userId,
      });
      return c.json(result);
    },
  );
