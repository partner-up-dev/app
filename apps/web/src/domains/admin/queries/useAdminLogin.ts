import { useMutation } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { adminClient } from "@/lib/admin-rpc";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminLoginResponse = InferResponseType<
  (typeof adminClient.api.auth.admin.login)["$post"]
>;

export const useAdminLogin = () =>
  useMutation<AdminLoginResponse, Error, { userId: string; password: string }>({
    mutationFn: async ({ userId, password }) => {
      const res = await adminClient.api.auth.admin.login.$post({
        json: { userId, password },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "管理员登录失败"));
      }
      return await res.json();
    },
  });
