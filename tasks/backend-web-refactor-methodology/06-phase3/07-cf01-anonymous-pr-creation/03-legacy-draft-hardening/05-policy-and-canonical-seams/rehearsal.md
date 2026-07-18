# Rehearsal

For every ordinary ingress, load the row, derive actor from `RequestAuth` roles and userId, then call the policy before
projection, child reads, status details, or writes. `participant-flow` always rejects DRAFT, including the owner.
Public adapters use an anonymous actor. `publishPR` checks before `resolvePublishedCreator`/`setCreatedBy`. No policy
input accepts a client authority flag; admin remains separate.
