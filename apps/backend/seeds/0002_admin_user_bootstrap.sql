insert into users (
  id,
  open_id,
  pin_hash,
  role,
  nickname,
  sex,
  avatar,
  status,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  null,
  '$2b$10$FZDSBj1bRJm7CiD1u1Puju.b1s/D9NpWEBaKM2PHwwl/idcpmf40S',
  ARRAY['service', 'analytics']::text[],
  '运营管理员',
  null,
  null,
  'ACTIVE',
  '2026-03-09 00:00:00'::timestamp,
  '2026-03-09 00:00:00'::timestamp
)
on conflict (id) do update
set
  open_id = excluded.open_id,
  pin_hash = excluded.pin_hash,
  role = excluded.role,
  nickname = excluded.nickname,
  sex = excluded.sex,
  avatar = excluded.avatar,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into user_reliability (
  user_id
)
values (
  '00000000-0000-0000-0000-000000000001'::uuid
)
on conflict (user_id) do nothing;

insert into users (
  id,
  open_id,
  pin_hash,
  role,
  nickname,
  sex,
  avatar,
  status,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000002'::uuid,
  null,
  '$2b$10$auNSGAK22Rb99icLScxQHu6qb9P3uHV1kuyImx3QuOQg5MpgYfRL2',
  ARRAY['analytics']::text[],
  '数据分析员',
  null,
  null,
  'ACTIVE',
  '2026-05-12 00:00:00'::timestamp,
  '2026-05-12 00:00:00'::timestamp
)
on conflict (id) do update
set
  open_id = excluded.open_id,
  pin_hash = excluded.pin_hash,
  role = excluded.role,
  nickname = excluded.nickname,
  sex = excluded.sex,
  avatar = excluded.avatar,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into user_reliability (
  user_id
)
values (
  '00000000-0000-0000-0000-000000000002'::uuid
)
on conflict (user_id) do nothing;

insert into user_notification_opts (
  user_id
)
values (
  '00000000-0000-0000-0000-000000000002'::uuid
)
on conflict (user_id) do nothing;

insert into user_notification_opts (
  user_id
)
values (
  '00000000-0000-0000-0000-000000000001'::uuid
)
on conflict (user_id) do nothing;
