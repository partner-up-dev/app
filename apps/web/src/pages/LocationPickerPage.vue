<template>
  <PuPageScaffold viewport="screen" class="location-picker-page">
    <template #pageHeader>
      <PuHeader :title="t('locationPicker.title')" title-as="h1">
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            data-testid="location-picker-page.back"
            @click="goBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
            {{ t("common.backToPrevious") }}
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <LocationPickerBody
      class="location-picker-page__panel"
      :initial-location="lastPickedLocation"
      @pick="handlePick"
      @cancel="goBack"
    />
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { PuButton, PuHeader, PuPageScaffold } from "@partner-up-dev/design-web";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import type { PickedLocation } from "@/domains/location/model/location-picker";
import {
  readLastPickedLocation,
  saveLastPickedLocation,
} from "@/domains/location/model/location-picker-session";
import LocationPickerBody from "@/domains/location/ui/LocationPickerBody.vue";

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
.location-picker-page__panel {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
