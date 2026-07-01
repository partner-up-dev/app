update bill_lines
set
  settled_at = created_at,
  payment_provider_instance_id = null
where kind = 'CHARGE'
  and amount_fen = 0
  and settled_at is null;
