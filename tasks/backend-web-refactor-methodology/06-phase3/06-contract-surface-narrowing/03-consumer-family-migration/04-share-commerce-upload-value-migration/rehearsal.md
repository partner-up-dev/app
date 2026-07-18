# 06C.4 rehearsal — Share/Commerce/Upload value migration

1. Re-run the nine-entry inventory and confirm `ImageUploadPurpose` is exported by the contracts subpath.
2. Move only the two upload type-only imports. Leave all six Share `PRId` imports and the Commerce
   `OrderingOfferDetail` import unchanged.
3. Probe safe-symbol root count (zero in these paths) and exception counts (`PRId` six, `OrderingOfferDetail` one).
4. Run focused upload/share/commerce unit tests, `pnpm check:type:web`, `pnpm check:build:web`, and `git diff --check`.

Stop on a runtime import, a request/response change, or any proposal to replace the explicit compatibility exceptions.
