import { defineStore } from "pinia";
import { ref } from "vue";

const STORAGE_KEY = "natural_language_pr_draft";

export const useNaturalLanguageDraftStore = defineStore(
  "naturalLanguageDraft",
  () => {
    const rawText = ref("");

    const setRawText = (value: string): void => {
      rawText.value = value ?? "";
    };

    const clear = (): void => {
      rawText.value = "";
    };

    return {
      rawText,
      setRawText,
      clear,
    };
  },
  {
    persist:
      typeof window === "undefined"
        ? false
        : {
            key: STORAGE_KEY,
          },
  },
);
