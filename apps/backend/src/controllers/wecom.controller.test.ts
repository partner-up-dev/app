import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { CreatorIdentityInput } from "../domains/pr/contracts";
import { ProblemDetailsError } from "../lib/problem-details";

process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/test";
process.env.WECOM_TOKEN ??= "test-token";
process.env.WECOM_ENCODING_AES_KEY ??= "test-encoding-key";
process.env.WECOM_CORP_ID ??= "test-corp";
process.env.FRONTEND_URL = "";

type WeComReply = { toUser: string; content: string };
type NaturalLanguageResult = { id: number };

const { decryptSpy, createNaturalLanguageSpy, sendTextMessageSpy } = vi.hoisted(() => ({
  decryptSpy:
    vi.fn<(encodingAesKey: string, corpId: string, encrypted: string) => { xml: string }>(),
  createNaturalLanguageSpy:
    vi.fn<
      (
        rawText: string,
        nowIso: string,
        nowWeekday: string,
        creatorIdentity: CreatorIdentityInput,
      ) => Promise<NaturalLanguageResult>
    >(),
  sendTextMessageSpy: vi.fn<(params: WeComReply) => Promise<void>>(),
}));

vi.mock("../lib/wecom-crypto", () => ({
  decryptWeComMessage: decryptSpy,
  extractXmlTagValue: (xml: string, tag: string): string | null =>
    xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? null,
  verifySignature: vi.fn<(input: unknown) => boolean>().mockReturnValue(true),
}));

vi.mock("../domains/pr/commands", () => ({
  createPRFromNaturalLanguage: createNaturalLanguageSpy,
}));

vi.mock("../services/WeComService", () => ({
  WeComService: class {
    sendTextMessage = sendTextMessageSpy;
  },
}));

const { buildWeComPRShareUrl, wecomRoute } = await import("./wecom.controller");

test("buildWeComPRShareUrl uses the canonical PR route", () => {
  assert.equal(
    buildWeComPRShareUrl("https://partner-up.test///", 42),
    "https://partner-up.test/pr/42",
  );
});

const authRequiredError = () =>
  new ProblemDetailsError({
    status: 401,
    type: "https://partner-up.app/problems/auth.authenticated_required",
    code: "AUTHENTICATED_REQUIRED",
    localizedText: {
      zhCN: { title: "需要登录", detail: "请先完成微信登录后继续操作。" },
      enUS: { title: "Login required", detail: "Please log in with WeChat before continuing." },
    },
  });

const sendWeComText = async (fromUser: string) => {
  decryptSpy.mockReturnValue({
    xml: `<xml><MsgType>text</MsgType><Content>明晚打球</Content><FromUserName>${fromUser}</FromUserName><CreateTime>1924992000</CreateTime></xml>`,
  });
  createNaturalLanguageSpy.mockRejectedValue(authRequiredError());

  return wecomRoute.request(
    "http://localhost/message?msg_signature=signature&timestamp=1&nonce=nonce",
    {
      method: "POST",
      body: "<xml><Encrypt>Y2lwaGVy</Encrypt></xml>",
    },
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("unmapped WeCom text keeps empty 200 ack and sends no success URL", async () => {
  const response = await sendWeComText("wecom-user-1");

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  await vi.waitFor(() => assert.equal(sendTextMessageSpy.mock.calls.length, 1));

  assert.deepEqual(createNaturalLanguageSpy.mock.calls[0]?.[3], {
    authenticatedUserId: null,
    anonymousUserId: null,
    oauthOpenId: null,
  });
  const reply = String(sendTextMessageSpy.mock.calls[0]?.[0]?.content ?? "");
  assert.equal(sendTextMessageSpy.mock.calls[0]?.[0]?.toUser, "wecom-user-1");
  assert.doesNotMatch(reply, /\/pr\//);
  assert.doesNotMatch(reply, /草稿已创建/);
});

test("WeCom sender matching an OAuth open id is still not creator identity", async () => {
  const response = await sendWeComText("known-open-id");

  assert.equal(response.status, 200);
  await vi.waitFor(() => assert.equal(sendTextMessageSpy.mock.calls.length, 1));
  assert.deepEqual(createNaturalLanguageSpy.mock.calls[0]?.[3], {
    authenticatedUserId: null,
    anonymousUserId: null,
    oauthOpenId: null,
  });
  assert.equal(sendTextMessageSpy.mock.calls[0]?.[0]?.toUser, "known-open-id");
});
