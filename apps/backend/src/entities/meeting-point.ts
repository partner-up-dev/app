// Compatibility surface: PR value contracts are owned by the PR domain.
export {
  meetingPointConfigMapSchema,
  meetingPointConfigSchema,
  normalizeMeetingPointConfig,
  normalizeMeetingPointConfigMap,
} from "../domains/pr/contracts/meeting-point";
export type {
  MeetingPointConfig,
  MeetingPointConfigMap,
} from "../domains/pr/contracts/meeting-point";
