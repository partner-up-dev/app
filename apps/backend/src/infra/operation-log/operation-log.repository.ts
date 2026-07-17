import { db } from "../../lib/db";
import {
  operationLogs,
  type NewOperationLogRow,
  type OperationLogRow,
} from "../../entities/operation-log";
import { and, desc, eq } from "drizzle-orm";

export class OperationLogRepository {
  async insert(data: NewOperationLogRow): Promise<OperationLogRow> {
    const result = await db.insert(operationLogs).values(data).returning();
    return result[0];
  }

  async findByAggregate(
    aggregateType: string,
    aggregateId: string,
    limit = 50,
  ): Promise<OperationLogRow[]> {
    return db
      .select()
      .from(operationLogs)
      .where(
        and(
          eq(operationLogs.aggregateType, aggregateType),
          eq(operationLogs.aggregateId, aggregateId),
        ),
      )
      .orderBy(desc(operationLogs.createdAt))
      .limit(limit);
  }

  async findByAction(
    aggregateType: string,
    action: string,
    limit = 200,
  ): Promise<OperationLogRow[]> {
    return db
      .select()
      .from(operationLogs)
      .where(and(eq(operationLogs.aggregateType, aggregateType), eq(operationLogs.action, action)))
      .orderBy(desc(operationLogs.createdAt))
      .limit(limit);
  }
}
