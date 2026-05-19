import { computed, nextTick, ref } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import type { PRStatus } from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { useCreatePRFromStructured } from "@/domains/pr/queries/usePRCreate";
import { usePublishPR } from "@/domains/pr/queries/usePRPublish";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { trackEvent } from "@/shared/telemetry/track";
import { createCommandCorrelationId } from "@/shared/telemetry/correlation";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import {
  toPartnerRequestFields,
  type PRFormFields,
} from "@/domains/pr/model/types";

export type CreateSubmissionMode = "DRAFT" | "PUBLISH";

const resolveTopic = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildInitialFields = (topic: string | null): PRFormFields => ({
  title: undefined,
  type: topic ?? "",
  time: [null, null],
  location: null,
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
});

export const usePRCreateFlow = () => {
  const router = useRouter();
  const route = useRoute();
  const userSessionStore = useUserSessionStore();
  const createMutation = useCreatePRFromStructured();
  const publishMutation = usePublishPR();

  const initialFields = ref<PRFormFields>(
    buildInitialFields(resolveTopic(route.query.topic)),
  );

  const pendingStatus = ref<CreateSubmissionMode>("PUBLISH");
  const allowDraftSave = computed(() => !userSessionStore.isAuthenticated);

  const submitAs = (status: CreateSubmissionMode) => {
    pendingStatus.value = status;
  };

  const handleSubmit = async ({ fields }: PartnerRequestFormInput) => {
    await ensureAuthSessionBootstrapped();

    const correlationId = createCommandCorrelationId();
    const result = await createMutation.mutateAsync({
      fields: toPartnerRequestFields(fields),
      createSource: "FORM",
      correlationId,
    });

    let createdStatus: PRStatus = result.status;
    if (createdStatus === "DRAFT" && pendingStatus.value === "PUBLISH") {
      const publishResult = await publishMutation.mutateAsync({ id: result.id });
      createdStatus = publishResult.pr.status;
    }

    await nextTick();
    trackEvent("pr_create_result", {
      prId: result.id,
      status: createdStatus,
      scenarioType: fields.type,
      actionResult: "success",
      correlationId,
    });
    if (createdStatus !== "DRAFT") {
      await router.push(`${result.canonicalPath}?entry=create`);
      return;
    }

    await router.push(result.canonicalPath);
  };

  const goHome = () => {
    router.push("/");
  };

  return {
    createMutation,
    publishMutation,
    initialFields,
    pendingStatus,
    allowDraftSave,
    submitAs,
    handleSubmit,
    goHome,
  };
};
