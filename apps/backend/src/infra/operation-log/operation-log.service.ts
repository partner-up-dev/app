/**
 * Operation Log Service (INFRA-05).
 *
 * Provides a fire-and-forget `log()` method for recording domain actions.
 * Write failures are caught and logged to stderr — they never propagate
 * to the caller.
 */

import { OperationLogRepository } from "./operation-log.repository";
import type { OperationResultStatus } from "../../entities/operation-log";

const repo = new OperationLogRepository();

export interface OperationLogEntry {
  actorId: string | null;
  action: string;
  aggregateType: string;
  aggregateId: string;
  detail?: Record<string, unknown>;
  resultStatus?: OperationResultStatus;
}

class OperationLogServiceImpl {
  /**
   * Record an operation. This is fire-and-forget — errors are swallowed
   * and logged so they never disrupt the primary business flow.
   */
  log(entry: OperationLogEntry): void {
    void this.writeAsync(entry);
  }

  private async writeAsync(entry: OperationLogEntry): Promise<void> {
    try {
      await repo.insert({
        actorId: entry.actorId,
        action: entry.action,
        aggregateType: entry.aggregateType,
        aggregateId: entry.aggregateId,
        detail: entry.detail ?? {},
        resultStatus: entry.resultStatus ?? "success",
      });
    } catch (err) {
      console.error("[OperationLog] Failed to write log:", err);
    }
  }

  /** Query logs for an aggregate (for admin / debugging). */
  async queryByAggregate(aggregateType: string, aggregateId: string, limit?: number) {
    return repo.findByAggregate(aggregateType, aggregateId, limit);
  }

  async queryByAction(aggregateType: string, action: string, limit?: number) {
    return repo.findByAction(aggregateType, action, limit);
  }
}

/** Singleton operation log service. */
export const operationLogService = new OperationLogServiceImpl();
