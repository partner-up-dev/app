# 08C Mental Rehearsal

| Observation | Interpretation | Response |
| --- | --- | --- |
| Body contains an identity/token field | Security/versioned-contract defect, not a documentation gap | stop Phase 3 exit and return to runtime owner |
| Header is issued but shared client does not consume it | Cross-unit transport gap | test the common hook; do not add local waitlist handling |
| Existing scenario cannot see response headers | Add the minimum HTTP-level assertion in the Backend scenario kit | preserve production code |
| Full scenario fails outside CF-02 | Establish reproducibility and ownership | do not claim Phase 3 completion |
| Fitness reports new violations | Treat as a real boundary regression | stop promotion and classify by owner |

Final proof must show the public data path and the token transport path are separate, then leave only the named next
program phase as work.
