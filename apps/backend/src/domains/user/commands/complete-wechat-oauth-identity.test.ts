import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NewUser, User, UserId } from "../../../entities/user";
import { createHttpProblem } from "../../../lib/problem-details";
import type { UserRepository } from "../../../repositories/UserRepository";
import { completeWeChatOAuthIdentity } from "./complete-wechat-oauth-identity";

const mocks = vi.hoisted(() => ({
  findById: vi.fn<(userId: UserId) => Promise<User | null>>(),
  findByOpenId: vi.fn<(openId: string) => Promise<User | null>>(),
  createIfNotExists: vi.fn<(input: NewUser) => Promise<User | null>>(),
  upgradeAnonymousUserWithWeChat:
    vi.fn<
      (
        input: Parameters<UserRepository["upgradeAnonymousUserWithWeChat"]>[0],
      ) => Promise<User | null>
    >(),
  bindOpenId: vi.fn<(userId: UserId, openId: string) => Promise<User | null>>(),
  bindWeChatToCurrentUser: vi.fn<(userId: UserId, openId: string) => Promise<unknown>>(),
}));

vi.mock("../../../repositories/UserRepository", () => ({
  UserRepository: class {
    findById = mocks.findById;
    findByOpenId = mocks.findByOpenId;
    createIfNotExists = mocks.createIfNotExists;
    upgradeAnonymousUserWithWeChat = mocks.upgradeAnonymousUserWithWeChat;
    bindOpenId = mocks.bindOpenId;
  },
}));

vi.mock("../use-cases/current-user", () => ({
  bindWeChatToCurrentUser: mocks.bindWeChatToCurrentUser,
}));

const targetUserId = "11111111-1111-4111-8111-111111111111" satisfies UserId;
const occupiedUserId = "22222222-2222-4222-8222-222222222222" satisfies UserId;
const racedUserId = "33333333-3333-4333-8333-333333333333" satisfies UserId;

const user = (overrides: Partial<User> = {}): User => ({
  id: targetUserId,
  openId: null,
  wechatOfficialAccountFollowedAt: null,
  pinHash: null,
  role: ["authenticated"],
  nickname: "Partner",
  phoneNumber: null,
  sex: 0,
  avatar: "/avatar.png",
  status: "ACTIVE",
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  updatedAt: new Date("2030-01-01T00:00:00.000Z"),
  ...overrides,
});

describe("completeWeChatOAuthIdentity", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
  });

  test("rejects an empty normalized openid before any repository access", async () => {
    await expect(
      completeWeChatOAuthIdentity({
        mode: "LOGIN",
        candidateUserId: targetUserId,
        openId: " \t ",
      }),
    ).rejects.toMatchObject({
      status: 400,
    });

    for (const mock of Object.values(mocks)) {
      expect(mock).not.toHaveBeenCalled();
    }
  });

  test.each([
    user({
      id: occupiedUserId,
      openId: "openid-existing",
      status: "DISABLED",
    }),
    user({
      id: occupiedUserId,
      openId: "openid-existing",
      role: ["authenticated", "service"],
    }),
  ])(
    "gives an existing openid absolute precedence without candidate or create fallback",
    async (existingUser) => {
      mocks.findByOpenId.mockResolvedValueOnce(existingUser);

      await expect(
        completeWeChatOAuthIdentity({
          mode: "LOGIN",
          candidateUserId: targetUserId,
          openId: " openid-existing ",
        }),
      ).rejects.toMatchObject({
        status: 403,
        code: "WECHAT_OAUTH_PUBLIC_IDENTITY_NOT_ALLOWED",
        type: "https://partner-up.app/problems/wechat.oauth_public_identity_not_allowed",
        message: "OAuth identity is not eligible for a public session",
      });

      expect(mocks.findByOpenId).toHaveBeenCalledWith("openid-existing");
      expect(mocks.findById).not.toHaveBeenCalled();
      expect(mocks.createIfNotExists).not.toHaveBeenCalled();
      expect(mocks.upgradeAnonymousUserWithWeChat).not.toHaveBeenCalled();
      expect(mocks.bindOpenId).not.toHaveBeenCalled();
    },
  );

  test("upgrades an active unbound anonymous LOGIN candidate", async () => {
    const anonymousCandidate = user({
      role: ["anonymous"],
      nickname: null,
      sex: null,
      avatar: null,
    });
    const upgraded = user({
      openId: "openid-candidate",
      nickname: null,
      sex: null,
      avatar: null,
    });
    mocks.findByOpenId.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mocks.findById
      .mockResolvedValueOnce(anonymousCandidate)
      .mockResolvedValueOnce(anonymousCandidate)
      .mockResolvedValueOnce(upgraded);
    mocks.upgradeAnonymousUserWithWeChat.mockResolvedValueOnce(upgraded);

    await expect(
      completeWeChatOAuthIdentity({
        mode: "LOGIN",
        candidateUserId: targetUserId,
        openId: "openid-candidate",
      }),
    ).resolves.toEqual({
      userId: targetUserId,
      needsProfileRefresh: true,
    });
    expect(mocks.upgradeAnonymousUserWithWeChat).toHaveBeenCalledWith({
      userId: targetUserId,
      openId: "openid-candidate",
      nickname: null,
      sex: null,
      avatar: null,
    });
    expect(mocks.bindOpenId).not.toHaveBeenCalled();
    expect(mocks.createIfNotExists).not.toHaveBeenCalled();
  });

  test("binds an active unbound authenticated LOGIN candidate", async () => {
    const candidate = user();
    const bound = user({ openId: "openid-candidate" });
    mocks.findByOpenId.mockResolvedValueOnce(null);
    mocks.findById.mockResolvedValueOnce(candidate).mockResolvedValueOnce(bound);
    mocks.bindWeChatToCurrentUser.mockResolvedValueOnce({
      userId: candidate.id,
    });

    await expect(
      completeWeChatOAuthIdentity({
        mode: "LOGIN",
        candidateUserId: targetUserId,
        openId: "openid-candidate",
      }),
    ).resolves.toEqual({
      userId: targetUserId,
      needsProfileRefresh: false,
    });
    expect(mocks.bindWeChatToCurrentUser).toHaveBeenCalledWith(targetUserId, "openid-candidate");
    expect(mocks.bindOpenId).not.toHaveBeenCalled();
    expect(mocks.upgradeAnonymousUserWithWeChat).not.toHaveBeenCalled();
    expect(mocks.createIfNotExists).not.toHaveBeenCalled();
  });

  test.each([user({ status: "DISABLED" }), user({ openId: "already-bound" })])(
    "does not mutate an ineligible LOGIN candidate",
    async (candidate) => {
      const created = user({
        id: racedUserId,
        openId: "openid-new",
        nickname: null,
        sex: null,
        avatar: null,
      });
      mocks.findByOpenId.mockResolvedValueOnce(null);
      mocks.findById.mockResolvedValueOnce(candidate);
      mocks.createIfNotExists.mockResolvedValueOnce(created);

      await expect(
        completeWeChatOAuthIdentity({
          mode: "LOGIN",
          candidateUserId: targetUserId,
          openId: "openid-new",
        }),
      ).resolves.toEqual({
        userId: racedUserId,
        needsProfileRefresh: true,
      });
      expect(mocks.upgradeAnonymousUserWithWeChat).not.toHaveBeenCalled();
      expect(mocks.bindOpenId).not.toHaveBeenCalled();
    },
  );

  test("reads back the openid winner after a create race", async () => {
    const racedUser = user({
      id: racedUserId,
      openId: "openid-race",
    });
    mocks.findByOpenId.mockResolvedValueOnce(null).mockResolvedValueOnce(racedUser);
    mocks.createIfNotExists.mockResolvedValueOnce(null);

    await expect(
      completeWeChatOAuthIdentity({
        mode: "LOGIN",
        candidateUserId: null,
        openId: "openid-race",
      }),
    ).resolves.toEqual({
      userId: racedUserId,
      needsProfileRefresh: false,
    });
    expect(mocks.createIfNotExists).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "openid-race",
        role: ["authenticated"],
        status: "ACTIVE",
      }),
    );
    expect(mocks.findByOpenId).toHaveBeenCalledTimes(2);
  });

  test("returns the active occupied BIND identity without mutating the target", async () => {
    const occupiedUser = user({
      id: occupiedUserId,
      openId: "openid-occupied",
      nickname: null,
    });
    mocks.findByOpenId.mockResolvedValueOnce(occupiedUser);

    await expect(
      completeWeChatOAuthIdentity({
        mode: "BIND",
        targetUserId,
        openId: "openid-occupied",
      }),
    ).resolves.toEqual({
      userId: occupiedUserId,
      needsProfileRefresh: true,
    });
    expect(mocks.findById).not.toHaveBeenCalled();
    expect(mocks.upgradeAnonymousUserWithWeChat).not.toHaveBeenCalled();
    expect(mocks.bindOpenId).not.toHaveBeenCalled();
  });

  test("keeps an inactive occupied BIND identity as a failure", async () => {
    const occupiedUser = user({
      id: occupiedUserId,
      openId: "openid-occupied",
      status: "DISABLED",
    });
    const targetUser = user();
    mocks.findByOpenId.mockResolvedValueOnce(occupiedUser);
    mocks.findById.mockResolvedValueOnce(targetUser);
    mocks.bindWeChatToCurrentUser.mockRejectedValueOnce(
      createHttpProblem({
        status: 409,
        detail: "WeChat account is already bound to another user",
      }),
    );

    await expect(
      completeWeChatOAuthIdentity({
        mode: "BIND",
        targetUserId,
        openId: "openid-occupied",
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: "WeChat account is already bound to another user",
    });
    expect(mocks.findById).toHaveBeenCalledTimes(1);
    expect(mocks.upgradeAnonymousUserWithWeChat).not.toHaveBeenCalled();
    expect(mocks.bindOpenId).not.toHaveBeenCalled();
  });

  test("upgrades an anonymous BIND target when the openid is unoccupied", async () => {
    const targetUser = user({ role: ["anonymous"] });
    const upgraded = user({ openId: "openid-target" });
    mocks.findByOpenId.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mocks.findById
      .mockResolvedValueOnce(targetUser)
      .mockResolvedValueOnce(targetUser)
      .mockResolvedValueOnce(upgraded);
    mocks.upgradeAnonymousUserWithWeChat.mockResolvedValueOnce(upgraded);

    await expect(
      completeWeChatOAuthIdentity({
        mode: "BIND",
        targetUserId,
        openId: "openid-target",
      }),
    ).resolves.toEqual({
      userId: targetUserId,
      needsProfileRefresh: false,
    });
    expect(mocks.upgradeAnonymousUserWithWeChat).toHaveBeenCalledWith({
      userId: targetUserId,
      openId: "openid-target",
      nickname: null,
      sex: null,
      avatar: null,
    });
    expect(mocks.bindOpenId).not.toHaveBeenCalled();
  });

  test("binds an authenticated BIND target when the openid is unoccupied", async () => {
    const targetUser = user();
    const bound = user({ openId: "openid-target" });
    mocks.findByOpenId.mockResolvedValueOnce(null);
    mocks.findById.mockResolvedValueOnce(targetUser).mockResolvedValueOnce(bound);
    mocks.bindWeChatToCurrentUser.mockResolvedValueOnce({
      userId: targetUser.id,
    });

    await expect(
      completeWeChatOAuthIdentity({
        mode: "BIND",
        targetUserId,
        openId: "openid-target",
      }),
    ).resolves.toEqual({
      userId: targetUserId,
      needsProfileRefresh: false,
    });
    expect(mocks.bindWeChatToCurrentUser).toHaveBeenCalledWith(targetUserId, "openid-target");
    expect(mocks.bindOpenId).not.toHaveBeenCalled();
    expect(mocks.upgradeAnonymousUserWithWeChat).not.toHaveBeenCalled();
  });
});
