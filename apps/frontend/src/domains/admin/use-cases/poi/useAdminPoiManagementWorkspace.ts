import { computed, ref, unref, watch, type MaybeRef } from "vue";
import {
  type AdminPoisResponse,
  useAdminPois,
} from "@/domains/admin/queries/useAdminPoiManagement";
import { useAdminPoiActions } from "@/domains/admin/use-cases/poi/useAdminPoiActions";
import {
  useAdminPoiEditor,
  weekdayOptions,
} from "@/domains/admin/use-cases/poi/useAdminPoiEditor";
import type { PickedLocation } from "@/domains/location/model/location-picker";

type PoiRecord = NonNullable<AdminPoisResponse>[number];

export const useAdminPoiManagementWorkspace = (
  isAdmin: MaybeRef<boolean>,
) => {
  const poisQuery = useAdminPois(isAdmin);
  const poiActions = useAdminPoiActions();

  const selectedPoiIdRaw = ref("");
  const newPoiName = ref("");
  const rejectReasonDraft = ref("");
  const poiMutationAction = ref<
    "create" | "save-poi" | "publish-poi" | "reject-poi" | null
  >(null);

  const pois = computed<PoiRecord[]>(() => poisQuery.data.value ?? []);
  const poiIdSet = computed<Set<string>>(
    () => new Set(pois.value.map((poi) => String(poi.id))),
  );
  const selectedPoiId = computed<number | null>(() => {
    const rawId = selectedPoiIdRaw.value.trim();
    if (!rawId) return null;
    return poiIdSet.value.has(rawId) ? Number(rawId) : null;
  });
  const selectedPoi = computed<PoiRecord | null>(() => {
    const poiId = selectedPoiId.value;
    if (!poiId) return null;
    return pois.value.find((poi) => poi.id === poiId) ?? null;
  });
  const adminReady = computed(() => unref(isAdmin));

  const poiEditor = useAdminPoiEditor({
    pois,
    selectedPoiId,
  });

  const canCreatePoi = computed(() => {
    const poiName = newPoiName.value.trim();
    if (!poiName) return false;
    return !pois.value.some((poi) => poi.name === poiName);
  });
  const isCreatingPoi = computed(
    () =>
      poiActions.isPending.create.value && poiMutationAction.value === "create",
  );
  const isSavingPoi = computed(
    () =>
      poiActions.isPending.upsert.value &&
      poiMutationAction.value === "save-poi",
  );
  const isPublishingPoi = computed(
    () =>
      poiActions.isPending.publish.value &&
      poiMutationAction.value === "publish-poi",
  );
  const isRejectingPoi = computed(
    () =>
      poiActions.isPending.reject.value &&
      poiMutationAction.value === "reject-poi",
  );
  const canPublishPoi = computed(
    () =>
      selectedPoi.value !== null &&
      selectedPoi.value.status !== "PUBLISHED" &&
      !isPublishingPoi.value,
  );
  const canRejectPoi = computed(
    () =>
      selectedPoi.value !== null &&
      selectedPoi.value.status !== "PUBLISHED" &&
      selectedPoi.value.status !== "REJECTED" &&
      !isRejectingPoi.value,
  );
  const selectedReviewedAt = computed(() => {
    const reviewedAt = selectedPoi.value?.reviewedAt;
    if (!reviewedAt) return "";
    const date = new Date(reviewedAt);
    if (Number.isNaN(date.getTime())) return reviewedAt;
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  });
  const pageError = computed(
    () =>
      poisQuery.error.value ??
      poiActions.errors.upsert.value ??
      poiActions.errors.create.value ??
      poiActions.errors.publish.value ??
      poiActions.errors.reject.value ??
      null,
  );

  watch(
    [pois, adminReady],
    ([nextPois, ready]) => {
      if (!ready || nextPois.length === 0) {
        selectedPoiIdRaw.value = "";
        return;
      }
      if (!nextPois.some((poi) => String(poi.id) === selectedPoiIdRaw.value)) {
        selectedPoiIdRaw.value = String(nextPois[0].id);
      }
    },
    { immediate: true },
  );

  watch(
    selectedPoi,
    (poi) => {
      rejectReasonDraft.value = poi?.rejectReason ?? "";
    },
    { immediate: true },
  );

  const handleCreatePoi = async () => {
    const poiName = newPoiName.value.trim();
    if (!poiName || pois.value.some((poi) => poi.name === poiName)) return;

    poiMutationAction.value = "create";
    try {
      const result = await poiActions.createPoi({
        name: poiName,
        fullAddress: null,
        gallery: [],
        gcj02: null,
        wgs84: null,
        bd09: null,
        perTimeWindowCap: null,
        availabilityRules: [],
        meetingPoint: null,
      });
      selectedPoiIdRaw.value = String(result.id);
      newPoiName.value = "";
    } finally {
      poiMutationAction.value = null;
    }
  };

  const handleSavePoi = async () => {
    const poiId = selectedPoiId.value;
    const poi = selectedPoi.value;
    if (!poiId || !poi) return;

    poiMutationAction.value = "save-poi";
    try {
      const result = await poiActions.upsertPoi({
        poiId,
        name: poi.name,
        ...poiEditor.buildSelectedPoiInput(),
      });
      poiEditor.applySavedPoi(poiId, result);
    } finally {
      poiMutationAction.value = null;
    }
  };

  const handlePublishPoi = async () => {
    const poiId = selectedPoiId.value;
    if (!poiId || !canPublishPoi.value) return;

    poiMutationAction.value = "publish-poi";
    try {
      await poiActions.publishPoi(poiId);
    } finally {
      poiMutationAction.value = null;
    }
  };

  const handleRejectPoi = async () => {
    const poiId = selectedPoiId.value;
    if (!poiId || !canRejectPoi.value) return;

    poiMutationAction.value = "reject-poi";
    try {
      await poiActions.rejectPoi({
        poiId,
        rejectReason: rejectReasonDraft.value.trim() || null,
      });
    } finally {
      poiMutationAction.value = null;
    }
  };

  const handlePickPoiLocation = (location: PickedLocation) => {
    poiEditor.setSelectedPoiLocation(location);
  };

  const handleClearPoiCoordinates = () => {
    poiEditor.clearSelectedPoiCoordinates();
  };

  return {
    poisQuery,
    selectedPoiIdRaw,
    newPoiName,
    rejectReasonDraft,
    pois,
    selectedPoiId,
    selectedPoi,
    manualGalleryUrl: poiEditor.manualGalleryUrl,
    isUploadingGalleryImage: poiEditor.isUploadingGalleryImage,
    selectedPoiGallery: poiEditor.selectedPoiGallery,
    selectedPoiFullAddress: poiEditor.selectedPoiFullAddress,
    selectedPoiCoordinateText: poiEditor.selectedPoiCoordinateText,
    selectedPoiHasCoordinate: poiEditor.selectedPoiHasCoordinate,
    selectedPoiPickerLocation: poiEditor.selectedPoiPickerLocation,
    selectedPoiCapText: poiEditor.selectedPoiCapText,
    selectedPoiMeetingPointDescription:
      poiEditor.selectedPoiMeetingPointDescription,
    selectedPoiMeetingPointImageUrl: poiEditor.selectedPoiMeetingPointImageUrl,
    selectedPoiAvailabilityRules: poiEditor.selectedPoiAvailabilityRules,
    markSelectedPoiDirty: poiEditor.markSelectedPoiDirty,
    handleAddManualUrl: poiEditor.handleAddManualUrl,
    handleGalleryUploaded: poiEditor.handleGalleryUploaded,
    handleRemoveGalleryImage: poiEditor.handleRemoveGalleryImage,
    handlePickPoiLocation,
    handleClearPoiCoordinates,
    handleAddAvailabilityRule: poiEditor.handleAddAvailabilityRule,
    handleRemoveAvailabilityRule: poiEditor.handleRemoveAvailabilityRule,
    weekdayOptions,
    canCreatePoi,
    isCreatingPoi,
    isSavingPoi,
    isPublishingPoi,
    isRejectingPoi,
    canPublishPoi,
    canRejectPoi,
    selectedReviewedAt,
    pageError,
    handleCreatePoi,
    handleSavePoi,
    handlePublishPoi,
    handleRejectPoi,
  };
};
