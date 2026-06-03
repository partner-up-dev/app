import { describe, expect, test } from "vitest";
import {
  buildRequestSignatureMessage,
  buildResponseSignatureMessage,
  parseAuthorizationHeader,
  signRsaSha256,
  verifyRsaSha256,
} from "./crypto";
import { createFakeWeChatPayFixture } from "./fixtures";

describe("fake WeChatPay crypto helpers", () => {
  test("parses WeChatPay APIv3 authorization headers with Zod validation", () => {
    const parsed = parseAuthorizationHeader(
      [
        "WECHATPAY2-SHA256-RSA2048",
        'mchid="1900000001",',
        'nonce_str="nonce-1",',
        'serial_no="serial-1",',
        'signature="signature-1",',
        'timestamp="1800000000"',
      ].join(" "),
    );

    expect(parsed).toEqual({
      mchid: "1900000001",
      nonce_str: "nonce-1",
      serial_no: "serial-1",
      signature: "signature-1",
      timestamp: "1800000000",
    });

    expect(() => parseAuthorizationHeader(null)).toThrow(
      "Missing WECHATPAY2-SHA256-RSA2048 Authorization header",
    );
  });

  test("builds request and response signature messages compatible with RSA verification", () => {
    const fixture = createFakeWeChatPayFixture();
    const requestMessage = buildRequestSignatureMessage({
      bodyText: '{"amount":{"total":2000}}',
      method: "post",
      nonce: "nonce-1",
      pathWithQuery: "/v3/pay/transactions/jsapi",
      timestamp: "1800000000",
    });

    expect(requestMessage).toBe(
      [
        "POST",
        "/v3/pay/transactions/jsapi",
        "1800000000",
        "nonce-1",
        '{"amount":{"total":2000}}',
        "",
      ].join("\n"),
    );

    const signature = signRsaSha256({
      message: requestMessage,
      privateKeyPem: fixture.merchantCertificate.privateKeyPem,
    });

    expect(
      verifyRsaSha256({
        message: requestMessage,
        publicKeyPem: fixture.merchantCertificate.certificatePem,
        signature,
      }),
    ).toBe(true);

    const responseMessage = buildResponseSignatureMessage({
      bodyText: '{"prepay_id":"fake_prepay_paymenttx1"}',
      nonce: "nonce-2",
      timestamp: "1800000001",
    });

    expect(responseMessage.endsWith("\n")).toBe(true);
  });
});
