import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, authMiddleware } from "../auth/middleware";
import { createPaymentCharge, getPaymentTx, listPaymentProviders } from "../domains/payment";
import { throwHttpProblem } from "../lib/problem-details";

const app = new Hono<AuthEnv>();

const CLIENT_ID_HEADER = "x-client-id";

const paymentProviderInstanceParamSchema = z.object({
  paymentProviderInstanceId: z.string().uuid(),
});

const paymentTxParamSchema = z.object({
  paymentTxId: z.string().trim().min(1),
});

const billLineQuerySchema = z.object({
  "bill-line": z.string().uuid(),
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

type JsonEndpoint<Input, Output, Status extends number = 200> = {
  input: Input;
  output: Output;
  outputFormat: "json";
  status: Status;
};

type PaymentRouteSchema = {
  "/providers": {
    $get: JsonEndpoint<{}, Awaited<ReturnType<typeof listPaymentProviders>>>;
  };
  "/:paymentProviderInstanceId/charge": {
    $post: JsonEndpoint<
      {
        param: z.infer<typeof paymentProviderInstanceParamSchema>;
        query: z.infer<typeof billLineQuerySchema>;
      },
      Awaited<ReturnType<typeof createPaymentCharge>>
    >;
  };
  "/:paymentTxId": {
    $get: JsonEndpoint<
      { param: z.infer<typeof paymentTxParamSchema> },
      Awaited<ReturnType<typeof getPaymentTx>>
    >;
  };
};

export const paymentRoute: Hono<AuthEnv, PaymentRouteSchema> = app
  .use("*", authMiddleware)
  .get("/providers", async (c) => {
    const auth = c.get("auth");
    const result = await listPaymentProviders({
      viewerUserId: auth.userId,
      clientId: readClientId(c.req.header(CLIENT_ID_HEADER)),
    });
    return c.json(result);
  })
  .post(
    "/:paymentProviderInstanceId/charge",
    zValidator("param", paymentProviderInstanceParamSchema),
    zValidator("query", billLineQuerySchema),
    async (c) => {
      const { paymentProviderInstanceId } = c.req.valid("param");
      const query = c.req.valid("query");
      const auth = c.get("auth");
      const result = await createPaymentCharge({
        paymentProviderInstanceId,
        billLineId: query["bill-line"],
        viewerUserId: auth.userId,
        clientId: readClientId(c.req.header(CLIENT_ID_HEADER)),
      });
      return c.json(result);
    },
  )
  .get("/:paymentTxId", zValidator("param", paymentTxParamSchema), async (c) => {
    const { paymentTxId } = c.req.valid("param");
    const auth = c.get("auth");
    const result = await getPaymentTx({
      paymentTxId,
      viewerUserId: auth.userId,
    });
    return c.json(result);
  });
