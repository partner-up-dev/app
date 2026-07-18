# 4-3.4 Callback Authority And Rollout

## Goal

Turn unobserved deployment/control-plane assumptions into an explicit evidence request and release checklist.
This is an exploration/operational subtask; it does not grant permission to change production topology.

## Required Evidence

- current WeChat public-platform OAuth authorized domain and callback configuration;
- deployed production/staging Web/API origin pairs and their redirect chain;
- FC/proxy forwarded host/proto facts used by callback URL logic;
- all direct callback producers/consumers and any legacy frontend route;
- state-free public CORS and credentialed handoff observations from a controlled browser.

## Scope Discipline

Documentation, read-only endpoint/header probes, CI configuration inspection, and a user-provided console capture
are allowed. No provider-console mutation, production configuration change, compatibility retirement, or domain
choice is inferred from a similarly named host.

## Current Status

Still externally blocked on 2026-07-18. No provider-console capture, controlled-browser origin-pair result, or
edge redirect/header trace was available in this slice. This blocks topology change and legacy retirement only; it
does not invalidate the completed local 4-3.1–4-3.3 contract repair.
