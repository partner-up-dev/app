import { useMutation } from "@tanstack/vue-query";
import type { InferRequestType, InferResponseType } from "hono";
import { adminClient } from "@/lib/admin-rpc";

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown } | null;
    return typeof payload?.error === "string" && payload.error.length > 0
      ? payload.error
      : fallback;
  } catch {
    return fallback;
  }
};

type AdminLoginRoute = (typeof adminClient.api.auth.admin.login)["$post"];

export type AdminLoginInput = InferRequestType<AdminLoginRoute>["json"];
export type AdminLoginResponse = InferResponseType<AdminLoginRoute>;

export type AdminLoginOptions = {
  failureMessage?: string;
};

export const useAdminLogin = (options: AdminLoginOptions = {}) =>
  useMutation<AdminLoginResponse, Error, AdminLoginInput>({
    mutationFn: async ({ userId, password }) => {
      const res = await adminClient.api.auth.admin.login.$post({
        json: { userId, password },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, options.failureMessage ?? "管理员登录失败"));
      }
      return await res.json();
    },
  });
