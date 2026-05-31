import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { requireAuthenticatedUserId } from "./pr-controller.shared";
import { throwHttpProblem } from "../lib/problem-details";
import {
  cancelRentalOrderFromOrderDetail,
  createRentalOrderFromPlacement,
  createRideHailingOrderFromPlacement,
  evaluateRentalOrdering,
  evaluateRideHailingOrdering,
  getCommerceOrderDetail,
  getOrderingFromPlacement,
  simulateRentalBookingConfirmation,
} from "../domains/trade";
import {
  createOrReuseChargeForBillLine,
  getBillDetail,
  getBillDetailByOrderId,
  getPaymentCheckout,
  getPaymentTxDetail,
  syncPaymentTx,
} from "../domains/payment";

const app = new Hono<AuthEnv>();

const placementOrderingQuerySchema = z.object({
  offerId: z.coerce.number().int().positive(),
  prId: z.coerce.number().int().positive(),
});

const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

const billIdParamSchema = z.object({
  billId: z.string().uuid(),
});

const billLineIdParamSchema = z.object({
  billLineId: z.string().uuid(),
});

const paymentTxIdParamSchema = z.object({
  paymentTxId: z.string().uuid(),
});

const CLIENT_ID_HEADER = "x-client-id";

const registrantSchema = z.object({
  fullName: z.string().trim().min(1),
  nationalId: z.string().trim().nullable().optional(),
});

const rentalOrderingCommandSchema = z.object({
  offerId: z.number().int().positive(),
  prId: z.number().int().positive().nullable().optional(),
  items: z
    .array(
      z.object({
        spuId: z.number().int().positive(),
        skuId: z.number().int().positive(),
        quantity: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1),
  productTypedExtraProperties: z.object({
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
  items: z
    .array(
      z.object({
        spuId: z.number().int().positive().nullable().optional(),
        skuId: z.number().int().positive(),
        quantity: z.number().int().positive().nullable().optional(),
      }),
    )
    .min(1),
  productTypedExtraProperties: z.object({
    route: rideHailingRouteSnapshotSchema,
    departureAt: z.string().datetime({ offset: true }).nullable().optional(),
    riders: z.array(z.string().uuid()).min(1),
    contactPhone: z.string().trim().min(1),
  }),
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

export const commerceRoute = app
  .use("*", authMiddleware)
  .get(
    "/ordering/from-placement",
    zValidator("query", placementOrderingQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getOrderingFromPlacement({
        offerId: query.offerId,
        prId: query.prId,
      });
      return c.json(result);
    },
  )
  .post(
    "/ordering/rental/evaluate",
    zValidator("json", rentalOrderingCommandSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const auth = c.get("auth");
      const result = await evaluateRentalOrdering({
        offerId: payload.offerId,
        prId: payload.prId,
        items: payload.items,
        productTypedExtraProperties: payload.productTypedExtraProperties,
        viewerUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .post(
    "/ordering/ride-hailing/evaluate",
    zValidator("json", rideHailingOrderingCommandSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const auth = c.get("auth");
      const result = await evaluateRideHailingOrdering({
        ...payload,
        viewerUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .post(
    "/orders/ride-hailing",
    zValidator("json", rideHailingOrderingCommandSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const userId = requireAuthenticatedUserId(c);
      const result = await createRideHailingOrderFromPlacement({
        ...payload,
        createdBy: userId,
      });
      return c.json(result, 201);
    },
  )
  .post(
    "/orders/rental",
    zValidator("json", rentalOrderingCommandSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const userId = requireAuthenticatedUserId(c);
      const result = await createRentalOrderFromPlacement({
        offerId: payload.offerId,
        prId: payload.prId,
        items: payload.items,
        productTypedExtraProperties: payload.productTypedExtraProperties,
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
  .get(
    "/payments/:paymentTxId",
    zValidator("param", paymentTxIdParamSchema),
    async (c) => {
      const { paymentTxId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await getPaymentTxDetail({
        paymentTxId,
        viewerUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .post(
    "/payments/:paymentTxId/sync",
    zValidator("param", paymentTxIdParamSchema),
    async (c) => {
      const { paymentTxId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await syncPaymentTx({
        paymentTxId,
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
