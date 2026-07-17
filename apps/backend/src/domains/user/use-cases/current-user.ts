import { throwHttpProblem } from "../../../lib/problem-details";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { User, UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import { env } from "../../../lib/env";
import {
  maskMainlandChinaMobilePhone,
  normalizeMainlandChinaMobilePhone,
} from "../../../lib/phone-number";

const userRepo = new UserRepository();

const defaultAvatarsDir =
  process.platform === "win32" ? path.join(process.cwd(), "avatars") : "/mnt/oss/avatars";
const avatarsDir = env.AVATARS_DIR ?? defaultAvatarsDir;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const avatarExtensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type CurrentUserProfileSnapshot = {
  userId: UserId;
  nickname: string | null;
  avatar: string | null;
  phoneMasked: string | null;
  hasPhoneNumber: boolean;
  wechatBound: boolean;
};

const requireUser = async (userId: UserId): Promise<User> => {
  const user = await userRepo.findById(userId);
  if (!user) {
    return throwHttpProblem({ status: 401, detail: "Invalid authenticated user" });
  }

  if (user.status !== "ACTIVE") {
    return throwHttpProblem({ status: 403, detail: "User is disabled" });
  }

  return user;
};

export const toCurrentUserProfileSnapshot = (
  user: Pick<User, "id" | "nickname" | "avatar" | "openId" | "phoneNumber">,
): CurrentUserProfileSnapshot => ({
  userId: user.id,
  nickname: user.nickname,
  avatar: user.avatar,
  phoneMasked: maskMainlandChinaMobilePhone(user.phoneNumber),
  hasPhoneNumber: Boolean(user.phoneNumber),
  wechatBound: Boolean(user.openId),
});

export async function getCurrentUserProfile(userId: UserId): Promise<CurrentUserProfileSnapshot> {
  const user = await requireUser(userId);
  return toCurrentUserProfileSnapshot(user);
}

export async function updateCurrentUserNickname(
  userId: UserId,
  nickname: string,
): Promise<CurrentUserProfileSnapshot> {
  await requireUser(userId);

  const normalizedNickname = nickname.trim();
  if (normalizedNickname.length === 0) {
    return throwHttpProblem({ status: 400, detail: "Nickname is required" });
  }

  const updated = await userRepo.updateNickname(userId, normalizedNickname);
  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to update nickname" });
  }

  return toCurrentUserProfileSnapshot(updated);
}

export async function updateCurrentUserAvatar(
  userId: UserId,
  file: File,
): Promise<CurrentUserProfileSnapshot> {
  await requireUser(userId);

  const extension = avatarExtensionByMimeType[file.type];
  if (!extension) {
    return throwHttpProblem({ status: 400, detail: "Unsupported avatar file type" });
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return throwHttpProblem({ status: 400, detail: "Avatar file must not exceed 2 MB" });
  }

  await fs.mkdir(avatarsDir, { recursive: true });

  const filename = `${uuidv4()}.${extension}`;
  const filepath = path.join(avatarsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const updated = await userRepo.updateAvatar(userId, `/api/users/avatar/${filename}`);
  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to update avatar" });
  }

  return toCurrentUserProfileSnapshot(updated);
}

export async function updateCurrentUserPhoneNumber(
  userId: UserId,
  phoneNumber: string | null,
): Promise<CurrentUserProfileSnapshot> {
  await requireUser(userId);

  const trimmed = phoneNumber?.trim() ?? "";
  const normalizedPhone = trimmed.length > 0 ? normalizeMainlandChinaMobilePhone(trimmed) : null;
  if (trimmed.length > 0 && !normalizedPhone) {
    return throwHttpProblem({
      status: 400,
      detail: "Phone must match mainland China mobile format",
    });
  }

  const updated = await userRepo.updatePhoneNumber(userId, normalizedPhone?.phoneE164 ?? null);
  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to update phone number" });
  }

  return toCurrentUserProfileSnapshot(updated);
}

export async function bindWeChatToCurrentUser(
  userId: UserId,
  openId: string,
): Promise<CurrentUserProfileSnapshot> {
  const currentUser = await requireUser(userId);
  const normalizedOpenId = openId.trim();
  if (!normalizedOpenId) {
    return throwHttpProblem({ status: 400, detail: "Invalid WeChat openid" });
  }

  if (currentUser.openId && currentUser.openId !== normalizedOpenId) {
    return throwHttpProblem({ status: 409, detail: "Current user is already bound" });
  }

  const existingByOpenId = await userRepo.findByOpenId(normalizedOpenId);
  if (existingByOpenId && existingByOpenId.id !== currentUser.id) {
    return throwHttpProblem({
      status: 409,
      detail: "WeChat account is already bound to another user",
    });
  }

  if (currentUser.openId === normalizedOpenId) {
    return toCurrentUserProfileSnapshot(currentUser);
  }

  const updated = await userRepo.bindOpenId(currentUser.id, normalizedOpenId);
  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to bind WeChat account" });
  }

  return toCurrentUserProfileSnapshot(updated);
}
