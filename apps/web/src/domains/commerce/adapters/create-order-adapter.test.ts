import { describe, expect, it } from "vitest";
import type { CreateOrderValue } from "@/domains/commerce/model/ordering-content";
import { toCreateOrderRequest } from "./create-order-adapter";

describe("create order adapter", () => {
  it("preserves nullable PR identity and fixed quote values", () => {
    const value = {
      prId: null,
      items: [{ kind: "FIXED", quoteId: "quote-fixed", quantity: null }],
    } satisfies CreateOrderValue;

    expect(toCreateOrderRequest(value)).toEqual(value);
  });

  it("preserves choice-set quote order and optional quantity omission", () => {
    const value = {
      prId: 42,
      items: [
        {
          kind: "CHOICE_SET",
          candidateQuoteIds: ["quote-b", "quote-a"],
        },
      ],
    } satisfies CreateOrderValue;

    expect(toCreateOrderRequest(value)).toEqual(value);
  });
});
