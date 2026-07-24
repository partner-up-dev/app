import assert from "node:assert/strict";
import { test } from "vitest";
import * as joinGateOwner from "./join-gate";
import * as meetingPointOwner from "./meeting-point";
import * as partnerRequestOwner from "./partner-request";
import * as joinGateCompatibility from "../../../entities/join-gate";
import * as meetingPointCompatibility from "../../../entities/meeting-point";
import * as partnerRequestCompatibility from "../../../entities/partner-request";

test("entity compatibility exports preserve PR owner schema identity", () => {
  const ownerCompatibilityPairs: ReadonlyArray<readonly [unknown, unknown]> = [
    [joinGateCompatibility.prJoinGateSourceSchema, joinGateOwner.prJoinGateSourceSchema],
    [
      joinGateCompatibility.prJoinNoticeGateConfigSchema,
      joinGateOwner.prJoinNoticeGateConfigSchema,
    ],
    [joinGateCompatibility.prJoinGateConfigItemSchema, joinGateOwner.prJoinGateConfigItemSchema],
    [joinGateCompatibility.prJoinGateConfigSchema, joinGateOwner.prJoinGateConfigSchema],
    [joinGateCompatibility.normalizePRJoinGateConfig, joinGateOwner.normalizePRJoinGateConfig],
    [
      meetingPointCompatibility.meetingPointConfigSchema,
      meetingPointOwner.meetingPointConfigSchema,
    ],
    [
      meetingPointCompatibility.meetingPointConfigMapSchema,
      meetingPointOwner.meetingPointConfigMapSchema,
    ],
    [
      meetingPointCompatibility.normalizeMeetingPointConfig,
      meetingPointOwner.normalizeMeetingPointConfig,
    ],
    [
      meetingPointCompatibility.normalizeMeetingPointConfigMap,
      meetingPointOwner.normalizeMeetingPointConfigMap,
    ],
    [partnerRequestCompatibility.coordinatePairSchema, partnerRequestOwner.coordinatePairSchema],
    [partnerRequestCompatibility.prRoutePointSchema, partnerRequestOwner.prRoutePointSchema],
    [partnerRequestCompatibility.prRouteSchema, partnerRequestOwner.prRouteSchema],
    [
      partnerRequestCompatibility.prAllowEditAfterReadySchema,
      partnerRequestOwner.prAllowEditAfterReadySchema,
    ],
    [
      partnerRequestCompatibility.partnerRequestFieldsObjectSchema,
      partnerRequestOwner.partnerRequestFieldsObjectSchema,
    ],
    [
      partnerRequestCompatibility.partnerRequestFieldsSchema,
      partnerRequestOwner.partnerRequestFieldsSchema,
    ],
    [
      partnerRequestCompatibility.naturalLanguagePartnerRequestFieldsObjectSchema,
      partnerRequestOwner.naturalLanguagePartnerRequestFieldsObjectSchema,
    ],
    [
      partnerRequestCompatibility.naturalLanguagePartnerRequestFieldsSchema,
      partnerRequestOwner.naturalLanguagePartnerRequestFieldsSchema,
    ],
    [partnerRequestCompatibility.prStatusSchema, partnerRequestOwner.prStatusSchema],
    [partnerRequestCompatibility.prStatusManualSchema, partnerRequestOwner.prStatusManualSchema],
    [
      partnerRequestCompatibility.visibilityStatusSchema,
      partnerRequestOwner.visibilityStatusSchema,
    ],
    [
      partnerRequestCompatibility.createPRStructuredStatusSchema,
      partnerRequestOwner.createPRStructuredStatusSchema,
    ],
    [
      partnerRequestCompatibility.createStructuredPRSchema,
      partnerRequestOwner.createStructuredPRSchema,
    ],
    [
      partnerRequestCompatibility.createNaturalLanguagePRSchema,
      partnerRequestOwner.createNaturalLanguagePRSchema,
    ],
  ];

  for (const [compatibilityExport, ownerExport] of ownerCompatibilityPairs) {
    assert.strictEqual(compatibilityExport, ownerExport);
  }
});
