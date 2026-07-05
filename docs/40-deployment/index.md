# Deployment Index

## Role In The System

`docs/40-deployment/` is the canonical runtime-truth layer.

It documents environments, rollout flow, observability-relevant runtime facts,
and recovery expectations for the deployed system.

## What This Layer Owns

- environment-specific deployment behavior
- CI/CD rollout sequence
- runtime execution model
- observability entrypoints and signals
- failure handling and recovery expectations

## What Must Not Appear Here

- product claims
- technical-unit decomposition rationale
- unit-local code organization
- task-local implementation sequencing
- package API manuals or agent-skill usage details

## How To Read This Layer

1. [environments.md](./environments.md): runtime owner router and branch split
2. [local-development.md](./local-development.md): local portless runtime
3. [backend-runtime.md](./backend-runtime.md): backend FC, DB, and job-runner runtime truth
4. [frontend-runtime.md](./frontend-runtime.md): frontend ESA runtime truth
5. [provider-edge-routing.md](./provider-edge-routing.md): provider callback edge routing
6. [rollout.md](./rollout.md): rollout owner router
7. [ci-gates.md](./ci-gates.md): validation gate topology
8. [backend-rollout.md](./backend-rollout.md): backend and job-runner deploy flow
9. [frontend-rollout.md](./frontend-rollout.md): frontend ESA deploy flow
10. [release-automation.md](./release-automation.md): release metadata and GitHub Release semantics
11. [observability.md](./observability.md): available signals and explicit gaps
12. [recovery.md](./recovery.md): failure recovery routing

## How This Layer Connects To Adjacent Layers

- Product TDD may capture only the cross-unit constraints that shape design.
- Deployment docs capture the actual runtime and rollout truth.
- Unit TDD, if it exists, may reference local operational notes, but system
  rollout and recovery belong here.
- Package-local deployment docs should identify implementation entrypoints and
  link back here for durable runtime and rollout truth.

## Common Local Mistakes

- mixing deployment workflow with product behavior
- describing an aspirational setup instead of the actual CI/CD path
- burying recovery assumptions inside task-local packets or scripts only
- repeating runtime truth in package-local README files without an owner link
