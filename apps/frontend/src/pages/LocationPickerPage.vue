<template>
  <PuPageScaffold viewport="screen" class="location-picker-page">
    <template #header>
      <div class="location-picker-page__header">
        <Button
          type="button"
          tone="ghost"
          size="sm"
          data-testid="location-picker-page.back"
          @click="goBack"
        >
          <template #leading>
            <span class="i-mdi-arrow-left" aria-hidden="true"></span>
          </template>
          {{ t("common.backToPrevious") }}
        </Button>
        <h1>{{ t("locationPicker.title") }}</h1>
      </div>
    </template>

    <LocationPickerPanel
      class="location-picker-page__panel"
      :initial-location="lastPickedLocation"
      @pick="handlePick"
      @cancel="goBack"
    />
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import Button from "@/shared/ui/actions/Button.vue";
import LocationPickerPanel from "@/domains/location/ui/LocationPickerPanel.vue";
import type { PickedLocation } from "@/domains/location/model/location-picker";
import { PuPageScaffold } from "@partner-up-dev/design-web";
import {
  readLastPickedLocation,
  saveLastPickedLocation,
} from "@/domains/location/model/location-picker-session";

const { t } = useI18n();
const router = useRouter();
const lastPickedLocation = ref(readLastPickedLocation());

const goBack = () => {
  router.back();
};

const handlePick = (location: PickedLocation) => {
  saveLastPickedLocation(location);
  goBack();
};
</script>

<style scoped lang="scss">
.location-picker-page__header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small) 0;
}

.location-picker-page__header h1 {
  @include mx.pu-font(title);
  min-width: 0;
  margin: 0;
  color: var(--sys-color-on-surface);
}

.location-picker-page__panel {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
