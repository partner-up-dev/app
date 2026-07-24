# `8-3` Verification Plan

- model/editor unit tests with request-body parity fixtures;
- query/command adapter tests where cache effects are touched;
- TypeScript negative guard: models cannot import `queries`, `lib/rpc` or
  `lib/admin-rpc`;
- architecture fitness twice;
- Web SCC inventory;
- `pnpm test:unit:web`;
- `pnpm check:type`;
- `pnpm check:build`; and
- only affected Admin Commerce, PR Type and Ordering System scenarios.
