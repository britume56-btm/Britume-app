-- BRITUME Phase 1: authenticated SOCIAL and one-to-one CHAT foundations.
-- Apply manually to Supabase after the existing profile schema. This migration
-- creates no buckets and does not change the live project by itself.

-- Keep discoverable fields separate from private profile data (notably phone
-- numbers and avatar object paths).
create table if not exists public.public_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

drop policy if exists "Authenticated users can read public profiles"
  on public.public_profiles;
create policy "Authenticated users can read public profiles"
  on public.public_profiles
  for select
  to authenticated
  using (true);

revoke all on table public.public_profiles from anon, authenticated;
grant select on table public.public_profiles to authenticated;

create or replace function public.sync_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_profiles where id = old.id;
    return old;
  end if;

  insert into public.public_profiles (id, username, display_name, created_at, updated_at)
  values (new.id, new.username, new.display_name, new.created_at, now())
  on conflict (id) do update
  set username = excluded.username,
      display_name = excluded.display_name,
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_public_profile() from public, anon, authenticated;

drop trigger if exists sync_public_profile on public.profiles;
create trigger sync_public_profile
after insert or update or delete on public.profiles
for each row execute function public.sync_public_profile();

insert into public.public_profiles (id, username, display_name, created_at, updated_at)
select id, username, display_name, created_at, updated_at
from public.profiles
on conflict (id) do update
set username = excluded.username,
    display_name = excluded.display_name,
    updated_at = excluded.updated_at;

-- Accounts that have not opened PROFILE yet get a safe, discoverable default
-- identity the first time they use SOCIAL or CHAT. The private phone remains
-- only in public.profiles and never enters public.public_profiles.
create or replace function public.ensure_own_public_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  phone_value text;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  select u.raw_user_meta_data ->> 'phone'
    into phone_value
    from auth.users as u
    where u.id = actor_id;

  insert into public.profiles (id, username, display_name, phone)
  values (actor_id, null, 'BRITUME User', phone_value)
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.ensure_own_public_profile() from public, anon;
grant execute on function public.ensure_own_public_profile() to authenticated;

create or replace function public.search_public_profiles(search_text text)
returns setof public.public_profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.public_profiles as p
  where auth.uid() is not null
    and char_length(btrim(coalesce(search_text, ''))) between 2 and 80
    and (
      p.username ilike (
        '%' ||
        replace(
          replace(
            replace(btrim(search_text), E'\\', E'\\\\'),
            '%',
            E'\\%'
          ),
          '_',
          E'\\_'
        ) ||
        '%'
      ) escape E'\\'
      or p.display_name ilike (
        '%' ||
        replace(
          replace(
            replace(btrim(search_text), E'\\', E'\\\\'),
            '%',
            E'\\%'
          ),
          '_',
          E'\\_'
        ) ||
        '%'
      ) escape E'\\'
    )
  order by
    case
      when lower(coalesce(p.username, '')) = lower(btrim(search_text)) then 0
      else 1
    end,
    lower(coalesce(p.username, p.display_name, ''))
  limit 30;
$$;

revoke all on function public.search_public_profiles(text) from public, anon;
grant execute on function public.search_public_profiles(text) to authenticated;

create table if not exists public.follows (
  follower_id uuid not null references public.public_profiles(id) on delete cascade,
  following_id uuid not null references public.public_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx
  on public.follows (following_id, created_at desc);

alter table public.follows enable row level security;
drop policy if exists "Authenticated users can read follows" on public.follows;
create policy "Authenticated users can read follows"
  on public.follows for select to authenticated using (true);
drop policy if exists "Users can follow as themselves" on public.follows;
create policy "Users can follow as themselves"
  on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and following_id <> auth.uid());
drop policy if exists "Users can unfollow as themselves" on public.follows;
create policy "Users can unfollow as themselves"
  on public.follows for delete to authenticated using (follower_id = auth.uid());

revoke all on table public.follows from anon, authenticated;
grant select, insert, delete on table public.follows to authenticated;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.public_profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_length check (
    char_length(btrim(body)) between 1 and 2000
  )
);

create index if not exists posts_author_created_at_idx
  on public.posts (author_id, created_at desc);
create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.public_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_id_idx
  on public.post_likes (user_id, created_at desc);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.public_profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint post_comments_body_length check (
    char_length(btrim(body)) between 1 and 1000
  )
);

create index if not exists post_comments_post_created_at_idx
  on public.post_comments (post_id, created_at desc);

create or replace function public.touch_social_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
before update on public.posts
for each row execute function public.touch_social_updated_at();

alter table public.posts enable row level security;
drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
  on public.posts for select to authenticated using (true);
drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Users can edit their own posts" on public.posts;
create policy "Users can edit their own posts"
  on public.posts for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated using (author_id = auth.uid());

alter table public.post_likes enable row level security;
drop policy if exists "Authenticated users can read post likes" on public.post_likes;
create policy "Authenticated users can read post likes"
  on public.post_likes for select to authenticated using (true);
drop policy if exists "Users can like posts as themselves" on public.post_likes;
create policy "Users can like posts as themselves"
  on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users can remove their own likes" on public.post_likes;
create policy "Users can remove their own likes"
  on public.post_likes for delete to authenticated using (user_id = auth.uid());

alter table public.post_comments enable row level security;
drop policy if exists "Authenticated users can read post comments" on public.post_comments;
create policy "Authenticated users can read post comments"
  on public.post_comments for select to authenticated using (true);
drop policy if exists "Users can comment as themselves" on public.post_comments;
create policy "Users can comment as themselves"
  on public.post_comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "Users can delete their own comments" on public.post_comments;
create policy "Users can delete their own comments"
  on public.post_comments for delete to authenticated using (author_id = auth.uid());

revoke all on table public.posts, public.post_likes, public.post_comments
  from anon, authenticated;
grant select, insert, update, delete on table public.posts to authenticated;
grant select, insert, delete on table public.post_likes to authenticated;
grant select, insert, delete on table public.post_comments to authenticated;

create or replace function public.social_post_metrics(post_ids uuid[])
returns table (
  post_id uuid,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    (select count(*) from public.post_likes as l where l.post_id = p.id),
    (select count(*) from public.post_comments as c where c.post_id = p.id),
    exists (
      select 1
      from public.post_likes as l
      where l.post_id = p.id and l.user_id = auth.uid()
    )
  from public.posts as p
  where auth.uid() is not null
    and p.id = any(coalesce(post_ids, array[]::uuid[]));
$$;

revoke all on function public.social_post_metrics(uuid[]) from public, anon;
grant execute on function public.social_post_metrics(uuid[]) to authenticated;

-- Direct conversations have exactly two immutable, canonically ordered members.
create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references public.public_profiles(id) on delete cascade,
  member_b uuid not null references public.public_profiles(id) on delete cascade,
  created_by uuid not null references public.public_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint direct_conversations_distinct_members check (member_a <> member_b),
  constraint direct_conversations_canonical_members check (member_a < member_b),
  constraint direct_conversations_unique_pair unique (member_a, member_b)
);

create index if not exists direct_conversations_member_a_idx
  on public.direct_conversations (member_a, created_at desc);
create index if not exists direct_conversations_member_b_idx
  on public.direct_conversations (member_b, created_at desc);

alter table public.direct_conversations enable row level security;
drop policy if exists "Members can read their direct conversations"
  on public.direct_conversations;
create policy "Members can read their direct conversations"
  on public.direct_conversations for select to authenticated
  using (auth.uid() = member_a or auth.uid() = member_b);

revoke all on table public.direct_conversations from anon, authenticated;
grant select on table public.direct_conversations to authenticated;

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  first_member uuid;
  second_member uuid;
  conversation_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if other_user_id is null or other_user_id = actor_id then
    raise exception 'Choose another BRITUME user' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.public_profiles where id = other_user_id
  ) then
    raise exception 'BRITUME profile was not found' using errcode = 'P0002';
  end if;

  if actor_id < other_user_id then
    first_member := actor_id;
    second_member := other_user_id;
  else
    first_member := other_user_id;
    second_member := actor_id;
  end if;

  insert into public.direct_conversations (member_a, member_b, created_by)
  values (first_member, second_member, actor_id)
  on conflict (member_a, member_b) do nothing;

  select id into conversation_id
  from public.direct_conversations
  where member_a = first_member and member_b = second_member;

  return conversation_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.public_profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (
    char_length(btrim(body)) between 1 and 4000
  )
);

create index if not exists messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at asc);
create index if not exists messages_sender_created_at_idx
  on public.messages (sender_id, created_at desc);

create table if not exists public.message_hides (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.public_profiles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_hides enable row level security;
drop policy if exists "Users can read their own hidden messages" on public.message_hides;
create policy "Users can read their own hidden messages"
  on public.message_hides for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users can hide messages from their own history" on public.message_hides;
create policy "Users can hide messages from their own history"
  on public.message_hides for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages as m
      join public.direct_conversations as c on c.id = m.conversation_id
      where m.id = message_id
        and (c.member_a = auth.uid() or c.member_b = auth.uid())
    )
  );

alter table public.messages enable row level security;
drop policy if exists "Conversation members can read visible messages" on public.messages;
create policy "Conversation members can read visible messages"
  on public.messages for select to authenticated
  using (
    exists (
      select 1
      from public.direct_conversations as c
      where c.id = conversation_id
        and (c.member_a = auth.uid() or c.member_b = auth.uid())
    )
    and not exists (
      select 1 from public.message_hides as h
      where h.message_id = id and h.user_id = auth.uid()
    )
  );
drop policy if exists "Conversation members can send messages as themselves" on public.messages;
create policy "Conversation members can send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.direct_conversations as c
      where c.id = conversation_id
        and (c.member_a = auth.uid() or c.member_b = auth.uid())
    )
  );

revoke all on table public.messages, public.message_hides from anon, authenticated;
grant select, insert on table public.messages to authenticated;
grant select, insert on table public.message_hides to authenticated;

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references public.public_profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;
drop policy if exists "Users can read their own conversation read state"
  on public.conversation_reads;
create policy "Users can read their own conversation read state"
  on public.conversation_reads for select to authenticated
  using (user_id = auth.uid());
revoke all on table public.conversation_reads from anon, authenticated;
grant select on table public.conversation_reads to authenticated;

create or replace function public.mark_direct_conversation_read(conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;
  if not exists (
    select 1
    from public.direct_conversations as c
    where c.id = conversation_id
      and (c.member_a = actor_id or c.member_b = actor_id)
  ) then
    raise exception 'Conversation was not found' using errcode = '42501';
  end if;

  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
  values (conversation_id, actor_id, clock_timestamp())
  on conflict on constraint conversation_reads_pkey
  do update set last_read_at = excluded.last_read_at;
end;
$$;

revoke all on function public.mark_direct_conversation_read(uuid) from public, anon;
grant execute on function public.mark_direct_conversation_read(uuid) to authenticated;

create or replace function public.list_direct_conversations()
returns table (
  conversation_id uuid,
  partner_id uuid,
  partner_username text,
  partner_display_name text,
  last_message_body text,
  last_message_at timestamptz,
  unread_count bigint,
  last_read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    partner.id,
    partner.username,
    partner.display_name,
    latest.body,
    latest.created_at,
    coalesce(unread.total, 0),
    reads.last_read_at
  from public.direct_conversations as c
  join public.public_profiles as partner
    on partner.id = case
      when c.member_a = auth.uid() then c.member_b
      else c.member_a
    end
  left join public.conversation_reads as reads
    on reads.conversation_id = c.id and reads.user_id = auth.uid()
  left join lateral (
    select m.body, m.created_at
    from public.messages as m
    where m.conversation_id = c.id
      and not exists (
        select 1
        from public.message_hides as h
        where h.message_id = m.id and h.user_id = auth.uid()
      )
    order by m.created_at desc
    limit 1
  ) as latest on true
  left join lateral (
    select count(*) as total
    from public.messages as m
    where m.conversation_id = c.id
      and m.sender_id <> auth.uid()
      and m.created_at > coalesce(reads.last_read_at, '-infinity'::timestamptz)
      and not exists (
        select 1
        from public.message_hides as h
        where h.message_id = m.id and h.user_id = auth.uid()
      )
  ) as unread on true
  where auth.uid() is not null
    and (c.member_a = auth.uid() or c.member_b = auth.uid())
  order by coalesce(latest.created_at, c.created_at) desc;
$$;

revoke all on function public.list_direct_conversations() from public, anon;
grant execute on function public.list_direct_conversations() to authenticated;
