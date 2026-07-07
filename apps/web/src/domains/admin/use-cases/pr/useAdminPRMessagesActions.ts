import {
  useCreateAdminPRMessage,
  useDeleteAdminPRMessage,
  useUpdateAdminPRMessage,
} from "@/domains/admin/queries/useAdminPRManagement";

export const useAdminPRMessagesActions = () => {
  const createMessageMutation = useCreateAdminPRMessage();
  const updateMessageMutation = useUpdateAdminPRMessage();
  const deleteMessageMutation = useDeleteAdminPRMessage();

  const createMessage = async ({
    prId,
    body,
  }: {
    prId: number;
    body: string;
  }) =>
    await createMessageMutation.mutateAsync({
      prId,
      input: { body },
    });

  const updateMessage = async ({
    prId,
    messageId,
    body,
  }: {
    prId: number;
    messageId: number;
    body: string;
  }) =>
    await updateMessageMutation.mutateAsync({
      prId,
      messageId,
      input: { body },
    });

  const deleteMessage = async ({
    prId,
    messageId,
  }: {
    prId: number;
    messageId: number;
  }) =>
    await deleteMessageMutation.mutateAsync({
      prId,
      messageId,
    });

  return {
    createMessage,
    updateMessage,
    deleteMessage,
    isPending: {
      create: createMessageMutation.isPending,
      update: updateMessageMutation.isPending,
      delete: deleteMessageMutation.isPending,
    },
  };
};
