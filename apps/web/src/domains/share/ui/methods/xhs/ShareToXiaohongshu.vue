<template>
  <div class="xiaohongshu-method">
    <!-- Options Section -->
    <div v-if="prData" class="options-section">
      <PuButton
        tone="neutral"
        variant="outline"
        block
        @click="handleRegenerate"
        :disabled="isCaptionGenerating"
      >
        {{
          isCaptionGenerating
            ? t("share.xiaohongshu.generating")
            : `🔄 ${t("share.xiaohongshu.regenerateButton")}`
        }}
      </PuButton>
    </div>

    <!-- Preview Section -->
    <div class="xiaohongshu-preview">
      <!-- Caption Editor -->
      <textarea
        :value="caption?.caption"
        class="caption-textarea"
        :class="{ transitioning: isTransitioning }"
        :placeholder="t('share.xiaohongshu.captionPlaceholder')"
        :disabled="isCaptionGenerating"
        @input="handleCaptionUpdate"
        @blur="handleCaptionBlur"
      ></textarea>

      <!-- Poster Preview -->
      <div class="poster-preview">
        <div v-if="posterUrl" class="poster-stage">
          <div class="poster-image-frame">
            <img
              :src="posterUrl"
              :alt="t('share.xiaohongshu.posterAlt')"
              class="poster-image"
              :class="{
                'poster-transitioning': isPosterTransitioning,
                'poster-loading': posterIsGenerating,
              }"
              @error="handlePosterLoadError"
            />
            <div v-if="posterIsGenerating" class="poster-loading-overlay">
              <div class="spinner"></div>
            </div>
          </div>
          <div class="guidance-text">
            <p>📱 {{ t("share.xiaohongshu.saveHint") }}</p>
          </div>
        </div>
        <div v-else-if="posterIsGenerating" class="generating-state">
          <div class="poster-placeholder">
            <div class="spinner"></div>
            <p>🎨 {{ t("share.xiaohongshu.posterGenerating") }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>{{ t("share.xiaohongshu.posterNotGenerated") }}</p>
        </div>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="action-section">
      <div class="actions-row">
        <PuButton
          class="outline-action caption-clipboard-action"
          variant="outline"
          :feedback="copyFeedbackState"
          :disabled="!caption?.caption || copyState !== 'idle'"
          @click="handleCopyCaptionWithUrl"
        >
          {{ copyButtonLabel }}
        </PuButton>
        <PuButton
          class="outline-action poster-download-action"
          tone="neutral"
          variant="outline"
          @click="handleDownloadPoster"
          :disabled="!caption?.caption || posterIsGenerating || inWeChatBrowser"
        >
          {{ downloadButtonLabel }}
        </PuButton>
      </div>
      <PuButton block @click="handleOpenApp">
        {{ t("share.xiaohongshu.openAppButton") }}
        <div class="i-mdi-arrow-top-right"></div>
      </PuButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRShareProps } from "@/domains/share/model/types";
import { useShareToXiaohongshu } from "@/domains/share/use-cases/xhs/useShareToXiaohongshu";
import { PuButton } from "@partner-up-dev/design-web";

const props = defineProps<PRShareProps>();
const { t } = useI18n();

const {
  caption,
  posterUrl,
  posterIsGenerating,
  isCaptionGenerating,
  isTransitioning,
  isPosterTransitioning,
  copyState,
  copyButtonLabel,
  downloadButtonLabel,
  inWeChatBrowser,
  handleRegenerate,
  handleCaptionUpdate,
  handleCaptionBlur,
  handlePosterLoadError,
  handleCopyCaptionWithUrl,
  handleDownloadPoster,
  handleOpenApp,
} = useShareToXiaohongshu({
  prId: props.prId,
  shareUrl: props.shareUrl,
  spmRouteKey: props.spmRouteKey,
  prData: props.prData,
  t,
});

const copyFeedbackState = computed<"idle" | "success" | "error">(() => {
  if (copyState.value === "copied") return "success";
  if (copyState.value === "error") return "error";
  return "idle";
});
</script>

<style scoped lang="scss" src="./ShareToXiaohongshu.scss"></style>
