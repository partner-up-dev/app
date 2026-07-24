import type { InferRequestType } from "hono";
import type { CreateOrderValue, OrderItemValue } from "@/domains/commerce/model/ordering-content";
import { client } from "@/lib/rpc";

type CreateOrderRoute = (typeof client.api.commerce.orders)["$post"];
type CreateOrderRequest = InferRequestType<CreateOrderRoute>["json"];
type CreateOrderRequestItem = CreateOrderRequest["items"][number];

const toCreateOrderRequestItem = (value: OrderItemValue): CreateOrderRequestItem => {
  if (value.kind === "FIXED") {
    return {
      kind: "FIXED",
      quoteId: value.quoteId,
      ...(value.quantity === undefined ? {} : { quantity: value.quantity }),
    };
  }

  return {
    kind: "CHOICE_SET",
    candidateQuoteIds: [...value.candidateQuoteIds],
    ...(value.quantity === undefined ? {} : { quantity: value.quantity }),
  };
};

export const toCreateOrderRequest = (value: CreateOrderValue): CreateOrderRequest => ({
  prId: value.prId,
  items: value.items.map(toCreateOrderRequestItem),
});
