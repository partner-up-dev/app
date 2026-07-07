import { ref } from "vue";

export const useJoinSuccessNotificationPrompt = () => {
  const isOpen = ref(false);

  const open = (): void => {
    isOpen.value = true;
  };

  const close = (): void => {
    isOpen.value = false;
  };

  return {
    isOpen,
    open,
    close,
  };
};

