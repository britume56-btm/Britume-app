-- Run only against a disposable Supabase-compatible test database after the
-- foundation schema and 20261007060000_social_chat_phase1.sql are installed.
-- Every fixture and assertion is rolled back when the script succeeds.
begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'social-chat-test-a@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"phone":"+267-PRIVATE-A"}'::jsonb,
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111112',
    'authenticated',
    'authenticated',
    'social-chat-test-b@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"phone":"+267-PRIVATE-B"}'::jsonb,
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111113',
    'authenticated',
    'authenticated',
    'social-chat-test-outsider@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '11111111-1111-4111-8111-111111111114',
    'authenticated',
    'authenticated',
    'social-chat-test-new-profile@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"phone":"+267-PRIVATE-NEW"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, username, display_name, phone)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'rls_alpha',
    'Alpha Member',
    '+267-PRIVATE-A'
  ),
  (
    '11111111-1111-4111-8111-111111111112',
    'rls_beta',
    'Beta Member',
    '+267-PRIVATE-B'
  ),
  (
    '11111111-1111-4111-8111-111111111113',
    'rls_outsider',
    'Outside Member',
    null
  )
on conflict (id) do update
set username = excluded.username,
    display_name = excluded.display_name,
    phone = excluded.phone;

insert into public.posts (id, author_id, body)
values (
  '22222222-2222-4222-8222-222222222221',
  '11111111-1111-4111-8111-111111111111',
  'Original owner post'
)
on conflict (id) do nothing;

insert into public.direct_conversations (
  id,
  member_a,
  member_b,
  created_by
)
values (
  '33333333-3333-4333-8333-333333333331',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111111'
)
on conflict (id) do nothing;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

do $test$
declare
  first_conversation uuid;
begin
  if (select count(*) from public.search_public_profiles('beta')) <> 1 then
    raise exception 'public profile search should return the matching safe profile';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_profiles'
      and column_name in ('phone', 'avatar_path', 'avatar_url')
  ) then
    raise exception 'private phone/avatar fields must not appear in public profiles';
  end if;

  if (select count(*) from public.profiles) <> 1 then
    raise exception 'a signed-in user must only read their own private profile row';
  end if;

  insert into public.follows (follower_id, following_id)
  values (
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111112'
  );

  if (select count(*) from public.follows) <> 1 then
    raise exception 'a user must be able to follow another public profile';
  end if;

  begin
    insert into public.follows (follower_id, following_id)
    values (
      '11111111-1111-4111-8111-111111111112',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'a user must not create a follow for another account';
  exception
    when insufficient_privilege then null;
  end;

  update public.posts
  set body = 'Edited by owner'
  where id = '22222222-2222-4222-8222-222222222221';

  if (select body from public.posts where id = '22222222-2222-4222-8222-222222222221')
     <> 'Edited by owner' then
    raise exception 'the author must be able to edit their own post';
  end if;
  insert into public.posts (author_id, body)
  values ('11111111-1111-4111-8111-111111111111', 'Created through row security');
  if not exists (
    select 1 from public.posts
    where author_id = auth.uid() and body = 'Created through row security'
  ) then
    raise exception 'a user must be able to create their own post';
  end if;

  first_conversation := public.get_or_create_direct_conversation(
    '11111111-1111-4111-8111-111111111112'
  );
  if first_conversation <> public.get_or_create_direct_conversation(
    '11111111-1111-4111-8111-111111111112'
  ) then
    raise exception 'starting the same direct conversation must be idempotent';
  end if;
  if first_conversation <> '33333333-3333-4333-8333-333333333331'::uuid then
    raise exception 'direct conversation creation must reuse the existing member pair';
  end if;
  if (select count(*) from public.list_direct_conversations()) <> 1 then
    raise exception 'a member must see their own direct conversation';
  end if;

  begin
    perform public.get_or_create_direct_conversation(
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'users must not open a direct conversation with themselves';
  exception
    when invalid_parameter_value then null;
  end;
end
$test$;

insert into public.messages (
  id,
  conversation_id,
  sender_id,
  body
)
values (
  '44444444-4444-4444-8444-444444444441',
  '33333333-3333-4333-8333-333333333331',
  '11111111-1111-4111-8111-111111111111',
  'Private test message'
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111112',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111112","role":"authenticated"}',
  true
);

do $test$
begin
  if (select count(*) from public.messages) <> 1 then
    raise exception 'both direct conversation members must read message history';
  end if;
  update public.posts
  set body = 'Unauthorized edit'
  where id = '22222222-2222-4222-8222-222222222221';
  if (select body from public.posts where id = '22222222-2222-4222-8222-222222222221')
     <> 'Edited by owner' then
    raise exception 'a user must not edit another account post';
  end if;
  delete from public.posts
  where id = '22222222-2222-4222-8222-222222222221';
  if not exists (
    select 1 from public.posts
    where id = '22222222-2222-4222-8222-222222222221'
  ) then
    raise exception 'a user must not delete another account post';
  end if;

  if (select unread_count from public.list_direct_conversations()) <> 1 then
    raise exception 'incoming messages must contribute to unread state';
  end if;

  perform public.mark_direct_conversation_read(
    '33333333-3333-4333-8333-333333333331'
  );

  if (select unread_count from public.list_direct_conversations()) <> 0 then
    raise exception 'marking a conversation read must clear its unread count';
  end if;

  insert into public.post_likes (
    post_id,
    user_id
  )
  values (
    '22222222-2222-4222-8222-222222222221',
    '11111111-1111-4111-8111-111111111112'
  );

  insert into public.post_comments (post_id, author_id, body)
  values (
    '22222222-2222-4222-8222-222222222221',
    '11111111-1111-4111-8111-111111111112',
    'A permitted comment'
  );

  if not exists (
    select 1
    from public.social_post_metrics(
      array['22222222-2222-4222-8222-222222222221'::uuid]
    )
    where like_count = 1 and comment_count = 1 and liked_by_me
  ) then
    raise exception 'social engagement counts must respect the current user';
  end if;
end
$test$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111114',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111114","role":"authenticated"}',
  true
);

do $test$
begin
  perform public.ensure_own_public_profile();
  if (select phone from public.profiles where id = auth.uid()) <> '+267-PRIVATE-NEW' then
    raise exception 'a new social/chat user profile must retain private phone data privately';
  end if;
  if not exists (
    select 1 from public.public_profiles
    where id = auth.uid() and display_name = 'BRITUME User'
  ) then
    raise exception 'a new social/chat user must get a safe public profile row';
  end if;
end
$test$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111113',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111113","role":"authenticated"}',
  true
);

do $test$
begin
  if (select count(*) from public.direct_conversations) <> 0 then
    raise exception 'non-members must not see direct conversations';
  end if;
  if (select count(*) from public.messages) <> 0 then
    raise exception 'non-members must not read direct message history';
  end if;
  begin
    insert into public.messages (conversation_id, sender_id, body)
    values (
      '33333333-3333-4333-8333-333333333331',
      '11111111-1111-4111-8111-111111111113',
      'Unauthorized message'
    );
    raise exception 'non-members must not send messages to another conversation';
  exception
    when insufficient_privilege then null;
  end;
end
$test$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

insert into public.message_hides (message_id, user_id)
values (
  '44444444-4444-4444-8444-444444444441',
  '11111111-1111-4111-8111-111111111111'
);

do $test$
begin
  if (select count(*) from public.messages) <> 0 then
    raise exception 'a hidden message must disappear from the hiding user history';
  end if;
end
$test$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111112',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111112","role":"authenticated"}',
  true
);

do $test$
begin
  if (select count(*) from public.messages) <> 1 then
    raise exception 'removing a message for oneself must not delete the other copy';
  end if;
end
$test$;

rollback;
