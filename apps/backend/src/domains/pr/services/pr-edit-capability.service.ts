import { throwHttpProblem } from "../../../lib/problem-details";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { PartnerRequestFields, PRAllowEditAfterReady } from "../contracts/partner-request";
import { parseTimeWindowDate } from "./time-window.service";

export type PREditableField =
  | "title"
  | "time"
  | "location"
  | "route"
  | "minPartners"
  | "maxPartners"
  | "preferences"
  | "notes"
  | "meetingPoint";

export type PREditCapability = {
  canEdit: boolean;
  editableFields: PREditableField[];
  constraints: {
    timeWindow?: [string, string];
  };
};

export type PREditPostReadyCapability = {
  editableFields: PREditableField[];
  constraints: {
    timeWindow?: [string, string];
  };
};

const OPEN_EDITABLE_FIELDS: PREditableField[] = [
  "title",
  "time",
  "location",
  "route",
  "minPartners",
  "maxPartners",
  "preferences",
  "notes",
  "meetingPoint",
];

const valuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const timeWindowsEqual = (
  left: [string | null, string | null],
  right: [string | null, string | null],
): boolean => left[0] === right[0] && left[1] === right[1];

const resolveReadyEditableFields = (policy: PRAllowEditAfterReady | null): PREditableField[] => {
  if (!policy) return [];
  const fields: PREditableField[] = [];
  if (policy.timeWindow) fields.push("time");
  if (policy.location) fields.push("location");
  if (policy.route) fields.push("route");
  return fields;
};

export const buildPREditPostReadyCapability = (
  policy: PRAllowEditAfterReady | null,
): PREditPostReadyCapability => ({
  editableFields: resolveReadyEditableFields(policy),
  constraints: policy?.timeWindow ? { timeWindow: policy.timeWindow } : {},
});

export const buildPREditCapability = (
  request: PartnerRequest,
  viewerUserId: UserId | null,
): PREditCapability => {
  if (!viewerUserId || request.createdBy !== viewerUserId) {
    return { canEdit: false, editableFields: [], constraints: {} };
  }

  if (request.status === "DRAFT" || request.status === "OPEN") {
    return {
      canEdit: true,
      editableFields: OPEN_EDITABLE_FIELDS,
      constraints: {},
    };
  }

  if (request.status === "READY") {
    const postReadyCapability = buildPREditPostReadyCapability(request.allowEditAfterReady);
    return {
      canEdit: postReadyCapability.editableFields.length > 0,
      editableFields: postReadyCapability.editableFields,
      constraints: postReadyCapability.constraints,
    };
  }

  return { canEdit: false, editableFields: [], constraints: {} };
};

export const resolveChangedPRContentFields = (
  request: PartnerRequest,
  fields: PartnerRequestFields,
): PREditableField[] => {
  const changed: PREditableField[] = [];
  if ((request.title ?? undefined) !== fields.title) changed.push("title");
  if (!timeWindowsEqual(request.time, fields.time)) changed.push("time");
  if (request.location !== fields.location) changed.push("location");
  if (!valuesEqual(request.route, fields.route)) changed.push("route");
  if (request.minPartners !== fields.minPartners) changed.push("minPartners");
  if (request.maxPartners !== fields.maxPartners) changed.push("maxPartners");
  if (!valuesEqual(request.preferences, fields.preferences)) {
    changed.push("preferences");
  }
  if (request.notes !== fields.notes) changed.push("notes");
  if (!valuesEqual(request.meetingPoint ?? null, fields.meetingPoint ?? null)) {
    changed.push("meetingPoint");
  }
  return changed;
};

const assertTimeWindowWithinPolicy = (
  timeWindow: [string | null, string | null],
  range: [string, string],
): void => {
  const start = parseTimeWindowDate(timeWindow[0]);
  const end = parseTimeWindowDate(timeWindow[1]);
  const rangeStart = parseTimeWindowDate(range[0]);
  const rangeEnd = parseTimeWindowDate(range[1]);

  if (!start || !end || !rangeStart || !rangeEnd) {
    return throwHttpProblem({
      status: 400,
      detail: "PR time window must be concrete when edited after ready",
      code: "POST_READY_TIME_WINDOW_INVALID",
    });
  }

  if (start.getTime() < rangeStart.getTime() || end.getTime() > rangeEnd.getTime()) {
    return throwHttpProblem({
      status: 400,
      detail: "PR time window is outside the editable-after-ready range",
      code: "POST_READY_TIME_WINDOW_OUT_OF_RANGE",
    });
  }
};

export const assertPRContentEditable = (params: {
  request: PartnerRequest;
  fields: PartnerRequestFields;
  changedFields: PREditableField[];
  bypassEditableStatusGuard?: boolean;
}): void => {
  if (params.bypassEditableStatusGuard) return;

  const { request, fields, changedFields } = params;
  if (request.status === "DRAFT" || request.status === "OPEN") return;

  if (request.status !== "READY") {
    return throwHttpProblem({
      status: 400,
      detail: "Cannot edit - partner request is not editable in this status",
      code: "PR_CONTENT_NOT_EDITABLE",
    });
  }

  const capability = buildPREditCapability(request, request.createdBy);
  const disallowed = changedFields.filter((field) => !capability.editableFields.includes(field));
  if (disallowed.length > 0) {
    return throwHttpProblem({
      status: 400,
      detail: "Cannot edit - field is not editable after ready",
      code: "POST_READY_FIELD_NOT_EDITABLE",
    });
  }

  if (changedFields.includes("time")) {
    const range = request.allowEditAfterReady?.timeWindow;
    if (!range) {
      return throwHttpProblem({
        status: 400,
        detail: "Cannot edit - time window is not editable after ready",
        code: "POST_READY_FIELD_NOT_EDITABLE",
      });
    }
    assertTimeWindowWithinPolicy(fields.time, range);
  }
};
