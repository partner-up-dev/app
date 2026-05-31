import { describe, expect, it } from "vitest";
import type {
  RideHailingProviderInstance,
  RideHailingProviderInstanceId,
} from "../../../entities/ride-hailing-provider";
import {
  buildCaocaoSignedParams,
  CaocaoProviderAdapter,
  createCaocaoSignature,
  decodeCaocaoExternalOrderId,
  encodeCaocaoExternalOrderId,
  parseRideHailingProviderRegistrationConfig,
  resolveCaocaoOrderStatusCallbackUrl,
} from ".";

const providerInstanceId =
  "00000000-0000-0000-0000-000000000501" as RideHailingProviderInstanceId;
const orderId = "123e4567-e89b-12d3-a456-426614174000";
const now = new Date("2031-01-01T00:00:00.000Z");

const caocaoProviderInstance = (): RideHailingProviderInstance => ({
  id: providerInstanceId,
  providerType: "CAOCAO",
  instanceKey: "caocao-default",
  status: "ACTIVE",
  displayName: "Caocao Default",
  config: {
    adapterMode: "CAOCAO_OPEN_API",
    caocaoClientId: "caocao-client",
    signKey: "caocao-secret",
    endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
    callbackBaseUrl: "https://api.partner-up.test",
    requestTimeoutMs: 5000,
  },
  createdAt: now,
  updatedAt: now,
});

describe("Caocao provider config", () => {
  it("validates registration config from stored provider config", () => {
    const parsed = parseRideHailingProviderRegistrationConfig({
      providerType: "CAOCAO",
      instanceKey: "caocao-default",
      displayName: "Caocao Default",
      config: caocaoProviderInstance().config,
    });

    expect(parsed.config.caocaoClientId).toBe("caocao-client");
    expect(parsed.config.signKey).toBe("caocao-secret");
  });

  it("rejects incomplete Caocao provider config", () => {
    expect(() =>
      parseRideHailingProviderRegistrationConfig({
        providerType: "CAOCAO",
        instanceKey: "caocao-default",
        displayName: "Caocao Default",
        config: {
          adapterMode: "CAOCAO_OPEN_API",
          caocaoClientId: "caocao-client",
          endpointBaseUrl: "https://openapi.caocaokeji.cn/v2",
        },
      }),
    ).toThrow();
  });
});

describe("Caocao signer", () => {
  it("signs params by key order and keeps sign_key out of transport params", () => {
    const params = {
      foo: "123",
      client_id: "caocao-client",
      timestamp: "1700000000000",
    };

    expect(
      createCaocaoSignature({
        params,
        signKey: "caocao-secret",
      }),
    ).toBe("11ef2c9311786249e5fe3c998f12b01113478ad4");

    const signed = buildCaocaoSignedParams({
      params: { foo: 123 },
      clientId: "caocao-client",
      signKey: "caocao-secret",
      timestampMs: 1700000000000,
    });

    expect(signed).toMatchObject({
      client_id: "caocao-client",
      foo: "123",
      timestamp: "1700000000000",
      sign: "11ef2c9311786249e5fe3c998f12b01113478ad4",
    });
    expect(signed).not.toHaveProperty("sign_key");
  });

  it("serializes signed GET requests without leaking sign_key", async () => {
    let requestUrl: string | null = null;
    const fetchImpl: typeof fetch = async (input) => {
      requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      return new Response(
        JSON.stringify({
          code: 200,
          success: true,
          data: { quoted: true },
        }),
        { status: 200 },
      );
    };
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
      fetchImpl,
    });

    await adapter.estimate({ params: { city_code: "0571" } });

    expect(requestUrl).not.toBeNull();
    const url = new URL(requestUrl ?? "");
    expect(url.pathname).toBe("/v2/common/estimatePriceWithDetail");
    expect(url.searchParams.get("client_id")).toBe("caocao-client");
    expect(url.searchParams.get("city_code")).toBe("0571");
    expect(url.searchParams.has("timestamp")).toBe(true);
    expect(url.searchParams.has("sign")).toBe(true);
    expect(url.searchParams.has("sign_key")).toBe(false);
  });
});

describe("Caocao external order id", () => {
  it("roundtrips order UUID through a Caocao-compatible compact id", () => {
    const externalOrderId = encodeCaocaoExternalOrderId(orderId);

    expect(externalOrderId.startsWith("rh")).toBe(true);
    expect(externalOrderId.length).toBeLessThanOrEqual(30);
    expect(decodeCaocaoExternalOrderId(externalOrderId)).toBe(orderId);
  });

  it("rejects non-UUID local order ids", () => {
    expect(() => encodeCaocaoExternalOrderId("not-a-uuid")).toThrow(
      "Caocao external order id requires a UUID order id",
    );
  });
});

describe("Caocao callback verification", () => {
  it("verifies callback signature and resolves local order id", () => {
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
    });
    const unsigned = {
      timestamp: "1700000000000",
      order_id: "CC123456",
      ext_order_id: adapter.buildExternalOrderId(orderId),
      event: "20",
    };
    const form = {
      ...unsigned,
      sign: createCaocaoSignature({
        params: unsigned,
        signKey: "caocao-secret",
      }),
    };

    const parsed = adapter.parseOrderStatusCallback(form);

    expect(parsed.providerType).toBe("CAOCAO");
    expect(parsed.providerOrderId).toBe("CC123456");
    expect(parsed.localOrderId).toBe(orderId);
    expect(parsed.event).toBe(20);
    expect(parsed.timestampMs).toBe(1700000000000);
  });

  it("rejects callbacks with invalid signatures or unsupported events", () => {
    const adapter = new CaocaoProviderAdapter({
      providerInstance: caocaoProviderInstance(),
    });
    const unsigned = {
      timestamp: "1700000000000",
      order_id: "CC123456",
      ext_order_id: adapter.buildExternalOrderId(orderId),
      event: "20",
    };
    const validSign = createCaocaoSignature({
      params: unsigned,
      signKey: "caocao-secret",
    });

    expect(() =>
      adapter.parseOrderStatusCallback({
        ...unsigned,
        sign: "bad-signature",
      }),
    ).toThrow("Caocao callback signature verification failed");

    const unsupportedEvent = {
      ...unsigned,
      event: "999",
    };
    expect(() =>
      adapter.parseOrderStatusCallback({
        ...unsupportedEvent,
        sign: createCaocaoSignature({
          params: unsupportedEvent,
          signKey: "caocao-secret",
        }),
      }),
    ).toThrow("Caocao callback event is unsupported");
    expect(validSign).toHaveLength(40);
  });

  it("builds provider-instance-specific callback URLs from stored config", () => {
    expect(resolveCaocaoOrderStatusCallbackUrl(caocaoProviderInstance())).toBe(
      "https://api.partner-up.test/api/ride-hailing/caocao/00000000-0000-0000-0000-000000000501/callback/order-status",
    );
  });
});
