# Deployment Index

## Role In The System

`docs/40-deployment/` is the canonical runtime-truth layer.

It documents environments, rollout flow, observability-relevant runtime facts, and recovery expectations for the deployed system.

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

## How To Read This Layer

1. `environments.md`
2. `rollout.md`
3. `observability.md`
4. `recovery.md`

## How This Layer Connects To Adjacent Layers

- Product TDD may capture only the cross-unit constraints that shape design.
- Deployment docs capture the actual runtime and rollout truth.
- Unit TDD, if it exists, may reference local operational notes, but system rollout and recovery belong here.

## Common Local Mistakes

- mixing deployment workflow with product behavior
- describing an aspirational setup instead of the actual CI/CD path
- burying recovery assumptions inside task-local packets or scripts only
