import { beforeEach, describe, expect, test, vi } from "vitest";
import type { User, UserId } from "../../../entities/user";
import { getActiveUserWeChatBindingState } from "./active-user-wechat-binding-state";

const mocks = vi.hoisted(() => ({
  findById: vi.fn<(userId: UserId) => Promise<User | null>>(),
}));

vi.mock("../../../repositories/UserRepository", () => ({
  UserRepository: class {
    findById = mocks.findById;
  },
}));

const userId = "11111111-1111-4111-8111-111111111111" satisfies UserId;

const user = (overrides: Partial<User> = {}): User => ({
  id: userId,
  openId: null,
  wechatOfficialAccountFollowedAt: null,
  pinHash: null,
  role: ["authenticated"],
  nickname: null,
  phoneNumber: null,
  sex: null,
  avatar: null,
  status: "ACTIVE",
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("getActiveUserWeChatBindingState", () => {
  beforeEach(() => {
    mocks.findById.mockReset();
  });

  test.each([null, user({ status: "DISABLED" })])(
    "projects a missing or inactive user as UNAVAILABLE",
    async (persistedUser) => {
      mocks.findById.mockResolvedValueOnce(persistedUser);

      await expect(getActiveUserWeChatBindingState(userId)).resolves.toEqual({
        state: "UNAVAILABLE",
      });
    },
  );

  test("distinguishes an active unbound user", async () => {
    mocks.findById.mockResolvedValueOnce(user());

    await expect(getActiveUserWeChatBindingState(userId)).resolves.toEqual({
      state: "UNBOUND",
    });
  });

  test("returns only the openid for an active bound user", async () => {
    mocks.findById.mockResolvedValueOnce(user({ openId: "openid-bound" }));

    await expect(getActiveUserWeChatBindingState(userId)).resolves.toEqual({
      state: "BOUND",
      openId: "openid-bound",
    });
    expect(mocks.findById).toHaveBeenCalledTimes(1);
    expect(mocks.findById).toHaveBeenCalledWith(userId);
  });
});
