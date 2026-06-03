import { describe, expect, test } from "vitest";
import type { StudySprintParticipantSession } from "../../../entities/study-sprint";
import { reduceFocusEvidence } from "./focus-evidence-reducer";

describe("reduceFocusEvidence", () => {
  test("keeps the maximum credited focus seconds from heartbeat payloads", () => {
    const occurredAt = new Date("2026-06-02T10:05:00.000Z");
    const result = reduceFocusEvidence({
      session: buildSession({
        creditedFocusSeconds: 120,
      }),
      eventType: "HEARTBEAT",
      occurredAt,
      payload: {
        creditedFocusSeconds: 240,
      },
    });

    expect(result.status).toBe("FOCUSING");
    expect(result.creditedFocusSeconds).toBe(240);
    expect(result.lastSeenAt).toBe(occurredAt);
  });

  test("marks completed without leaving the room", () => {
    const occurredAt = new Date("2026-06-02T10:30:00.000Z");
    const result = reduceFocusEvidence({
      session: buildSession({
        targetDurationMinutes: 30,
      }),
      eventType: "COMPLETED",
      occurredAt,
      payload: {
        creditedFocusSeconds: 1800,
      },
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.creditedFocusSeconds).toBe(1800);
    expect(result.completedAt).toBe(occurredAt);
    expect(result.leftAt).toBeNull();
  });

  test("manual leave is distinct from completion", () => {
    const occurredAt = new Date("2026-06-02T10:12:00.000Z");
    const result = reduceFocusEvidence({
      session: buildSession({}),
      eventType: "LEFT",
      occurredAt,
      payload: {
        creditedFocusSeconds: 600,
      },
    });

    expect(result.status).toBe("LEFT");
    expect(result.leftAt).toBe(occurredAt);
    expect(result.completedAt).toBeNull();
  });
});

const buildSession = (
  overrides: Partial<StudySprintParticipantSession>,
): StudySprintParticipantSession => ({
  id: "session-1" as StudySprintParticipantSession["id"],
  roomId: "room-1" as StudySprintParticipantSession["roomId"],
  prId: 1,
  userId: "00000000-0000-4000-8000-000000000001" as StudySprintParticipantSession["userId"],
  partnerId: 1,
  status: "FOCUSING",
  targetDurationMinutes: 30,
  creditedFocusSeconds: 0,
  interruptionSeconds: 0,
  startedAt: new Date("2026-06-02T10:00:00.000Z"),
  completedAt: null,
  leftAt: null,
  lastSeenAt: new Date("2026-06-02T10:00:00.000Z"),
  createdAt: new Date("2026-06-02T10:00:00.000Z"),
  updatedAt: new Date("2026-06-02T10:00:00.000Z"),
  ...overrides,
});
