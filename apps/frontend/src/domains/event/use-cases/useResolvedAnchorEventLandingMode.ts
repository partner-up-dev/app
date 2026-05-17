import { computed, ref, watch, type Ref } from "vue";
import {
  normalizeAnchorEventLandingMode,
  readStoredAnchorEventLandingMode,
  writeStoredAnchorEventLandingMode,
  type AnchorEventLandingMode,
} from "@/domains/event/model/anchorEventLandingModeStorage";
import {
  isAnchorEventLandingAssignmentTimeoutError,
  useAnchorEventLandingAssignment,
} from "@/domains/event/queries/useAnchorEventLandingAssignment";

export const useResolvedAnchorEventLandingMode = (
  eventId: Ref<number | null>,
  requestedMode?: Ref<unknown>,
) => {
  const selectedMode = ref<AnchorEventLandingMode | null>(null);
  const selectedModeEventId = ref<number | null>(null);
  const selectedModeKey = ref<string | null>(null);

  const requestedLandingMode = computed(() =>
    normalizeAnchorEventLandingMode(requestedMode?.value),
  );
  const shouldFetchAssignment = computed(() => requestedLandingMode.value === null);
  const assignmentQuery = useAnchorEventLandingAssignment(eventId, {
    enabled: shouldFetchAssignment,
  });

  const buildModeKey = (resolvedEventId: number, assignmentRevision: number) =>
    `${resolvedEventId}:${assignmentRevision}`;

  const resolvedMode = computed<AnchorEventLandingMode | null>(() => {
    const assignment = assignmentQuery.data.value;
    const resolvedEventId = eventId.value;
    const requested = requestedLandingMode.value;

    if (requested !== null) {
      return requested;
    }

    if (assignment && resolvedEventId !== null) {
      const modeKey = buildModeKey(
        resolvedEventId,
        assignment.assignmentRevision,
      );
      if (selectedModeKey.value === modeKey && selectedMode.value !== null) {
        return selectedMode.value;
      }

      return (
        readStoredAnchorEventLandingMode(
          resolvedEventId,
          assignment.assignmentRevision,
        ) ??
        assignment.mode
      );
    }

    if (
      selectedModeKey.value === null &&
      selectedModeEventId.value === resolvedEventId &&
      selectedMode.value !== null
    ) {
      return selectedMode.value;
    }

    if (isAnchorEventLandingAssignmentTimeoutError(assignmentQuery.error.value)) {
      return "LIST";
    }

    return null;
  });

  watch(
    [eventId, () => assignmentQuery.data.value, requestedLandingMode],
    ([resolvedEventId, assignment, requested]) => {
      if (resolvedEventId === null) {
        selectedMode.value = null;
        selectedModeEventId.value = null;
        selectedModeKey.value = null;
        return;
      }

      if (!assignment) {
        if (requested !== null) {
          selectedMode.value = requested;
          selectedModeEventId.value = resolvedEventId;
          selectedModeKey.value = null;
          return;
        }

        selectedMode.value = null;
        selectedModeEventId.value = resolvedEventId;
        selectedModeKey.value = null;
        return;
      }

      const modeKey = buildModeKey(resolvedEventId, assignment.assignmentRevision);
      const storedMode = readStoredAnchorEventLandingMode(
        resolvedEventId,
        assignment.assignmentRevision,
      );
      const nextMode = storedMode ?? assignment.mode;
      selectedMode.value = nextMode;
      selectedModeEventId.value = resolvedEventId;
      selectedModeKey.value = modeKey;

      if (storedMode === null) {
        writeStoredAnchorEventLandingMode(
          resolvedEventId,
          assignment.assignmentRevision,
          nextMode,
        );
      }
    },
    { immediate: true },
  );

  const setResolvedMode = (mode: AnchorEventLandingMode): void => {
    const resolvedEventId = eventId.value;
    const assignment = assignmentQuery.data.value;
    if (resolvedEventId === null || !assignment) {
      selectedMode.value = mode;
      selectedModeEventId.value = resolvedEventId;
      selectedModeKey.value = null;
      return;
    }

    selectedMode.value = mode;
    selectedModeEventId.value = resolvedEventId;
    selectedModeKey.value = buildModeKey(
      resolvedEventId,
      assignment.assignmentRevision,
    );
    writeStoredAnchorEventLandingMode(
      resolvedEventId,
      assignment.assignmentRevision,
      mode,
    );
  };

  return {
    assignmentQuery,
    resolvedMode,
    setResolvedMode,
    isTimeoutFallback: computed(() =>
      isAnchorEventLandingAssignmentTimeoutError(assignmentQuery.error.value),
    ),
  };
};
