# 4-4.2 Execution Plan

Represent every retained input needed for safe UI continuation, validate old/malformed payloads conservatively, and
pass the matching typed action to the registered handler. Clear immediately before handler invocation, keep failure
non-retrying, and retain matching-PR/handler-ready guards.
