import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { isWeChatMiniProgramWebView } from "@/shared/browser/isWeChatMiniProgramWebView";

export const useWeChatMiniProgramWebView = () => {
  const miniProgramWebViewRef = ref(isWeChatMiniProgramWebView());

  const refreshFromKnownSignals = (): void => {
    miniProgramWebViewRef.value =
      miniProgramWebViewRef.value || isWeChatMiniProgramWebView();
  };

  const refreshFromJssdk = (): void => {
    if (typeof wx === "undefined" || !wx.miniProgram?.getEnv) {
      return;
    }

    wx.miniProgram.getEnv((res) => {
      miniProgramWebViewRef.value =
        miniProgramWebViewRef.value || Boolean(res.miniprogram);
    });
  };

  const handleBridgeReady = (): void => {
    refreshFromKnownSignals();
    refreshFromJssdk();
  };

  onMounted(() => {
    refreshFromKnownSignals();
    refreshFromJssdk();
    document.addEventListener("WeixinJSBridgeReady", handleBridgeReady, false);
  });

  onBeforeUnmount(() => {
    document.removeEventListener(
      "WeixinJSBridgeReady",
      handleBridgeReady,
      false,
    );
  });

  return {
    isMiniProgramWebView: computed(() => miniProgramWebViewRef.value),
  };
};
