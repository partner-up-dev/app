update "partner_requests"
set "status" = case
  when "status" = 'LOCKED_TO_START' then 'READY'
  when "status" = 'FULL' then 'OPEN'
  else "status"
end
where "status" in ('LOCKED_TO_START', 'FULL');
