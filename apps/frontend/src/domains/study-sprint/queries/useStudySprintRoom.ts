import { computed, type Ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";

type StudySprintApi = typeof client.api["study-sprint"];

export type StudySprintRoomSnapshot = InferResponseType<
  StudySprintApi["pr"][":prId"]["room"]["$get"]
>;

export type StudySprintSessionEventInput = Parameters<
  StudySprintApi["sessions"][":sessionId"]["events"]["$post"]
>[0]["json"];

const readJsonOrThrow = async <T>(
  response: Response,
  fallback: string,
): Promise<T> => {
  if (!response.ok) {
    const payload = await readApiErrorPayload(response);
    throw buildApiError(resolveApiErrorMessage(payload, fallback), payload);
  }
  return (await response.json()) as T;
};

export const useStudySprintRoom = (prId: Ref<number | null>) =>
  useQuery<StudySprintRoomSnapshot>({
    queryKey: computed(() => queryKeys.studySprint.room(prId.value)),
    queryFn: async () => {
      if (prId.value === null) {
        throw new Error("Missing PR id");
      }

      const response = await client.api["study-sprint"].pr[":prId"].room.$get(
        {
          param: {
            prId: String(prId.value),
          },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<StudySprintRoomSnapshot>(
        response,
        "Failed to load study sprint room",
      );
    },
    enabled: () => prId.value !== null,
    refetchInterval: 5000,
  });

export const useStartStudySprintSession = (prId: Ref<number | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { clientSeq: number; occurredAt: string }) => {
      if (prId.value === null) {
        throw new Error("Missing PR id");
      }

      const response = await client.api["study-sprint"].pr[
        ":prId"
      ].sessions.start.$post(
        {
          param: {
            prId: String(prId.value),
          },
          json: input,
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<StudySprintRoomSnapshot>(
        response,
        "Failed to start study sprint",
      );
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(
        queryKeys.studySprint.room(snapshot.prId),
        snapshot,
      );
    },
  });
};

export const useRecordStudySprintEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      event: StudySprintSessionEventInput;
    }) => {
      const response = await client.api["study-sprint"].sessions[
        ":sessionId"
      ].events.$post(
        {
          param: {
            sessionId: input.sessionId,
          },
          json: input.event,
        },
        {
          init: {
            credentials: "include",
          },
        },
      );
      return readJsonOrThrow<StudySprintRoomSnapshot>(
        response,
        "Failed to update study sprint",
      );
    },
    onSuccess: (snapshot) => {
      queryClient.setQueryData(
        queryKeys.studySprint.room(snapshot.prId),
        snapshot,
      );
    },
  });
};
