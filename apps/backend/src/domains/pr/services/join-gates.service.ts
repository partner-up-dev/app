import type { PartnerId, PartnerRequest, PRId, UserId } from "../../../entities";
import { ProblemDetailsError, throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRJoinNoticeAcceptanceRepository } from "../../../repositories/PRJoinNoticeAcceptanceRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import {
  normalizePRJoinGateConfig,
  type PRJoinGateConfig,
  type PRJoinGateConfigItem,
  type PRJoinGateSource,
  prJoinNoticeGateConfigSchema,
} from "../contracts/join-gate";
import { assertPRDraftAccess, type PRDraftActor } from "./draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const noticeAcceptanceRepo = new PRJoinNoticeAcceptanceRepository();

export const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
export const JOIN_GATE_NOT_FOUND_CODE = "PR_JOIN_GATE_NOT_FOUND";
export const JOIN_NOTICE_ACCEPTANCE_REQUIRED_CODE = "JOIN_NOTICE_ACCEPTANCE_REQUIRED";

export type PRJoinGateProjectionItem = {
  key: string;
  kind: "JOIN_NOTICE";
  version: string;
  title: string;
  body: string;
  resolved: boolean;
};

export type PRJoinGateProjection = {
  gates: PRJoinGateProjectionItem[];
};

export type ResolveJoinGatePayload = {
  kind: "JOIN_NOTICE";
  version: string;
  accepted: true;
};

const withSource = (gates: PRJoinGateConfig, source: PRJoinGateSource): PRJoinGateConfig =>
  gates.map((gate) => ({
    ...gate,
    source,
  }));

const dedupeGateConfig = (gates: PRJoinGateConfig): PRJoinGateConfig => {
  const byIdentity = new Map<string, PRJoinGateConfigItem>();
  for (const gate of gates) {
    // A PR-level gate is an explicit override of the current type-config gate
    // with the same acceptance key. Keep one acceptance-content identity.
    byIdentity.set(`${gate.kind}:${gate.key}`, gate);
  }
  return Array.from(byIdentity.values());
};

export const buildMaterializedPRJoinGateConfig = (input: {
  prTypeConfig?: { joinGateConfig: PRJoinGateConfig } | null;
  prGates?: PRJoinGateConfig;
}): PRJoinGateConfig => {
  const configGates = input.prTypeConfig
    ? withSource(normalizePRJoinGateConfig(input.prTypeConfig.joinGateConfig), "PR_TYPE_CONFIG")
    : [];
  const prGates = withSource(normalizePRJoinGateConfig(input.prGates ?? []), "PR");

  return dedupeGateConfig([...configGates, ...prGates]);
};

const getGateByKey = (config: PRJoinGateConfig, gateKey: string): PRJoinGateConfigItem | null =>
  config.find((gate) => gate.key === gateKey) ?? null;

const isJoinNoticeGateResolved = async (input: {
  prId: PRId;
  viewerUserId: UserId | null;
  gateKey: string;
  gateVersion: string;
}): Promise<boolean> => {
  if (!input.viewerUserId) return false;
  const acceptance = await noticeAcceptanceRepo.find({
    prId: input.prId,
    userId: input.viewerUserId,
    gateKey: input.gateKey,
    gateVersion: input.gateVersion,
  });
  return acceptance !== null;
};

/**
 * Admission transactions already own a locked PR snapshot. This narrow query
 * reuses that snapshot and executor instead of reopening a global read through
 * the public projection path.
 */
export const arePRJoinGatesResolvedForUser = async (input: {
  request: Pick<PartnerRequest, "id" | "joinGateConfig">;
  userId: UserId;
  executor: RepositoryExecutor;
}): Promise<boolean> => {
  const config = normalizePRJoinGateConfig(input.request.joinGateConfig);
  const repository = new PRJoinNoticeAcceptanceRepository(input.executor);
  for (const gate of config) {
    if (gate.kind !== "JOIN_NOTICE") {
      return false;
    }
    const acceptance = await repository.find({
      prId: input.request.id,
      userId: input.userId,
      gateKey: gate.key,
      gateVersion: gate.version,
    });
    if (!acceptance) {
      return false;
    }
  }
  return true;
};

export const getPRJoinGateProjection = async (input: {
  prId: PRId;
  viewerUserId: UserId | null;
  actor?: PRDraftActor;
}): Promise<PRJoinGateProjection> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  assertPRDraftAccess({
    request,
    actor: input.actor ?? { userId: input.viewerUserId, roles: ["anonymous"] },
    operation: "participant-flow",
  });

  const config = normalizePRJoinGateConfig(request.joinGateConfig);

  const gates = await Promise.all(
    config.map(
      async (gate): Promise<PRJoinGateProjectionItem> => ({
        key: gate.key,
        kind: gate.kind,
        version: gate.version,
        title: gate.title,
        body: gate.body,
        resolved: await isJoinNoticeGateResolved({
          prId: input.prId,
          viewerUserId: input.viewerUserId,
          gateKey: gate.key,
          gateVersion: gate.version,
        }),
      }),
    ),
  );

  return { gates };
};

export const assertPRJoinGatesResolvedForUser = async (input: {
  prId: PRId;
  userId: UserId;
  actor?: PRDraftActor;
}): Promise<void> => {
  const projection = await getPRJoinGateProjection({
    prId: input.prId,
    viewerUserId: input.userId,
    actor: input.actor,
  });
  const unresolvedGate = projection.gates.find((gate) => !gate.resolved);

  if (!unresolvedGate) {
    return;
  }

  throw new ProblemDetailsError({
    status: 400,
    type: "https://partner-up.app/problems/pr.join_gate.unresolved",
    code: PR_JOIN_GATE_UNRESOLVED_CODE,
    localizedText: {
      zhCN: {
        title: "请先完成加入前置项",
        detail: "加入前需要先完成加入须知。",
      },
      enUS: {
        title: "Join prerequisites required",
        detail: "Please complete the join notice before joining.",
      },
    },
  });
};

export const resetPRJoinGateResolutionsForUser = async (input: {
  prId: PRId;
  userId: UserId;
  partnerId: PartnerId;
}): Promise<void> => {
  await noticeAcceptanceRepo.deleteByPrIdAndUserId({
    prId: input.prId,
    userId: input.userId,
  });
};

const throwCodedHttpException = (
  status: 400 | 403 | 404 | 409,
  message: string,
  code: string,
): never => {
  return throwHttpProblem({ status, detail: message, code });
};

export const resolvePRJoinGate = async (input: {
  prId: PRId;
  gateKey: string;
  viewerUserId: UserId;
  actor?: PRDraftActor;
  payload: ResolveJoinGatePayload;
}): Promise<PRJoinGateProjection> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  assertPRDraftAccess({
    request,
    actor: input.actor ?? { userId: input.viewerUserId, roles: ["anonymous"] },
    operation: "participant-flow",
  });

  const config = normalizePRJoinGateConfig(request.joinGateConfig);
  const gate = getGateByKey(config, input.gateKey);
  if (!gate) {
    return throwCodedHttpException(404, "Join gate not found", JOIN_GATE_NOT_FOUND_CODE);
  }

  if (gate.kind !== input.payload.kind || gate.version !== input.payload.version) {
    return throwCodedHttpException(
      400,
      "Join gate payload does not match current gate",
      JOIN_GATE_NOT_FOUND_CODE,
    );
  }

  const parsed = prJoinNoticeGateConfigSchema.parse(gate);
  if (!input.payload.accepted) {
    return throwCodedHttpException(
      400,
      "Join notice acceptance is required",
      JOIN_NOTICE_ACCEPTANCE_REQUIRED_CODE,
    );
  }
  await noticeAcceptanceRepo.upsert({
    prId: input.prId,
    userId: input.viewerUserId,
    gateKey: parsed.key,
    gateVersion: parsed.version,
  });

  return await getPRJoinGateProjection({
    prId: input.prId,
    viewerUserId: input.viewerUserId,
    actor: input.actor,
  });
};
