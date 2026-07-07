import { computed, ref } from "vue";
import { i18n } from "@/locales/i18n";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
import { useWeChatShare } from "@/shared/wechat/useWeChatShare";

const VOICE_JS_APIS: ReadonlyArray<WeChatJsApiName> = [
  "startRecord",
  "stopRecord",
  "onVoiceRecordEnd",
  "translateVoice",
  "updateAppMessageShareData",
  "updateTimelineShareData",
];

const formatWeChatError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // Ignore serialization issues and fall back to generic copy.
  }

  return i18n.global.t("common.operationFailed");
};

export const useWeChatVoiceInput = (options?: {
  onTranscript?: (text: string) => void;
}) => {
  const { initWeChatSdk } = useWeChatShare();

  const isRecordingRef = ref(false);
  const isProcessingRef = ref(false);
  const lastTranscriptRef = ref<string | null>(null);
  const errorRef = ref<string | null>(null);
  let hasBoundRecordEnd = false;

  const ensureWeChatSdk = async (): Promise<void> => {
    await initWeChatSdk({ jsApiList: VOICE_JS_APIS });
  };

  const deliverTranscript = (text: string): void => {
    lastTranscriptRef.value = text;
    options?.onTranscript?.(text);
  };

  const translateVoice = async (localId: string): Promise<string> => {
    await ensureWeChatSdk();

    return await new Promise<string>((resolve, reject) => {
      wx?.translateVoice({
        localId,
        isShowProgressTips: 0,
        success: (res) => {
          const result = res.translateResult?.trim() ?? "";
          if (result.length === 0) {
            reject(new Error(i18n.global.t("nlForm.voiceEmptyResult")));
            return;
          }

          resolve(result);
        },
        fail: (error) => {
          reject(
            new Error(
              i18n.global.t("nlForm.voiceTranslateFailed", {
                message: formatWeChatError(error),
              }),
            ),
          );
        },
      });
    });
  };

  const handleRecordFinished = async (localId: string): Promise<string | null> => {
    isProcessingRef.value = true;
    isRecordingRef.value = false;
    errorRef.value = null;

    try {
      const transcript = await translateVoice(localId);
      deliverTranscript(transcript);
      return transcript;
    } catch (error) {
      errorRef.value = formatWeChatError(error);
      return null;
    } finally {
      isProcessingRef.value = false;
    }
  };

  const bindRecordEnd = () => {
    if (hasBoundRecordEnd || typeof wx === "undefined") return;

    wx.onVoiceRecordEnd({
      complete: (res) => {
        const localId = res.localId;
        if (!localId) return;
        void handleRecordFinished(localId);
      },
    });

    hasBoundRecordEnd = true;
  };

  const startRecording = async (): Promise<void> => {
    if (!isWeChatBrowser()) {
      errorRef.value = i18n.global.t("nlForm.voiceWeChatOnly");
      return;
    }

    if (isRecordingRef.value || isProcessingRef.value) return;

    try {
      errorRef.value = null;
      await ensureWeChatSdk();
      bindRecordEnd();

      await new Promise<void>((resolve, reject) => {
        wx?.startRecord({
          success: () => resolve(),
          fail: (error) => {
            reject(
              new Error(
                i18n.global.t("nlForm.voiceStartFailed", {
                  message: formatWeChatError(error),
                }),
              ),
            );
          },
          cancel: () => {
            reject(new Error(i18n.global.t("nlForm.voicePermissionDenied")));
          },
        });
      });

      isRecordingRef.value = true;
    } catch (error) {
      isRecordingRef.value = false;
      errorRef.value = formatWeChatError(error);
      throw error;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!isRecordingRef.value && !isProcessingRef.value) return null;

    try {
      await ensureWeChatSdk();

      const localId = await new Promise<string>((resolve, reject) => {
        wx?.stopRecord({
          success: (res) => resolve(res.localId),
          fail: (error) => {
            reject(
              new Error(
                i18n.global.t("nlForm.voiceStopFailed", {
                  message: formatWeChatError(error),
                }),
              ),
            );
          },
        });
      });

      return await handleRecordFinished(localId);
    } catch (error) {
      errorRef.value = formatWeChatError(error);
      return null;
    }
  };

  const resetError = (): void => {
    errorRef.value = null;
  };

  return {
    isSupported: computed(() => isWeChatBrowser()),
    isRecording: computed(() => isRecordingRef.value),
    isProcessing: computed(() => isProcessingRef.value),
    lastTranscript: computed(() => lastTranscriptRef.value),
    errorMessage: computed(() => errorRef.value),
    startRecording,
    stopRecording,
    resetError,
  };
};
