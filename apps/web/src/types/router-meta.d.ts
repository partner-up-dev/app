import "vue-router";
import type { AdminSessionRole } from "@/domains/admin/model/admin-session-storage";

declare module "vue-router" {
  interface RouteMeta {
    wechatSharePolicy?: "route" | "skip";
    wechatAutoLoginPolicy?: "route" | "skip";
    requiredRoles?: AdminSessionRole[];
  }
}

export {};
