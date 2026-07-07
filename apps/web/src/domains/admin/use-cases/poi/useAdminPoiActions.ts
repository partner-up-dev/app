import {
  type AdminPoiAvailabilityRulesInput,
  useCreateAdminPoi,
  usePublishAdminPoi,
  useRejectAdminPoi,
  useUpsertAdminPoi,
} from "@/domains/admin/queries/useAdminPoiManagement";

type MeetingPointInput = {
  description: string | null;
  imageUrl: string | null;
};

export type AdminPoiUpsertInput = {
  poiId: number;
  name: string;
  fullAddress: string | null;
  gallery: string[];
  gcj02: [number, number] | null;
  wgs84: [number, number] | null;
  bd09: [number, number] | null;
  perTimeWindowCap: number | null;
  availabilityRules: AdminPoiAvailabilityRulesInput;
  meetingPoint?: MeetingPointInput | null;
};

export type AdminPoiCreateInput = Omit<AdminPoiUpsertInput, "poiId">;

export const useAdminPoiActions = () => {
  const createPoiMutation = useCreateAdminPoi();
  const upsertPoiMutation = useUpsertAdminPoi();
  const publishPoiMutation = usePublishAdminPoi();
  const rejectPoiMutation = useRejectAdminPoi();

  const createPoi = async (input: AdminPoiCreateInput) =>
    await createPoiMutation.mutateAsync(input);

  const upsertPoi = async (input: AdminPoiUpsertInput) =>
    await upsertPoiMutation.mutateAsync(input);

  const publishPoi = async (poiId: number) =>
    await publishPoiMutation.mutateAsync({ poiId });

  const rejectPoi = async ({
    poiId,
    rejectReason,
  }: {
    poiId: number;
    rejectReason: string | null;
  }) =>
    await rejectPoiMutation.mutateAsync({
      poiId,
      rejectReason,
    });

  const reset = () => {
    createPoiMutation.reset();
    upsertPoiMutation.reset();
    publishPoiMutation.reset();
    rejectPoiMutation.reset();
  };

  return {
    createPoi,
    upsertPoi,
    publishPoi,
    rejectPoi,
    isPending: {
      create: createPoiMutation.isPending,
      upsert: upsertPoiMutation.isPending,
      publish: publishPoiMutation.isPending,
      reject: rejectPoiMutation.isPending,
    },
    errors: {
      create: createPoiMutation.error,
      upsert: upsertPoiMutation.error,
      publish: publishPoiMutation.error,
      reject: rejectPoiMutation.error,
    },
    reset,
  };
};
