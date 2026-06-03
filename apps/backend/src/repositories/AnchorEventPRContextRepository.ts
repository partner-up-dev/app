import type { AnchorEvent, AnchorEventId, TimeWindowEntry } from "../entities/anchor-event";
import type {
  PRId,
  PRStatus,
  PartnerRequest,
  VisibilityStatus,
} from "../entities/partner-request";
import { AnchorEventRepository } from "./AnchorEventRepository";
import { PartnerRequestRepository } from "./PartnerRequestRepository";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../domains/pr/services";
import { eventOwnsTimeWindow } from "../domains/anchor-event/services/time-window-pool";

export type AnchorEventPRContext = {
  prId: PRId;
  anchorEventId: AnchorEventId;
  timeWindow: TimeWindowEntry;
  visibilityStatus: VisibilityStatus;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  autoHideAt: Date | null;
  confirmationEnabled: boolean;
};

export type AnchorEventPRContextRecord = {
  root: PartnerRequest;
  anchor: AnchorEventPRContext;
};

const sortRecordsByCreatedAtDesc = (
  left: AnchorEventPRContextRecord,
  right: AnchorEventPRContextRecord,
): number => right.root.createdAt.getTime() - left.root.createdAt.getTime();

const buildAnchorContext = (
  root: PartnerRequest,
  event: AnchorEvent,
): AnchorEventPRContext => {
  return {
    prId: root.id,
    anchorEventId: event.id,
    timeWindow: root.time,
    visibilityStatus: root.visibilityStatus,
    confirmationStartOffsetMinutes:
      root.confirmationStartOffsetMinutes ??
      DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    confirmationEndOffsetMinutes:
      root.confirmationEndOffsetMinutes ??
      DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    joinLockOffsetMinutes:
      root.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    autoHideAt: null,
    confirmationEnabled: root.confirmationEnabled,
  };
};

const isRecordVisible = (root: PartnerRequest): boolean =>
  root.visibilityStatus === "VISIBLE";

export class AnchorEventPRContextRepository {
  private readonly prRootRepo = new PartnerRequestRepository();

  private readonly eventRepo = new AnchorEventRepository();

  private async buildRecordForRequest(
    root: PartnerRequest,
  ): Promise<AnchorEventPRContextRecord | null> {
    const event = await this.eventRepo.findOneByType(root.type);
    if (!event) {
      return null;
    }

    return { root, anchor: buildAnchorContext(root, event) };
  }

  private async listRecordsByEventAndTimeWindow(
    eventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
    options: { visibleOnly: boolean; location?: string } = { visibleOnly: true },
  ): Promise<AnchorEventPRContextRecord[]> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      return [];
    }
    if (!eventOwnsTimeWindow(event, timeWindow)) {
      return [];
    }

    const roots = await this.prRootRepo.findByTypeAndTime(event.type, timeWindow);

    const records = roots.flatMap((root) => {
      if (options.visibleOnly && !isRecordVisible(root)) {
        return [];
      }
      if (
        options.location !== undefined &&
        (root.location?.trim() ?? "") !== options.location
      ) {
        return [];
      }

      const anchor = buildAnchorContext(root, event);
      return [{ root, anchor }];
    });

    return records.sort(sortRecordsByCreatedAtDesc);
  }

  async findByPrId(prId: PRId): Promise<AnchorEventPRContext | null> {
    const record = await this.findRecordByPrId(prId);
    return record?.anchor ?? null;
  }

  async findRecordByPrId(prId: PRId): Promise<AnchorEventPRContextRecord | null> {
    const root = await this.prRootRepo.findById(prId);
    if (!root) {
      return null;
    }

    return this.buildRecordForRequest(root);
  }

  async findVisibleByAnchorEventAndTimeWindow(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
  ): Promise<AnchorEventPRContextRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: true,
    });
  }

  async findByAnchorEventAndTimeWindow(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
  ): Promise<AnchorEventPRContextRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: false,
    });
  }

  async findVisibleByAnchorEventTimeWindowAndLocation(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
    location: string,
  ): Promise<AnchorEventPRContextRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: true,
      location,
    });
  }

  async countActiveVisibleByEventTimeWindowAndLocation(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
    location: string,
  ): Promise<number> {
    const records = await this.findVisibleByAnchorEventTimeWindowAndLocation(
      anchorEventId,
      timeWindow,
      location,
    );
    return records.filter((record) => {
      return record.root.status !== "CLOSED" && record.root.status !== "EXPIRED";
    }).length;
  }

  async findByRootStatuses(statuses: PRStatus[]): Promise<AnchorEventPRContextRecord[]> {
    if (statuses.length === 0) {
      return [];
    }

    const roots = await this.prRootRepo.findByStatuses(statuses);
    const records = await Promise.all(
      roots.map((root) => this.buildRecordForRequest(root)),
    );
    const byId = new Map<PRId, AnchorEventPRContextRecord>();
    for (const record of records) {
      if (!record) {
        continue;
      }
      if (!byId.has(record.root.id)) {
        byId.set(record.root.id, record);
      }
    }
    return Array.from(byId.values()).sort(sortRecordsByCreatedAtDesc);
  }

  async findVisibleByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorEventPRContextRecord[]> {
    const event = await this.eventRepo.findById(anchorEventId);
    if (!event) {
      return [];
    }

    const roots = await this.prRootRepo.findVisibleByType(event.type);
    const records = await Promise.all(
      roots.map((root) => this.buildRecordForRequest(root)),
    );

    return records
      .filter(
        (record): record is AnchorEventPRContextRecord =>
          record !== null && record.anchor.anchorEventId === anchorEventId,
      )
      .sort(sortRecordsByCreatedAtDesc);
  }

  async updateVisibilityStatus(
    prId: PRId,
    visibilityStatus: VisibilityStatus,
  ): Promise<void> {
    await this.prRootRepo.updateVisibilityStatus(prId, visibilityStatus);
  }

  async updateParticipationPolicy(
    prId: PRId,
    data: {
      confirmationEnabled: boolean;
      confirmationStartOffsetMinutes: number | null;
      confirmationEndOffsetMinutes: number | null;
      joinLockOffsetMinutes: number | null;
    },
  ): Promise<AnchorEventPRContext | null> {
    const updated = await this.prRootRepo.updatePartnerRules(prId, data);
    if (!updated) {
      return null;
    }
    return this.findByPrId(prId);
  }

}
