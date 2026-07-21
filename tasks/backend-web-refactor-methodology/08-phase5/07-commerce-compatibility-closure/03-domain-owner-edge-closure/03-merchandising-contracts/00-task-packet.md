# 5-6A.3.3 Merchandising Contracts

## Status

**Complete.** Controller imports were the visible surface; the AST audit found five admin mutation use cases and six
Trade source files consuming the Merchandising root. Their pure SKU, pricing, catalog, and placement-binding facts
now use stable Merchandising Contracts rather than a wildcard root.

## Chosen Direction

Move pure model types, structural guards, and validation/binding rules into the Merchandising stable contracts
surface. Do not forward type exports from an application use case if that makes an entity/model point back into a
use case. Commands and queries remain for actual Merchandising writes and canonical reads respectively.

## Verification

- target AST owner-root edges are gone;
- backend typecheck plus scoped lint pass;
- affected offer/admin scenario remains green;
- entity imports remain direct to pure model types where that is the smaller, non-cycle dependency.
