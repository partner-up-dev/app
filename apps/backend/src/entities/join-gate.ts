// Compatibility surface: PR value contracts are owned by the PR domain.
export {
  normalizePRJoinGateConfig,
  prJoinGateConfigItemSchema,
  prJoinGateConfigSchema,
  prJoinGateSourceSchema,
  prJoinNoticeGateConfigSchema,
} from "../domains/pr/contracts/join-gate";
export type {
  PRJoinGateConfig,
  PRJoinGateConfigItem,
  PRJoinGateSource,
  PRJoinNoticeGateConfig,
} from "../domains/pr/contracts/join-gate";
