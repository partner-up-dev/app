export {};

declare global {
  type WeChatJsApiName =
    | "updateAppMessageShareData"
    | "updateTimelineShareData"
    | "startRecord"
    | "stopRecord"
    | "onVoiceRecordEnd"
    | "translateVoice";

  type WeChatOpenTagName = "wx-open-subscribe";

  type WeChatMiniProgramEnv = {
    miniprogram: boolean;
  };

  type WeChatMiniProgramJssdk = {
    getEnv: (callback: (res: WeChatMiniProgramEnv) => void) => void;
  };

  type WeChatPayBridgePayload = {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: "RSA";
    paySign: string;
  };

  type WeixinJsBridgeCallbackPayload = {
    err_msg?: string;
  };

  type WeixinJsBridgeApi = {
    invoke: (
      method: string,
      payload: WeChatPayBridgePayload,
      callback: (response: WeixinJsBridgeCallbackPayload) => void,
    ) => void;
  };

  type WeChatConfigPayload = {
    debug?: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: ReadonlyArray<WeChatJsApiName>;
    openTagList?: ReadonlyArray<WeChatOpenTagName>;
  };

  type WeChatShareToChatPayload = {
    title: string;
    desc: string;
    link: string;
    imgUrl: string;
    success?: () => void;
    fail?: (error: unknown) => void;
  };

  type WeChatShareToTimelinePayload = {
    title: string;
    link: string;
    imgUrl: string;
    success?: () => void;
    fail?: (error: unknown) => void;
  };

  type WeChatJssdk = {
    config: (payload: WeChatConfigPayload) => void;
    ready: (cb: () => void) => void;
    error: (cb: (error: unknown) => void) => void;
    updateAppMessageShareData: (payload: WeChatShareToChatPayload) => void;
    updateTimelineShareData: (payload: WeChatShareToTimelinePayload) => void;
    startRecord: (callbacks?: {
      success?: () => void;
      fail?: (error: unknown) => void;
      cancel?: () => void;
    }) => void;
    stopRecord: (callbacks?: {
      success?: (res: { localId: string }) => void;
      fail?: (error: unknown) => void;
    }) => void;
    onVoiceRecordEnd: (callbacks: { complete: (res: { localId: string }) => void }) => void;
    translateVoice: (payload: {
      localId: string;
      isShowProgressTips?: 0 | 1;
      success?: (res: { translateResult: string }) => void;
      fail?: (error: unknown) => void;
    }) => void;
    miniProgram?: WeChatMiniProgramJssdk;
  };

  interface Window {
    __wxjs_environment?: string;
    WeixinJSBridge?: WeixinJsBridgeApi;
  }

  const wx: WeChatJssdk | undefined;
}
