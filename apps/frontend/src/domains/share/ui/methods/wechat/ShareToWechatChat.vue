<template>
  <div class="wechat-chat-method">
    <div v-if="isMiniProgramWebView" class="mini-program-webview-state">
      <p class="mini-program-webview-state__text">
        {{ t("share.wechat.miniProgramWebViewHint") }}
      </p>
      <Button
        appearance="rect"
        tone="primary-outline"
        type="button"
        @click="showMiniProgramWebViewNotice = true"
      >
        {{ t("share.wechat.openInWechatAction") }}
      </Button>
    </div>

    <div v-else class="wechat-chat-method__body">
      <div class="options-section flex flex-col">
        <Button
          tone="outline"
          type="button"
          @click="handleGenerateAndUpdate"
          :disabled="isWorking"
        >
          {{ switchButtonLabel }}
        </Button>
      </div>

      <div class="preview-section">
        <h4 class="preview-title">{{ t("share.wechat.previewTitle") }}</h4>

        <div class="poster-preview">
          <div v-if="isWorking" class="generating-state">
            <div class="poster-placeholder">
              <div class="spinner"></div>
              <p>{{ t("share.wechat.generating") }}</p>
            </div>
          </div>
          <div v-else>
            <WechatChatPreview
              :poster-url="posterUrl"
              :share-title="shareTitle"
              :share-desc="shareDescPreview"
              :thumb-placeholder="thumbPlaceholder"
              @imageLoadError="handleThumbnailLoadError"
            />
          </div>
        </div>
      </div>

      <div class="action-section">
        <div v-if="errorText" class="error-text">{{ errorText }}</div>
        <div v-else class="guidance-text">
          <p>{{ t("share.wechat.guidanceLine1") }}</p>
          <p class="sub-text">{{ t("share.wechat.guidanceLine2") }}</p>
        </div>
      </div>
    </div>

    <WeChatMiniProgramJssdkNoticeModal
      :open="showMiniProgramWebViewNotice"
      :operation-label="t('wechatMiniProgramWebView.operations.wechatShare')"
      @close="showMiniProgramWebViewNotice = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRShareProps } from "@/domains/share/model/types";
import { useShareToWechatChat } from "@/domains/share/use-cases/wechat/useShareToWechatChat";
import WechatChatPreview from "@/domains/share/ui/primitives/WechatChatPreview.vue";
import Button from "@/shared/ui/actions/Button.vue";
import { useWeChatMiniProgramWebView } from "@/shared/wechat/useWeChatMiniProgramWebView";
import WeChatMiniProgramJssdkNoticeModal from "@/shared/wechat/WeChatMiniProgramJssdkNoticeModal.vue";

const props = defineProps<PRShareProps>();
const { t } = useI18n();
const { isMiniProgramWebView } = useWeChatMiniProgramWebView();
const showMiniProgramWebViewNotice = ref(false);

const {
  switchButtonLabel,
  isWorking,
  posterUrl,
  shareTitle,
  shareDescPreview,
  thumbPlaceholder,
  errorText,
  handleGenerateAndUpdate,
  handleThumbnailLoadError,
} = useShareToWechatChat({
  prId: toRef(props, "prId"),
  shareUrl: toRef(props, "shareUrl"),
  spmRouteKey: toRef(props, "spmRouteKey"),
  prData: toRef(props, "prData"),
  disabled: isMiniProgramWebView,
  t,
});
</script>

<style scoped lang="scss" src="./ShareToWechatChat.scss"></style>
