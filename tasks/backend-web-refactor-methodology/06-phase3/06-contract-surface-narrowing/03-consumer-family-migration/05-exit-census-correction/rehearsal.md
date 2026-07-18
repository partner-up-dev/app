# 06C exit-census correction — rehearsal

```text
DateTimeRangePicker type-only root import
    -> contracts import
    -> full root census
        -> only AppType / PRId / OrderingOfferDetail? yes -> focused test + type/build -> 06D entry
        -> another safe type? no  -> add a bounded correction packet; 06D stays blocked
        -> runtime/unclassified import? stop and return it to its owner
```

The expected emitted JavaScript is unchanged because the import is `import type`. A TypeScript resolution or build
failure restores only the original import specifier and returns to package-boundary analysis; it must not be repaired
with a copied local DTO.
