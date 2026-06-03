import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

const ANCHOR_EVENT_LANDING_ASSIGNMENT_TIMEOUT_MS = 500;

export class AnchorEventLandingAssignmentTimeoutError extends Error {
  constructor() {
    super("Anchor event landing assignment timed out");
    this.name = "AnchorEventLandingAssignmentTimeoutError";
  }
}

export const isAnchorEventLandingAssignmentTimeoutError = (
  error: unknown,
): error is AnchorEventLandingAssignmentTimeoutError =>
  error instanceof AnchorEventLandingAssignmentTimeoutError;

export type AnchorEventLandingAssignmentResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["landing-assignment"]["$get"]
>;

export const useAnchorEventLandingAssignment = (
  eventId: Ref<number | null>,
  options?: {
    enabled?: Ref<boolean>;
  },
) =>
  useQuery<AnchorEventLandingAssignmentResponse>({
    queryKey: computed(() => queryKeys.anchorEvent.landingAssignment(eventId.value)),
    retry: false,
    queryFn: async ({ signal }) => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }

      const controller = new AbortController();
      const abortListener = () => controller.abort();
      signal.addEventListener("abort", abortListener, { once: true });

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      try {
        const response = await Promise.race([
          client.api.events[":eventId"]["landing-assignment"].$get(
            {
              param: { eventId: id.toString() },
            },
            {
              init: {
                signal: controller.signal,
              },
            },
          ),
          new Promise<never>((_resolve, reject) => {
            timeoutId = setTimeout(() => {
              reject(new AnchorEventLandingAssignmentTimeoutError());
            }, ANCHOR_EVENT_LANDING_ASSIGNMENT_TIMEOUT_MS);
          }),
        ]);

        if (!response.ok) {
          throw new Error("获取活动 landing mode 失败");
        }

        return await response.json();
      } finally {
        signal.removeEventListener("abort", abortListener);
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      }
    },
    enabled: () => eventId.value !== null && (options?.enabled?.value ?? true),
  });
