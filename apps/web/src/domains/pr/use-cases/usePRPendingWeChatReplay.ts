import {
  computed,
  inject,
  onScopeDispose,
  provide,
  readonly,
  ref,
  shallowReactive,
  watch,
  type InjectionKey,
  type Ref,
} from "vue";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  type PendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";

type ReplayablePRPendingAction = Extract<
  PendingWeChatAction,
  {
    kind: "PR_CONFIRM" | "PR_EXIT" | "PR_JOIN" | "PR_PUBLISH" | "PR_WAITLIST";
  }
>;

export type PRPendingReplayKind = ReplayablePRPendingAction["kind"];

export type PRPendingReplayHandler = {
  ready: Readonly<Ref<boolean>>;
  replay: () => Promise<void> | void;
};

export type PRPendingReplayRegistry = {
  handlers: Partial<Record<PRPendingReplayKind, PRPendingReplayHandler>>;
  version: Readonly<Ref<number>>;
  register: (kind: PRPendingReplayKind, handler: PRPendingReplayHandler) => () => void;
};

const prPendingReplayRegistryKey: InjectionKey<PRPendingReplayRegistry> = Symbol(
  "pr-pending-replay-registry",
);

const isReplayablePRPendingAction = (
  pending: PendingWeChatAction | null,
): pending is ReplayablePRPendingAction => {
  if (!pending) return false;
  return (
    pending.kind === "PR_CONFIRM" ||
    pending.kind === "PR_EXIT" ||
    pending.kind === "PR_JOIN" ||
    pending.kind === "PR_PUBLISH" ||
    pending.kind === "PR_WAITLIST"
  );
};

const matchPendingActionForPR = (
  pending: PendingWeChatAction | null,
  prId: number | null,
): ReplayablePRPendingAction | null => {
  if (prId === null || !isReplayablePRPendingAction(pending)) {
    return null;
  }
  return pending.prId === prId ? pending : null;
};

export const createPRPendingReplayRegistry = (): PRPendingReplayRegistry => {
  const handlers = shallowReactive<Partial<Record<PRPendingReplayKind, PRPendingReplayHandler>>>(
    {},
  );
  const version = ref(0);

  const register = (kind: PRPendingReplayKind, handler: PRPendingReplayHandler): (() => void) => {
    handlers[kind] = handler;
    version.value += 1;

    return () => {
      if (handlers[kind] !== handler) return;
      delete handlers[kind];
      version.value += 1;
    };
  };

  return {
    handlers,
    version: readonly(version),
    register,
  };
};

export const providePRPendingReplayRegistry = (): PRPendingReplayRegistry => {
  const registry = createPRPendingReplayRegistry();
  provide(prPendingReplayRegistryKey, registry);
  return registry;
};

export const useRegisterPRPendingReplayHandler = (
  kind: PRPendingReplayKind,
  handler: PRPendingReplayHandler,
): void => {
  const registry = inject(prPendingReplayRegistryKey, null);
  if (!registry) return;

  const unregister = registry.register(kind, handler);
  onScopeDispose(unregister);
};

export const usePRPendingWeChatReplay = ({
  prId,
  ready,
  registry,
}: {
  prId: Readonly<Ref<number | null>>;
  ready: Readonly<Ref<boolean>>;
  registry: PRPendingReplayRegistry;
}): void => {
  const replayRunning = ref(false);
  const matchingReplayState = computed(() => {
    const pending = matchPendingActionForPR(readPendingWeChatAction(), prId.value);
    const handler = pending ? registry.handlers[pending.kind] : undefined;

    return {
      handler,
      handlerReady: handler?.ready.value ?? false,
      pending,
      prReady: ready.value,
      registryVersion: registry.version.value,
      replayRunning: replayRunning.value,
    };
  });

  const attemptReplay = async (): Promise<void> => {
    const {
      handler,
      handlerReady,
      pending,
      prReady,
      replayRunning: running,
    } = matchingReplayState.value;
    if (running || !prReady || !pending || !handler || !handlerReady) {
      return;
    }

    replayRunning.value = true;
    clearPendingWeChatAction();
    try {
      await handler.replay();
    } finally {
      replayRunning.value = false;
    }
  };

  watch(
    matchingReplayState,
    () => {
      void attemptReplay();
    },
    { flush: "post", immediate: true },
  );
};
