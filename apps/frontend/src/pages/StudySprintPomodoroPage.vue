<template>
  <PuPageScaffold
    v-if="showGuidance"
    class="study-sprint-guidance"
    data-page="study-sprint-guidance"
  >
    <section class="guidance-page">
      <Transition
        name="guidance-slide"
        mode="out-in"
      >
        <div
          :key="guidanceStep"
          class="guidance-step"
          :data-step="guidanceStep"
        >
          <div
            class="guidance-illustration"
            :class="`guidance-illustration--${currentGuidance.illustration}`"
            aria-hidden="true"
          >
            <span class="guidance-illustration__device"></span>
            <span class="guidance-illustration__moon"></span>
            <span class="guidance-illustration__timer"></span>
            <span class="guidance-illustration__tile guidance-illustration__tile--one"></span>
            <span class="guidance-illustration__tile guidance-illustration__tile--two"></span>
            <span class="guidance-illustration__tile guidance-illustration__tile--three"></span>
            <span class="guidance-illustration__play"></span>
          </div>
          <p class="guidance-kicker">自习搭子番茄钟</p>
          <h1 data-testid="study-sprint.guidance.text">
            {{ currentGuidance.text }}
          </h1>
        </div>
      </Transition>
      <PuButton
        block
        size="lg"
        data-testid="study-sprint.guidance.next"
        :loading="startMutation.isPending.value"
        @click="handleGuidanceAction"
      >
        {{ guidanceActionText }}
      </PuButton>
    </section>
  </PuPageScaffold>

  <PuPageScaffold
    v-else
    class="study-sprint-room"
    data-page="study-sprint-room"
  >
    <PuLoadingState
      v-if="roomQuery.isLoading.value"
      message="正在进入专注房间"
    />
    <ErrorToast
      v-else-if="roomQuery.error.value"
      :message="roomQuery.error.value.message"
      persistent
    />

    <template v-else-if="room">
      <header
        class="room-header"
        data-testid="study-sprint.room-header"
      >
        <button
          class="room-header__back"
          type="button"
          aria-label="返回 PR"
          @click="goBackToPR"
        >
          <span class="i-mdi-arrow-left"></span>
        </button>
        <div class="room-header__body">
          <h1>{{ room.prTitle || '自习搭子番茄钟' }}</h1>
          <span>{{ room.targetDurationMinutes }} min</span>
        </div>
      </header>

      <section
        class="participant-grid"
        :class="{ 'participant-grid--single': room.participants.length === 1 }"
        aria-label="同伴专注情况"
        data-testid="study-sprint.call-grid"
      >
        <article
          v-for="participant in room.participants"
          :key="participant.userId"
          class="participant-tile"
          :class="[
            participantStatusClass(participant.status),
            { 'participant-tile--viewer': participant.isViewer },
          ]"
          data-testid="study-sprint.participant"
        >
          <div class="participant-tile__stage">
            <div class="participant-tile__avatar">
              <img
                v-if="participant.avatar"
                :src="participant.avatar"
                alt=""
              />
              <span v-else>{{ participantInitial(participant.nickname) }}</span>
            </div>
            <span class="participant-tile__status">
              {{ statusLabel(participant.status) }}
            </span>
          </div>
          <div class="participant-tile__overlay">
            <div class="participant-tile__name-row">
              <strong>{{ participant.nickname || "同伴" }}</strong>
              <span v-if="participant.isViewer">我</span>
            </div>
            <div class="participant-tile__meta">
              <span>
                {{ participantMinutes(participant.creditedFocusSeconds) }}
                / {{ room.targetDurationMinutes }} 分钟
              </span>
            </div>
            <div class="participant-tile__progress">
              <span
                :style="{ width: `${participantProgressPercent(participant)}%` }"
              ></span>
            </div>
          </div>
        </article>
      </section>

      <section
        class="room-controls"
        data-testid="study-sprint.viewer-panel"
      >
        <div class="room-controls__summary">
          <span>我的专注</span>
          <strong>{{ viewerDisplayMinutes }} / {{ room.targetDurationMinutes }} 分钟</strong>
          <div class="room-controls__progress">
            <span :style="{ width: `${viewerProgressPercent}%` }"></span>
          </div>
        </div>
        <div class="room-controls__actions">
          <PuButton
            v-if="viewerStatus === 'NOT_STARTED'"
            block
            size="lg"
            :loading="startMutation.isPending.value"
            data-testid="study-sprint.start"
            @click="handleStart"
          >
            开始专注
          </PuButton>
          <PuButton
            v-else-if="viewerStatus === 'FOCUSING'"
            block
            size="lg"
            tone="neutral" variant="outline"
            :loading="recordEventMutation.isPending.value"
            data-testid="study-sprint.complete"
            @click="recordCompleted"
          >
            完成专注
          </PuButton>
          <PuButton
            v-else-if="viewerStatus === 'COMPLETED'"
            block
            size="lg"
            tone="neutral" variant="soft"
            data-testid="study-sprint.completed"
            disabled
          >
            已完成，继续看看同伴
          </PuButton>
          <PuButton
            v-else
            block
            size="lg"
            tone="neutral" variant="soft"
            data-testid="study-sprint.left"
            disabled
          >
            已离开
          </PuButton>
          <PuButton
            v-if="viewerSession"
            block
            tone="neutral" variant="ghost"
            :loading="recordEventMutation.isPending.value"
            data-testid="study-sprint.leave"
            @click="handleLeave"
          >
            离开房间
          </PuButton>
        </div>
      </section>
    </template>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { PuButton, PuLoadingState, PuPageScaffold } from "@partner-up-dev/design-web";
import {
  useRecordStudySprintEvent,
  useStartStudySprintSession,
  useStudySprintRoom,
  type StudySprintRoomSnapshot,
} from "@/domains/study-sprint/queries/useStudySprintRoom";

type Participant = StudySprintRoomSnapshot["participants"][number];
type ParticipantStatus = Participant["status"];
type GuidanceIllustration = "screen-off" | "companions" | "start";

type GuidanceStep = {
  text: string;
  illustration: GuidanceIllustration;
};

const GUIDANCE_SEEN_KEY = "partner-up.study-sprint.guidance-seen";
const HEARTBEAT_INTERVAL_MS = 5000;
const guidanceSteps: GuidanceStep[] = [
  {
    text: "熄屏会计入专注时长",
    illustration: "screen-off",
  },
  {
    text: "可以实时看到同伴们的专注情况",
    illustration: "companions",
  },
  {
    text: "开始专注",
    illustration: "start",
  },
];

const router = useRouter();
const prId = usePRRouteId();
const roomQuery = useStudySprintRoom(prId);
const startMutation = useStartStudySprintSession(prId);
const recordEventMutation = useRecordStudySprintEvent();
const guidanceStep = ref(0);
const guidanceSeen = ref(false);
const clientSeq = ref(1);
const localFocusBaseSeconds = ref(0);
const focusStartedAtMs = ref<number | null>(null);
const optimisticElapsedSeconds = ref(0);
let tickerId: number | null = null;
let heartbeatId: number | null = null;

const room = computed(() => roomQuery.data.value ?? null);
const viewerSession = computed(
  () => room.value?.participants.find((item) => item.isViewer) ?? null,
);
const viewerStatus = computed<ParticipantStatus>(
  () => viewerSession.value?.status ?? "NOT_STARTED",
);
const showGuidance = computed(() => !guidanceSeen.value);
const currentGuidance = computed(
  () => guidanceSteps[guidanceStep.value] ?? guidanceSteps[guidanceSteps.length - 1]!,
);
const guidanceActionText = computed(() =>
  guidanceStep.value < guidanceSteps.length - 1 ? "下一个" : "开始",
);
const viewerElapsedSeconds = computed(() => {
  const participant = viewerSession.value;
  if (!participant) return 0;
  if (participant.status !== "FOCUSING") {
    return participant.creditedFocusSeconds;
  }
  return Math.max(optimisticElapsedSeconds.value, participant.creditedFocusSeconds);
});
const viewerDisplayMinutes = computed(() =>
  Math.floor(viewerElapsedSeconds.value / 60),
);
const viewerProgressPercent = computed(() => {
  const targetSeconds = (room.value?.targetDurationMinutes ?? 30) * 60;
  if (targetSeconds <= 0) return 0;
  return Math.min(100, Math.round((viewerElapsedSeconds.value / targetSeconds) * 100));
});

const nextClientSeq = (): number => {
  const value = clientSeq.value;
  clientSeq.value += 1;
  return value;
};

const markGuidanceSeen = (): void => {
  guidanceSeen.value = true;
  window.localStorage.setItem(GUIDANCE_SEEN_KEY, "true");
};

const handleGuidanceAction = async (): Promise<void> => {
  if (guidanceStep.value < guidanceSteps.length - 1) {
    guidanceStep.value += 1;
    return;
  }
  markGuidanceSeen();
  await handleStart();
};

const handleStart = async (): Promise<void> => {
  await startMutation.mutateAsync({
    clientSeq: nextClientSeq(),
    occurredAt: new Date().toISOString(),
  });
};

const goBackToPR = async (): Promise<void> => {
  if (prId.value !== null) {
    await router.push(`/pr/${prId.value}`);
  }
};

const recordCurrentEvent = async (
  eventType: "HEARTBEAT" | "COMPLETED" | "LEFT",
): Promise<void> => {
  const sessionId = room.value?.viewerSessionId;
  if (!sessionId) return;
  await recordEventMutation.mutateAsync({
    sessionId,
    event: {
      eventType,
      occurredAt: new Date().toISOString(),
      clientSeq: nextClientSeq(),
      payload: {
        creditedFocusSeconds: viewerElapsedSeconds.value,
      },
    },
  });
};

const recordHeartbeat = async (): Promise<void> => {
  if (viewerSession.value?.status !== "FOCUSING") return;
  await recordCurrentEvent("HEARTBEAT");
};

const recordCompleted = async (): Promise<void> => {
  await recordCurrentEvent("COMPLETED");
};

const handleLeave = async (): Promise<void> => {
  await recordCurrentEvent("LEFT");
  await goBackToPR();
};

const updateOptimisticElapsed = (): void => {
  const startedAt = focusStartedAtMs.value;
  if (startedAt === null) {
    optimisticElapsedSeconds.value = localFocusBaseSeconds.value;
    return;
  }
  optimisticElapsedSeconds.value =
    localFocusBaseSeconds.value +
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

  const targetSeconds = (room.value?.targetDurationMinutes ?? 30) * 60;
  if (
    viewerSession.value?.status === "FOCUSING" &&
    optimisticElapsedSeconds.value >= targetSeconds &&
    !recordEventMutation.isPending.value
  ) {
    void recordCompleted();
  }
};

watch(
  viewerSession,
  (participant) => {
    if (!participant || participant.status !== "FOCUSING") {
      localFocusBaseSeconds.value = participant?.creditedFocusSeconds ?? 0;
      optimisticElapsedSeconds.value = localFocusBaseSeconds.value;
      focusStartedAtMs.value = null;
      return;
    }

    if (participant.creditedFocusSeconds > localFocusBaseSeconds.value) {
      localFocusBaseSeconds.value = participant.creditedFocusSeconds;
      focusStartedAtMs.value = Date.now();
    }

    if (focusStartedAtMs.value === null) {
      localFocusBaseSeconds.value = participant.creditedFocusSeconds;
      focusStartedAtMs.value = Date.now();
    }
  },
  { immediate: true },
);

onMounted(() => {
  guidanceSeen.value =
    window.localStorage.getItem(GUIDANCE_SEEN_KEY) === "true";
  tickerId = window.setInterval(updateOptimisticElapsed, 1000);
  heartbeatId = window.setInterval(() => {
    void recordHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (tickerId !== null) {
    window.clearInterval(tickerId);
  }
  if (heartbeatId !== null) {
    window.clearInterval(heartbeatId);
  }
});

const participantInitial = (nickname: string | null): string =>
  (nickname?.trim().slice(0, 1) || "搭").toUpperCase();

const participantMinutes = (seconds: number): number => Math.floor(seconds / 60);

const participantProgressPercent = (participant: Participant): number => {
  const targetSeconds = (room.value?.targetDurationMinutes ?? 30) * 60;
  if (targetSeconds <= 0) return 0;
  return Math.min(
    100,
    Math.round((participant.creditedFocusSeconds / targetSeconds) * 100),
  );
};

const participantStatusClass = (status: ParticipantStatus): string =>
  `participant-tile--${status.toLowerCase().replace("_", "-")}`;

const statusLabel = (status: ParticipantStatus): string => {
  switch (status) {
    case "FOCUSING":
      return "专注中";
    case "COMPLETED":
      return "已完成";
    case "LEFT":
      return "已离开";
    case "NOT_STARTED":
      return "未开始";
  }
};
</script>

<style lang="scss" scoped>
.study-sprint-guidance {
  --pu-page-padding-top: calc(var(--sys-spacing-large) + var(--pu-safe-top));
  --pu-page-padding-bottom: calc(var(--sys-spacing-large) + var(--pu-safe-bottom));
}

.guidance-page {
  min-height: calc(var(--pu-vh) - var(--sys-spacing-large) * 2);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sys-spacing-large);
  overflow: hidden;
}

.guidance-step {
  width: 100%;
  min-width: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--sys-spacing-large);
}

.guidance-slide-enter-active,
.guidance-slide-leave-active {
  transition:
    transform 260ms ease,
    opacity 220ms ease;
}

.guidance-slide-enter-from {
  opacity: 0;
  transform: translateX(28px);
}

.guidance-slide-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

.guidance-illustration {
  position: relative;
  width: min(72vw, 280px);
  aspect-ratio: 1;
  margin: 0 auto;
}

.guidance-illustration__device,
.guidance-illustration__moon,
.guidance-illustration__timer,
.guidance-illustration__tile,
.guidance-illustration__play {
  position: absolute;
  display: none;
}

.guidance-illustration__device,
.guidance-illustration__timer,
.guidance-illustration__tile {
  border: 2px solid var(--sys-color-outline);
  background: var(--sys-color-surface-container);
}

.guidance-illustration--screen-off .guidance-illustration__device,
.guidance-illustration--screen-off .guidance-illustration__moon,
.guidance-illustration--screen-off .guidance-illustration__timer,
.guidance-illustration--companions .guidance-illustration__device,
.guidance-illustration--companions .guidance-illustration__tile,
.guidance-illustration--companions .guidance-illustration__timer,
.guidance-illustration--start .guidance-illustration__timer,
.guidance-illustration--start .guidance-illustration__play,
.guidance-illustration--start .guidance-illustration__tile--one {
  display: block;
}

.guidance-illustration--screen-off .guidance-illustration__device {
  inset: 16% 30%;
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container-highest);
}

.guidance-illustration--screen-off .guidance-illustration__device::after {
  content: "";
  position: absolute;
  width: 28%;
  height: 4px;
  left: 50%;
  bottom: 7%;
  border-radius: 999px;
  background: var(--sys-color-outline);
  transform: translateX(-50%);
}

.guidance-illustration--screen-off .guidance-illustration__moon {
  width: 18%;
  aspect-ratio: 1;
  right: 18%;
  top: 16%;
  border-radius: 999px;
  background: var(--sys-color-primary);
  box-shadow: -8px 0 0 var(--sys-color-surface-container-highest);
}

.guidance-illustration--screen-off .guidance-illustration__timer {
  width: 34%;
  aspect-ratio: 1;
  left: 8%;
  bottom: 12%;
  border-radius: 999px;
  background: var(--sys-color-primary-container);
}

.guidance-illustration--screen-off .guidance-illustration__timer::before,
.guidance-illustration--start .guidance-illustration__timer::before {
  content: "";
  position: absolute;
  width: 2px;
  height: 28%;
  left: 50%;
  top: 24%;
  border-radius: 999px;
  background: var(--sys-color-on-primary-container);
  transform-origin: bottom center;
  transform: rotate(28deg);
}

.guidance-illustration--screen-off .guidance-illustration__timer::after,
.guidance-illustration--start .guidance-illustration__timer::after {
  content: "";
  position: absolute;
  width: 24%;
  height: 2px;
  left: 50%;
  top: 52%;
  border-radius: 999px;
  background: var(--sys-color-on-primary-container);
}

.guidance-illustration--companions .guidance-illustration__device {
  inset: 14% 8%;
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container-low);
}

.guidance-illustration--companions .guidance-illustration__tile {
  width: 32%;
  aspect-ratio: 1;
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-secondary-container);
}

.guidance-illustration--companions .guidance-illustration__tile::before {
  content: "";
  position: absolute;
  width: 34%;
  aspect-ratio: 1;
  left: 50%;
  top: 22%;
  border-radius: 999px;
  background: var(--sys-color-on-secondary-container);
  transform: translateX(-50%);
}

.guidance-illustration--companions .guidance-illustration__tile::after {
  content: "";
  position: absolute;
  width: 52%;
  height: 20%;
  left: 50%;
  bottom: 18%;
  border-radius: 999px 999px 0 0;
  background: var(--sys-color-on-secondary-container);
  transform: translateX(-50%);
}

.guidance-illustration--companions .guidance-illustration__tile--one {
  left: 17%;
  top: 22%;
}

.guidance-illustration--companions .guidance-illustration__tile--two {
  right: 17%;
  top: 22%;
  background: var(--sys-color-tertiary-container);
}

.guidance-illustration--companions .guidance-illustration__tile--three {
  left: 34%;
  bottom: 18%;
  background: var(--sys-color-primary-container);
}

.guidance-illustration--companions .guidance-illustration__timer {
  width: 16%;
  aspect-ratio: 1;
  right: 12%;
  bottom: 16%;
  border-radius: 999px;
  background: var(--sys-color-primary);
}

.guidance-illustration--start .guidance-illustration__timer {
  width: 56%;
  aspect-ratio: 1;
  left: 50%;
  top: 16%;
  border-radius: 999px;
  background:
    radial-gradient(
      circle at center,
      var(--sys-color-primary-container) 0 57%,
      var(--sys-color-primary) 58% 64%,
      transparent 65%
    ),
    var(--sys-color-surface-container);
  transform: translateX(-50%);
}

.guidance-illustration--start .guidance-illustration__play {
  width: 0;
  height: 0;
  left: 50%;
  top: 42%;
  border-top: 16px solid transparent;
  border-bottom: 16px solid transparent;
  border-left: 24px solid var(--sys-color-on-primary-container);
  transform: translate(-36%, -50%);
}

.guidance-illustration--start .guidance-illustration__tile--one {
  width: 36%;
  aspect-ratio: 1;
  left: 32%;
  bottom: 8%;
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-secondary-container);
}

.guidance-illustration--start .guidance-illustration__tile--one::before,
.guidance-illustration--start .guidance-illustration__tile--one::after {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  height: 2px;
  border-radius: 999px;
  background: var(--sys-color-on-secondary-container);
}

.guidance-illustration--start .guidance-illustration__tile--one::before {
  top: 36%;
}

.guidance-illustration--start .guidance-illustration__tile--one::after {
  top: 56%;
}

.guidance-kicker {
  @include mx.pu-font(control);
  margin: 0;
  color: var(--sys-color-primary);
  text-align: center;
}

.guidance-page h1 {
  @include mx.pu-font(title);
  margin: 0;
  color: var(--sys-color-on-surface);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .guidance-slide-enter-active,
  .guidance-slide-leave-active {
    transition: none;
  }

  .guidance-slide-enter-from,
  .guidance-slide-leave-to {
    opacity: 1;
    transform: none;
  }
}

.study-sprint-room {
  --pu-page-padding-bottom: var(--pu-safe-bottom);

  min-height: var(--pu-vh);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: var(--sys-spacing-medium);
}

.room-header {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--sys-spacing-small);
}

.room-header__back {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  color: var(--sys-color-on-surface);
  background: transparent;
}

.room-header__back span {
  @include mx.pu-icon(medium);
}

.room-header__body {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--sys-spacing-small);
}

.room-header__body h1 {
  @include mx.pu-font(title);
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--sys-color-on-surface);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-header__body span {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.participant-grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: auto;
  align-content: start;
  gap: var(--sys-spacing-small);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.participant-grid--single {
  grid-template-columns: 1fr;
}

.participant-tile {
  min-width: 0;
  min-height: 180px;
  aspect-ratio: 4 / 5;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-low);
}

.participant-tile--viewer {
  border-color: var(--sys-color-primary);
  box-shadow: inset 0 0 0 1px var(--sys-color-primary);
}

.participant-tile--focusing {
  background: var(--sys-color-primary-container);
}

.participant-tile--completed {
  background: var(--sys-color-tertiary-container);
}

.participant-tile--left {
  background: var(--sys-color-surface-container);
}

.participant-tile__stage {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: var(--sys-spacing-large) var(--sys-spacing-large) calc(var(--sys-spacing-large) * 4);
}

.participant-tile__avatar {
  width: 54%;
  max-width: 116px;
  min-width: 64px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 999px;
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  box-shadow: inset 0 0 0 1px var(--sys-color-outline-variant);
}

.participant-tile__avatar span {
  @include mx.pu-font(title);
}

.participant-tile__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-tile__status {
  @include mx.pu-font(caption);
  position: absolute;
  top: var(--sys-spacing-small);
  right: var(--sys-spacing-small);
  max-width: calc(100% - var(--sys-spacing-small) * 2);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border-radius: 999px;
  color: var(--sys-color-on-surface);
  background: var(--sys-color-surface-container-high);
  white-space: nowrap;
}

.participant-tile--focusing .participant-tile__status {
  color: var(--sys-color-on-primary);
  background: var(--sys-color-primary);
}

.participant-tile__overlay {
  position: absolute;
  left: var(--sys-spacing-small);
  right: var(--sys-spacing-small);
  bottom: var(--sys-spacing-small);
  display: grid;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-lowest);
}

.participant-tile__name-row,
.participant-tile__meta {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.participant-tile__name-row strong {
  @include mx.pu-font(control);
  min-width: 0;
  overflow: hidden;
  color: var(--sys-color-on-surface);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participant-tile__name-row span {
  @include mx.pu-font(caption);
  flex: 0 0 auto;
  padding: 0 var(--sys-spacing-xsmall);
  border-radius: 999px;
  color: var(--sys-color-on-primary-container);
  background: var(--sys-color-primary-container);
}

.participant-tile__meta {
  @include mx.pu-font(caption);
  color: var(--sys-color-on-surface-variant);
}

.participant-tile__progress,
.room-controls__progress {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--sys-color-surface-container-highest);
}

.participant-tile__progress span,
.room-controls__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--sys-color-primary);
}

.room-controls {
  display: grid;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small) 0 calc(var(--sys-spacing-small) + var(--pu-safe-bottom));
  border-top: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-surface);
}

.room-controls__summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sys-spacing-small);
}

.room-controls__summary span {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.room-controls__summary strong {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface);
}

.room-controls__progress {
  grid-column: 1 / -1;
}

.room-controls__actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sys-spacing-small);
}

.room-controls__actions:has(> :nth-child(2)) {
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.72fr);
}

@media (max-width: 375px) {
  .participant-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 720px) {
  .participant-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .participant-tile__avatar {
    width: 46%;
    max-width: 132px;
    min-width: 88px;
  }
}
</style>
