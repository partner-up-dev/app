# `7-4C` Rehearsal

1. Resolve the maximum range before writing its validation branch.
2. Implement one pure range resolver and test it before wiring controllers.
3. Test offset-equivalent instants and a product-local day boundary; avoid
   depending on the machine timezone.
4. Map validation failure through the repository's Problem Details boundary,
   not a controller-local exception type.
5. Freeze lifecycle results before replacing any `::timestamp` cast.
6. For each aggregate candidate, compare:
   - transferred row count;
   - SQL/query-plan complexity;
   - pure model complexity;
   - exact output on the `7-4A` fixture.
7. Move only the query whose total dependency/obscurity cost decreases.
8. Preserve Retention's seven-day return lookahead while keeping the cohort
   inside the requested interval.

If SQL aggregation reduces application lines but produces an opaque
multi-purpose query, keep the typed fact reader and pure model. Line count is
not the objective function.
