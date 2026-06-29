export type RideHailingListingBlockerReason =
  | "missing-offer"
  | "missing-route"
  | "missing-contact-phone"
  | "missing-riders";

export type RideHailingListingBlocker = {
  reason: RideHailingListingBlockerReason;
  title: string;
  message: string;
  actionLabel?: string;
};

export type RideHailingListingBlockerInput = {
  hasRideOffer: boolean;
  hasRoute: boolean;
  contactPhone: string;
  riderCount: number;
};

export type RideHailingListingSurfaceState =
  | "waiting-for-input"
  | "loading"
  | "error"
  | "empty"
  | "ready";

export type RideHailingListingSurfaceStateInput = {
  blocker: RideHailingListingBlocker | null;
  hasListingInput: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  visibleOptionCount: number;
};

export const isRideHailingContactPhoneComplete = (value: string): boolean =>
  /^1\d{10}$/.test(value.trim());

export const resolveRideHailingListingBlocker = (
  input: RideHailingListingBlockerInput,
): RideHailingListingBlocker | null => {
  if (!input.hasRideOffer) {
    return {
      reason: "missing-offer",
      title: "暂不能加载车型",
      message: "当前商品配置不可用，请联系支持处理。",
      actionLabel: "联系支持",
    };
  }
  if (!input.hasRoute) {
    return {
      reason: "missing-route",
      title: "需要补全行程路线",
      message: "网约车报价需要上车点和目的地，请先补全路线后再下单。",
      actionLabel: "查看处理方式",
    };
  }
  if (input.contactPhone.trim().length === 0) {
    return {
      reason: "missing-contact-phone",
      title: "需要联系人电话",
      message: "用于司机或平台在行程异常时联系你。填写后会自动加载车型报价。",
    };
  }
  if (input.riderCount === 0) {
    return {
      reason: "missing-riders",
      title: "需要确认同乘人",
      message: "当前没有可用于下单的搭子参与者，请确认搭子请求成员和状态。",
      actionLabel: "查看处理方式",
    };
  }
  return null;
};

export const resolveRideHailingListingSurfaceState = (
  input: RideHailingListingSurfaceStateInput,
): RideHailingListingSurfaceState => {
  if (input.blocker || !input.hasListingInput) return "waiting-for-input";
  if (input.isError) return "error";
  if (input.isPending && input.visibleOptionCount === 0) return "loading";
  if (input.isSuccess && input.visibleOptionCount === 0) return "empty";
  return "ready";
};
