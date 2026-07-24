import { beforeEach, describe, expect, test, vi } from "vitest";
import type { User, UserId } from "../../../entities/user";
import { getOfficialAccountFollowStatus } from "./official-account-follow-status";

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
  openId: "openid",
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

describe("getOfficialAccountFollowStatus", () => {
  beforeEach(() => {
    mocks.findById.mockReset();
  });

  test.each([
    null,
    user(),
    user({
      status: "DISABLED",
      wechatOfficialAccountFollowedAt: new Date("2030-02-03T04:05:06.000Z"),
    }),
    user({
      role: ["anonymous"],
      wechatOfficialAccountFollowedAt: new Date("2030-02-03T04:05:06.000Z"),
    }),
  ])("projects missing, unfollowed, and inactive users as UNKNOWN", async (persistedUser) => {
    mocks.findById.mockResolvedValueOnce(persistedUser);

    await expect(getOfficialAccountFollowStatus(userId)).resolves.toEqual({
      status: "UNKNOWN",
      followedAt: null,
    });
  });

  test("projects an active followed user with an ISO timestamp", async () => {
    mocks.findById.mockResolvedValueOnce(
      user({
        wechatOfficialAccountFollowedAt: new Date("2030-02-03T04:05:06.000Z"),
      }),
    );

    await expect(getOfficialAccountFollowStatus(userId)).resolves.toEqual({
      status: "FOLLOWED",
      followedAt: "2030-02-03T04:05:06.000Z",
    });
    expect(mocks.findById).toHaveBeenCalledWith(userId);
  });
});
