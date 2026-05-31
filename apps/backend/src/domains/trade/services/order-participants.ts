import type { OrderParticipantSnapshot } from "../model";

export type OrderParticipantContextSeed = {
  participantId: string;
  userId: string;
  joinedVia: OrderParticipantSnapshot["joinedVia"];
  joinedAt?: string | null;
  removedAt?: string | null;
};

export function buildOrderParticipantsFromContext(input: {
  participants: OrderParticipantContextSeed[];
  createdBy: string;
}): OrderParticipantSnapshot[] {
  return input.participants.map((participant) => ({
    participantId: participant.participantId,
    userId: participant.userId,
    role: participant.userId === input.createdBy ? "CREATOR" : "PARTICIPANT",
    joinedVia: participant.joinedVia,
    joinedAt: participant.joinedAt ?? null,
    removedAt: participant.removedAt ?? null,
  }));
}

export function validateOrderParticipants(input: {
  participants: OrderParticipantSnapshot[];
  createdBy: string;
}): string | null {
  if (input.participants.length === 0) {
    return "Order requires at least one participant";
  }

  const creatorParticipant = input.participants.find(
    (participant) => participant.userId === input.createdBy,
  );
  if (!creatorParticipant) {
    return "Order creator must be included in order participants";
  }
  if (creatorParticipant.role !== "CREATOR") {
    return "Order creator participant must have CREATOR role";
  }

  return null;
}
