import type { NotificationOwner } from "./notification-owner.service";

let owner: NotificationOwner | null = null;

/** Internal composition seam; it is intentionally not re-exported by the domain root. */
export const configureNotificationOwner = (configuredOwner: NotificationOwner): void => {
  owner = configuredOwner;
};

export const getNotificationOwner = (): NotificationOwner => {
  if (!owner) {
    throw new Error("NOTIFICATION_OWNER_NOT_CONFIGURED");
  }
  return owner;
};
