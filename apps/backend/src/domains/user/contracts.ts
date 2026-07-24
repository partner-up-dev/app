import type { UserId, UserRole, UserSex } from "../../entities/user";

export type OperatorAuthRole = Exclude<UserRole, "anonymous">;

export type OperatorCredentialIdentity = {
  userId: UserId;
  roles: OperatorAuthRole[];
};

export type ActiveUserWeChatIdentity = {
  userId: UserId;
  openId: string;
};

export type ActiveUserWeChatBindingState =
  | {
      state: "UNAVAILABLE";
    }
  | {
      state: "UNBOUND";
    }
  | {
      state: "BOUND";
      openId: string;
    };

export type OfficialAccountFollowStatus =
  | {
      status: "UNKNOWN";
      followedAt: null;
    }
  | {
      status: "FOLLOWED";
      followedAt: string;
    };

export type CompleteWeChatOAuthIdentityInput =
  | {
      mode: "BIND";
      targetUserId: UserId;
      openId: string;
    }
  | {
      mode: "LOGIN";
      candidateUserId: UserId | null;
      openId: string;
    };

export type PublicAuthenticatedWeChatIdentity = {
  userId: UserId;
  needsProfileRefresh: boolean;
};

export type FillMissingWeChatProfileFieldsInput = {
  userId: UserId;
  nickname: string | null;
  sex: UserSex | null;
  avatar: string | null;
};
