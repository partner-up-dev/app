import { computed, ref, unref, watch, type MaybeRef } from "vue";
import {
  type AdminPRWorkspaceResponse,
  useAdminPRWorkspace,
} from "@/domains/admin/queries/useAdminPRManagement";
import { useAdminPois } from "@/domains/admin/queries/useAdminPoiManagement";
import { toIsoDateTime } from "@/domains/admin/use-cases/pr/prMutationInput";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

export type AdminPRWorkspace = NonNullable<AdminPRWorkspaceResponse>;
export type AdminPRRecord = AdminPRWorkspace["prs"][number];
export type AdminPRFilters = {
  type: string;
  location: string;
  status: string;
  startAt: string;
  endAt: string;
};

type AdminPRWorkspaceSelectionOptions = {
  enabled: MaybeRef<boolean>;
  skipAutoSelect?: MaybeRef<boolean>;
};

export const useAdminPRWorkspaceSelection = ({
  enabled,
  skipAutoSelect = false,
}: AdminPRWorkspaceSelectionOptions) => {
  const workspaceQuery = useAdminPRWorkspace(enabled);
  const poisQuery = useAdminPois(enabled);
  const filters = ref<AdminPRFilters>({
    type: "",
    location: "",
    status: "",
    startAt: "",
    endAt: "",
  });
  const selectedPRIdRaw = ref("");

  const workspace = computed<AdminPRWorkspace | null>(() => workspaceQuery.data.value ?? null);
  const prs = computed<AdminPRRecord[]>(() => workspace.value?.prs ?? []);
  const typeOptions = computed(() => workspace.value?.typeOptions ?? []);
  const poiOptions = computed<string[]>(() =>
    [...(poisQuery.data.value ?? [])]
      .map((poi) => poi.name)
      .sort((left, right) => left.localeCompare(right, "zh-CN")),
  );
  const filterLocationOptions = computed(() => poiOptions.value);

  const selectedPRId = computed<number | null>(() => {
    const parsed = Number(selectedPRIdRaw.value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

  const selectedPR = computed<AdminPRRecord | null>(
    () => prs.value.find((pr) => pr.prId === selectedPRId.value) ?? null,
  );

  const filteredPRs = computed(() => {
    const normalizedType = filters.value.type.trim().toLowerCase();
    const normalizedLocation = filters.value.location.trim().toLowerCase();
    const filterStartAt = toIsoDateTime(filters.value.startAt);
    const filterEndAt = toIsoDateTime(filters.value.endAt);

    return prs.value.filter((pr) => {
      if (normalizedType && !pr.type.toLowerCase().includes(normalizedType)) {
        return false;
      }
      if (
        normalizedLocation &&
        !(pr.placeDisplayName ?? pr.location ?? "").toLowerCase().includes(normalizedLocation)
      ) {
        return false;
      }
      if (filters.value.status && pr.status !== filters.value.status) {
        return false;
      }

      const prStartAt = pr.time[0] ? new Date(pr.time[0]).getTime() : null;
      const prEndAt = pr.time[1] ? new Date(pr.time[1]).getTime() : null;
      if (filterStartAt) {
        const filterStartTime = new Date(filterStartAt).getTime();
        if (prEndAt !== null && prEndAt < filterStartTime) {
          return false;
        }
      }
      if (filterEndAt) {
        const filterEndTime = new Date(filterEndAt).getTime();
        if (prStartAt !== null && prStartAt > filterEndTime) {
          return false;
        }
      }

      return true;
    });
  });

  watch(
    prs,
    (nextPRs) => {
      if (unref(skipAutoSelect) || nextPRs.length === 0) {
        if (nextPRs.length === 0) {
          selectedPRIdRaw.value = "";
        }
        return;
      }
      if (!nextPRs.some((pr) => String(pr.prId) === selectedPRIdRaw.value)) {
        selectedPRIdRaw.value = String(nextPRs[0].prId);
      }
    },
    { immediate: true },
  );

  const selectPR = (prId: number) => {
    selectedPRIdRaw.value = String(prId);
  };

  const clearSelection = () => {
    selectedPRIdRaw.value = "";
  };

  const formatWindow = (windowValue: [string | null, string | null]) =>
    formatLocalDateTimeWindowLabel(windowValue, {}, "?");

  return {
    workspaceQuery,
    poisQuery,
    filters,
    selectedPRIdRaw,
    workspace,
    prs,
    typeOptions,
    poiOptions,
    filterLocationOptions,
    selectedPRId,
    selectedPR,
    filteredPRs,
    selectPR,
    clearSelection,
    formatWindow,
  };
};
