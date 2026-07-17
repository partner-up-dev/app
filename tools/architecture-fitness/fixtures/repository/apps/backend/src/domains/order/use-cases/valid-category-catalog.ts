import { refreshCatalog } from "../../catalog/commands";
import type { CatalogReference } from "../../catalog/contracts";
import type { CatalogRefreshed } from "../../catalog/events";
import type { CatalogClock } from "../../catalog/ports";
import { findCatalog } from "../../catalog/queries";

export const catalog = findCatalog();
export const refresh = refreshCatalog;
export type Contract = CatalogReference;
export type Event = CatalogRefreshed;
export type Clock = CatalogClock;
