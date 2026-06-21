import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { requireAuthenticatedUserId } from "./pr-controller.shared";
import { throwHttpProblem } from "../lib/problem-details";
import {
  cancelRentalOrderFromOrderDetail,
  createOrderCommand,
  evaluateOrdering,
  getCommerceOrderDetail,
  quoteRideHailingOrderingOptions,
  simulateRentalBookingConfirmation,
} from "../domains/trade";
import {
  createOrReuseChargeForBillLine,
  getBillDetail,
  getBillDetailByOrderId,
  getPaymentCheckout,
  syncPaymentForBillLine,
} from "../domains/payment";

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

const CLIENT_ID_HEADER = "x-client-id";

const registrantSchema = z.object({
  fullName: z.string().trim().min(1),
  nationalId: z.string().trim().nullable().optional(),
});

const orderParticipantSchema = z.object({
  userId: z.string().uuid(),
});

const rentalOrderingCommandSchema = z.object({
  offerId: z.number().int().positive(),
  prId: z.number().int().positive().nullable().optional(),
  participants: z.array(orderParticipantSchema).min(1),
  items: z
    .array(
      z.object({
        skuId: z.number().int().positive(),
        quantity: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1),
  extraProperties: z.object({
    serviceStartAt: z.string().datetime({ offset: true }),
    serviceEndAt: z.string().datetime({ offset: true }),
    contactPhone: z.string().trim().min(1),
    registrants: z.array(registrantSchema).min(1),
  }),
});

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

const rideHailingOrderingCommandSchema = z.object({
  offerId: z.number().int().positive(),
  prId: z.number().int().positive().nullable().optional(),
  participants: z.array(orderParticipantSchema).min(1),
  items: z
    .array(
      z.object({
        skuId: z.number().int().positive(),
        quantity: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1),
  extraProperties: z.object({
    route: rideHailingRouteSnapshotSchema,
    departureAt: z.string().datetime({ offset: true }).nullable().optional(),
    riders: z.array(z.string().uuid()).min(1),
    contactPhone: z.string().trim().min(1),
  }),
});

const genericCreateOrderCommandSchema = z.object({
  source: z.object({
    offerId: z.number().int().positive(),
  }),
  prId: z.number().int().positive().nullable().optional(),
  participants: z.array(orderParticipantSchema).min(1),
  items: z
    .array(
      z.object({
        skuId: z.number().int().positive(),
        quantity: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1),
  productTypedExtraProperties: z.union([
    rentalOrderingCommandSchema.shape.extraProperties,
    rideHailingOrderingCommandSchema.shape.extraProperties,
  ]),
});

const rideHailingEvaluationExtraPropertiesSchema =
  rideHailingOrderingCommandSchema.shape.extraProperties.extend({
    contactPhone: z.string().trim(),
  });

const genericEvaluateOrderingCommandSchema = genericCreateOrderCommandSchema.extend({
  productTypedExtraProperties: z.union([
    rentalOrderingCommandSchema.shape.extraProperties,
    rideHailingEvaluationExtraPropertiesSchema,
  ]),
});

const rideHailingOrderingOptionsCommandSchema = z.object({
  source: z.object({
    offerId: z.number().int().positive(),
  }),
  route: rideHailingRouteSnapshotSchema,
});

const readClientId = (headerValue: string | undefined): string => {
  const clientId = headerValue?.trim();
  if (!clientId) {
    return throwHttpProblem({
      status: 400,
      detail: "Missing x-client-id header",
    });
  }
  return clientId;
};

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
type UuidParam<Key extends string> = {
  param: Record<Key, string>;
};

type CommerceRouteSchema = {
  "/ordering/evaluate": {
    $post: JsonEndpoint<
      { json: z.infer<typeof genericEvaluateOrderingCommandSchema> },
      Awaited<ReturnType<typeof evaluateOrdering>>
    >;
  };
  "/ordering/ride-hailing/options": {
    $post: JsonEndpoint<
      { json: z.infer<typeof rideHailingOrderingOptionsCommandSchema> },
      Awaited<ReturnType<typeof quoteRideHailingOrderingOptions>>
    >;
  };
  "/orders": {
    $post: JsonEndpoint<
      { json: z.infer<typeof genericCreateOrderCommandSchema> },
      Awaited<ReturnType<typeof createOrderCommand>>,
      201
    >;
  };
  "/orders/:orderId": {
    $get: JsonEndpoint<
      UuidParam<"orderId">,
      Awaited<ReturnType<typeof getCommerceOrderDetail>>
    >;
  };
  "/orders/:orderId/bill": {
    $get: JsonEndpoint<
      UuidParam<"orderId">,
      Awaited<ReturnType<typeof getBillDetailByOrderId>>
    >;
  };
  "/bills/:billId": {
    $get: JsonEndpoint<UuidParam<"billId">, Awaited<ReturnType<typeof getBillDetail>>>;
  };
  "/bill-lines/:billLineId/checkout": {
    $get: JsonEndpoint<
      UuidParam<"billLineId">,
      Awaited<ReturnType<typeof getPaymentCheckout>>
    >;
  };
  "/bill-lines/:billLineId/charges": {
    $post: JsonEndpoint<
      UuidParam<"billLineId"> & EmptyInput,
      Awaited<ReturnType<typeof createOrReuseChargeForBillLine>>
    >;
  };
  "/bill-lines/:billLineId/payment/sync": {
    $post: JsonEndpoint<
      UuidParam<"billLineId"> & EmptyInput,
      Awaited<ReturnType<typeof syncPaymentForBillLine>>
    >;
  };
  "/orders/:orderId/cancel-rental": {
    $post: JsonEndpoint<
      UuidParam<"orderId"> & EmptyInput,
      Awaited<ReturnType<typeof cancelRentalOrderFromOrderDetail>>
    >;
  };
  "/orders/:orderId/mock-rental-booking-confirmation": {
    $post: JsonEndpoint<
      UuidParam<"orderId"> & EmptyInput,
      Awaited<ReturnType<typeof simulateRentalBookingConfirmation>>
    >;
  };
};

export const commerceRoute: Hono<AuthEnv, CommerceRouteSchema> = app
  .use("*", authMiddleware)
  .post(
    "/ordering/evaluate",
    zValidator("json", genericEvaluateOrderingCommandSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const auth = c.get("auth");
      const result = await evaluateOrdering({
        ...payload,
        viewerUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .post(
    "/ordering/ride-hailing/options",
    zValidator("json", rideHailingOrderingOptionsCommandSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await quoteRideHailingOrderingOptions({
        offerId: payload.source.offerId,
        route: payload.route,
      });
      return c.json(result);
    },
  )
  .post(
    "/orders",
    zValidator("json", genericCreateOrderCommandSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const userId = requireAuthenticatedUserId(c);
      const result = await createOrderCommand({
        ...payload,
        createdBy: userId,
      });
      return c.json(result, 201);
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
  .get(
    "/orders/:orderId/bill",
    zValidator("param", orderIdParamSchema),
    async (c) => {
      const { orderId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await getBillDetailByOrderId({
        orderId,
        viewerUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .get("/bills/:billId", zValidator("param", billIdParamSchema), async (c) => {
    const { billId } = c.req.valid("param");
    const auth = c.get("auth");
    const result = await getBillDetail({
      billId,
      viewerUserId: auth.userId,
    });
    return c.json(result);
  })
  .get(
    "/bill-lines/:billLineId/checkout",
    zValidator("param", billLineIdParamSchema),
    async (c) => {
      const { billLineId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await getPaymentCheckout({
        billLineId,
        viewerUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .post(
    "/bill-lines/:billLineId/charges",
    zValidator("param", billLineIdParamSchema),
    async (c) => {
      const { billLineId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await createOrReuseChargeForBillLine({
        billLineId,
        viewerUserId: auth.userId,
        clientId: readClientId(c.req.header(CLIENT_ID_HEADER)),
      });
      return c.json(result);
    },
  )
  .post(
    "/bill-lines/:billLineId/payment/sync",
    zValidator("param", billLineIdParamSchema),
    async (c) => {
      const { billLineId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await syncPaymentForBillLine({
        billLineId,
        viewerUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .post(
    "/orders/:orderId/cancel-rental",
    zValidator("param", orderIdParamSchema),
    async (c) => {
      const { orderId } = c.req.valid("param");
      const userId = requireAuthenticatedUserId(c);
      const result = await cancelRentalOrderFromOrderDetail({
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
