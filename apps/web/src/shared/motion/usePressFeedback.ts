import { ref } from "vue";

export const usePressFeedback = () => {
  const isPressed = ref(false);

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    isPressed.value = true;
  };

  const releasePress = () => {
    isPressed.value = false;
  };

  return {
    isPressed,
    onPointerDown,
    onPointerUp: releasePress,
    onPointerCancel: releasePress,
    onPointerLeave: releasePress,
  };
};
