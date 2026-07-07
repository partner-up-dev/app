import { computed } from "vue";
import { useRoute } from "vue-router";
import type { PRId } from "@partner-up-dev/backend";

export const usePRRouteId = () => {
  const route = useRoute();

  return computed<PRId | null>(() => {
    const rawId = Array.isArray(route.params.id)
      ? route.params.id[0]
      : route.params.id;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) && parsed > 0 ? (parsed as PRId) : null;
  });
};
