import { computed, ref, watch, type ComputedRef } from "vue";
import type {
  RouteShareDescriptor,
  RouteSharePhase,
} from "@/domains/share/model/types";
import { trackEvent } from "@/shared/telemetry/track";
import { useWeChatShareCard } from "@/shared/wechat/useWeChatShareCard";

export type RouteShareReplayTrigger =
  | "pageshow"
  | "visibilitychange"
  | "manual";

const createRouteShareSessionId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const phaseRank = (phase: RouteSharePhase): number => {
  if (phase === "ENRICHED") return 3;
  if (phase === "BASE") return 2;
  return 1;
};

const areDescriptorsEquivalent = (
  left: RouteShareDescriptor | null,
  right: RouteShareDescriptor,
): boolean => {
  if (!left) return false;
  return (
    left.routeSessionId === right.routeSessionId &&
    left.entityKey === right.entityKey &&
    left.revision === right.revision &&
    left.phase === right.phase &&
    left.signatureUrl === right.signatureUrl &&
    left.targetUrl === right.targetUrl &&
    left.title === right.title &&
    left.desc === right.desc &&
    left.imgUrl === right.imgUrl
  );
};

type ShareTelemetryPayload = {
  routeSessionId: string;
  entityKey?: string | null;
  revision?: string;
  prId?: number;
};

const toTelemetryPayload = (
  descriptor: RouteShareDescriptor,
): ShareTelemetryPayload => {
  const payload: ShareTelemetryPayload = {
    routeSessionId: descriptor.routeSessionId,
    entityKey: descriptor.entityKey,
    revision: descriptor.revision,
  };

  if (descriptor.entityKey) {
    const [, rawPrId] = descriptor.entityKey.split(":");
    const prId = Number(rawPrId);
    if (Number.isInteger(prId) && prId > 0) {
      payload.prId = prId;
    }
  }

  return payload;
};

const trackDescriptorSubmitted = (descriptor: RouteShareDescriptor): void => {
  trackEvent("share_descriptor_submitted", {
    ...toTelemetryPayload(descriptor),
    phase: descriptor.phase,
  });
};

const trackDescriptorDiscarded = (
  descriptor: RouteShareDescriptor,
  reason: "session_mismatch" | "phase_regression",
): void => {
  trackEvent("share_descriptor_discarded_stale", {
    ...toTelemetryPayload(descriptor),
    phase: descriptor.phase,
    reason,
    currentRouteSessionId: currentRouteShareSessionIdRef.value,
  });
};

const trackApplySuccess = (descriptor: RouteShareDescriptor): void => {
  if (descriptor.phase === "FALLBACK") {
    trackEvent("share_apply_fallback_success", {
      ...toTelemetryPayload(descriptor),
      phase: "FALLBACK",
    });
    return;
  }

  if (descriptor.phase === "BASE") {
    trackEvent("share_apply_base_success", {
      ...toTelemetryPayload(descriptor),
      phase: "BASE",
    });
    return;
  }

  trackEvent("share_apply_enriched_success", {
    ...toTelemetryPayload(descriptor),
    phase: "ENRICHED",
  });
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return "unknown_error";
};

const trackApplyFailure = (
  descriptor: RouteShareDescriptor,
  error: unknown,
): void => {
  trackEvent("share_apply_failed", {
    ...toTelemetryPayload(descriptor),
    phase: descriptor.phase,
    stage: "apply",
    message: toErrorMessage(error),
  });
};

const currentRouteShareSessionIdRef = ref<string | null>(null);
const currentRouteShareDescriptorRef = ref<RouteShareDescriptor | null>(null);
let lastAppliedRouteShareDescriptor: RouteShareDescriptor | null = null;
let desiredApplyVersion = 0;
let appliedApplyVersion = 0;
let flushRouteShareApplyPromise: Promise<void> | null = null;

const applyRouteShareDescriptor = async (
  descriptor: RouteShareDescriptor,
): Promise<void> => {
  const { updateWeChatShareCard } = useWeChatShareCard();
  await updateWeChatShareCard({
    title: descriptor.title,
    desc: descriptor.desc,
    link: descriptor.targetUrl,
    imgUrl: descriptor.imgUrl,
    signatureUrl: descriptor.signatureUrl,
    routeSessionId: descriptor.routeSessionId,
    entityKey: descriptor.entityKey,
    revision: descriptor.revision,
    phase: descriptor.phase,
  });
};

const requestRouteShareApply = (): number => {
  desiredApplyVersion += 1;
  return desiredApplyVersion;
};

const flushRouteShareApplyQueue = async (): Promise<void> => {
  if (flushRouteShareApplyPromise) {
    return await flushRouteShareApplyPromise;
  }

  flushRouteShareApplyPromise = (async () => {
    while (true) {
      const descriptor = currentRouteShareDescriptorRef.value;
      const targetVersion = desiredApplyVersion;

      if (!descriptor) {
        lastAppliedRouteShareDescriptor = null;
        appliedApplyVersion = targetVersion;
        return;
      }

      if (
        appliedApplyVersion === targetVersion &&
        areDescriptorsEquivalent(lastAppliedRouteShareDescriptor, descriptor)
      ) {
        return;
      }

      try {
        await applyRouteShareDescriptor(descriptor);
        lastAppliedRouteShareDescriptor = descriptor;
        appliedApplyVersion = targetVersion;
        trackApplySuccess(descriptor);
      } catch (error) {
        trackApplyFailure(descriptor, error);
        throw error;
      }

      const current = currentRouteShareDescriptorRef.value;
      if (
        current &&
        appliedApplyVersion === desiredApplyVersion &&
        areDescriptorsEquivalent(current, descriptor)
      ) {
        return;
      }
    }
  })();

  try {
    await flushRouteShareApplyPromise;
  } finally {
    flushRouteShareApplyPromise = null;
  }
};

export const startRouteShareSession = async (
  fallbackDescriptor: Omit<RouteShareDescriptor, "routeSessionId"> | null,
): Promise<string> => {
  const routeSessionId = createRouteShareSessionId();
  currentRouteShareSessionIdRef.value = routeSessionId;

  trackEvent("share_session_started", {
    routeSessionId,
    hasFallback: fallbackDescriptor !== null,
  });

  if (!fallbackDescriptor) {
    currentRouteShareDescriptorRef.value = null;
    requestRouteShareApply();
    return routeSessionId;
  }

  const descriptor: RouteShareDescriptor = {
    ...fallbackDescriptor,
    routeSessionId,
  };
  currentRouteShareDescriptorRef.value = descriptor;
  trackDescriptorSubmitted(descriptor);
  requestRouteShareApply();

  try {
    await flushRouteShareApplyQueue();
  } catch (error) {
    console.warn("Failed to apply fallback route share descriptor:", error);
  }

  return routeSessionId;
};

export const submitRouteShareDescriptor = async (
  descriptor: RouteShareDescriptor,
): Promise<boolean> => {
  if (descriptor.routeSessionId !== currentRouteShareSessionIdRef.value) {
    trackDescriptorDiscarded(descriptor, "session_mismatch");
    return false;
  }

  const current = currentRouteShareDescriptorRef.value;
  if (areDescriptorsEquivalent(current, descriptor)) {
    return true;
  }

  if (
    current &&
    current.routeSessionId === descriptor.routeSessionId &&
    current.revision === descriptor.revision &&
    phaseRank(descriptor.phase) < phaseRank(current.phase)
  ) {
    trackDescriptorDiscarded(descriptor, "phase_regression");
    return false;
  }

  currentRouteShareDescriptorRef.value = descriptor;
  trackDescriptorSubmitted(descriptor);
  requestRouteShareApply();

  try {
    await flushRouteShareApplyQueue();
    return true;
  } catch (error) {
    console.warn("Failed to apply route share descriptor:", error);
    throw error;
  }
};

export const replayCurrentRouteShareDescriptor = async (
  trigger: RouteShareReplayTrigger = "manual",
): Promise<void> => {
  const current = currentRouteShareDescriptorRef.value;
  if (!current) return;

  trackEvent("share_replay_triggered", {
    ...toTelemetryPayload(current),
    phase: current.phase,
    trigger,
  });

  requestRouteShareApply();

  try {
    await flushRouteShareApplyQueue();
  } catch (error) {
    console.warn("Failed to replay current route share descriptor:", error);
  }
};

export const useCurrentRouteShareSessionId = (): ComputedRef<string | null> =>
  computed(() => currentRouteShareSessionIdRef.value);

export const useCurrentRouteShareDescriptor = () =>
  computed(() => currentRouteShareDescriptorRef.value);

export const useRouteShareDescriptorRegistration = (
  descriptor: ComputedRef<RouteShareDescriptor | null>,
): void => {
  watch(
    descriptor,
    (nextDescriptor) => {
      if (!nextDescriptor) return;
      void submitRouteShareDescriptor(nextDescriptor);
    },
    { immediate: true },
  );
};
