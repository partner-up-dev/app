# `8-7.1` — Architecture And Authority Review

## Status

**Complete on 2026-07-24.**

## Objective & Hypothesis

Recompute final dependency and authority evidence rather than extrapolating
from slice-local proof.

## Guardrails Touched

- Architecture fitness remains report-first but `new` and `unresolved` must be
  zero.
- The direct WeChat OAuth callback is the only expected path-specific raw-RPC
  exception.
- Dynamic provider-isolation imports are reviewed by meaning, not removed to
  optimize edge count.
- Public contract/root barrels are sampled against the four-category rule;
  green reporter output is not sufficient by itself.

## Verification

- deterministic fitness twice and fitness unit tests;
- Backend/Web static and dynamic-inclusive SCC graphs;
- exact controller/repository, model/query, page RPC and primitive/query
  searches;
- package-contract and compatibility/external ledger review.
