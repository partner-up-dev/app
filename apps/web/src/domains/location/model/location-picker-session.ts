import type { PickedLocation } from "./location-picker";
import {
  parsePickedLocation,
  serializePickedLocation,
} from "./location-picker";

const LAST_PICKED_LOCATION_KEY = "partner-up:location-picker:last-result";

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage;
};

export const saveLastPickedLocation = (location: PickedLocation): void => {
  getSessionStorage()?.setItem(
    LAST_PICKED_LOCATION_KEY,
    serializePickedLocation(location),
  );
};

export const readLastPickedLocation = (): PickedLocation | null => {
  const value = getSessionStorage()?.getItem(LAST_PICKED_LOCATION_KEY);
  return value ? parsePickedLocation(value) : null;
};

export const clearLastPickedLocation = (): void => {
  getSessionStorage()?.removeItem(LAST_PICKED_LOCATION_KEY);
};
