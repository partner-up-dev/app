# Current Evidence And Decision Basis

Rental is not a complete primary product capability: the PRD capability, scope, glossary, and Commerce vocabulary
do not define it as such. Yet current source still creates active Rental orders, Bills, and `rental_orders` rows;
exposes customer booking confirmation; and exposes Admin Fulfillment mutations. It cannot safely be treated as an
unused fixture.

The current payment-side Rental consequence only reports that booking state was activated; it does not actually
transition the booking state. That strengthens the case for stopping new traffic rather than extending an undefined
fulfillment model. Sir additionally reports that production has no Rental orders. This permits a runtime clean
cut-off without a historical behavior migration, but does not itself authorize physical data deletion.

The user-facing and Admin write surfaces are distinct from generic Order/Bill reads. R0 can therefore remove all
Rental write behavior and the Trade→Fulfillment runtime edge without a physical deletion migration.
