import { getUserTelemetryEventContract } from "../telemetry/user-event-registry";

export type FactEventReferenceGroup = {
  factName: string;
  eventNames: readonly string[];
  eventVersion?: number;
  requiredBIUsage?: string;
  allowDeprecated?: boolean;
};

export type FactEventReferenceIssue = {
  factName: string;
  eventName: string;
  eventVersion: number;
  reason: "unregistered" | "deprecated" | "missing_bi_usage";
};

export const getFactEventReferenceIssues = (
  groups: readonly FactEventReferenceGroup[],
): FactEventReferenceIssue[] => {
  const issues: FactEventReferenceIssue[] = [];

  for (const group of groups) {
    const eventVersion = group.eventVersion ?? 1;
    for (const eventName of group.eventNames) {
      const contract = getUserTelemetryEventContract(eventName, eventVersion);
      if (!contract) {
        issues.push({
          factName: group.factName,
          eventName,
          eventVersion,
          reason: "unregistered",
        });
        continue;
      }

      if (contract.deprecated && !group.allowDeprecated) {
        issues.push({
          factName: group.factName,
          eventName,
          eventVersion,
          reason: "deprecated",
        });
      }

      if (
        group.requiredBIUsage &&
        !contract.biUsage.includes(group.requiredBIUsage)
      ) {
        issues.push({
          factName: group.factName,
          eventName,
          eventVersion,
          reason: "missing_bi_usage",
        });
      }
    }
  }

  return issues;
};

export const assertFactEventReferences = (
  groups: readonly FactEventReferenceGroup[],
): void => {
  const issues = getFactEventReferenceIssues(groups);
  if (issues.length === 0) return;

  const detail = issues
    .map(
      (issue) =>
        `${issue.factName}: ${issue.eventName}@${issue.eventVersion} ${issue.reason}`,
    )
    .join("; ");
  throw new Error(`Invalid BI fact event references: ${detail}`);
};
