import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  normalizeOrderingEntryPayload,
  ORDERING_ENTRY_STORAGE_KEY,
  type OrderingEntryPayload,
  parseOrderingEntryPayload,
} from "@/domains/commerce/model/ordering-entry-storage";

const readStoredOrderingEntry = (): OrderingEntryPayload | null => {
  if (typeof window === "undefined") return null;
  try {
    return parseOrderingEntryPayload(window.sessionStorage.getItem(ORDERING_ENTRY_STORAGE_KEY));
  } catch {
    return null;
  }
};

const writeStoredOrderingEntry = (entry: OrderingEntryPayload | null): void => {
  if (typeof window === "undefined") return;
  try {
    if (entry) {
      window.sessionStorage.setItem(ORDERING_ENTRY_STORAGE_KEY, JSON.stringify(entry));
      return;
    }
    window.sessionStorage.removeItem(ORDERING_ENTRY_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private or embedded contexts; Pinia still
    // keeps the handoff alive for the current app session.
  }
};

export const useOrderingHandoffStore = defineStore("orderingHandoff", () => {
  const orderingEntry = ref<OrderingEntryPayload | null>(readStoredOrderingEntry());
  const hasOrderingEntry = computed(() => orderingEntry.value !== null);

  const setOrderingEntry = (entry: OrderingEntryPayload): void => {
    const normalized = normalizeOrderingEntryPayload(entry);
    orderingEntry.value = normalized;
    writeStoredOrderingEntry(normalized);
  };

  const clearOrderingEntry = (): void => {
    orderingEntry.value = null;
    writeStoredOrderingEntry(null);
  };

  const reloadOrderingEntry = (): void => {
    orderingEntry.value = readStoredOrderingEntry();
  };

  return {
    orderingEntry,
    hasOrderingEntry,
    setOrderingEntry,
    clearOrderingEntry,
    reloadOrderingEntry,
  };
});
