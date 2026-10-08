-- Additive BRITUME feature completion: extend the existing preference and
-- notification tables; do not create a second preferences store.
alter table public.user_preferences
  add column if not exists custom_accent_color text,
  add column if not exists account_notifications boolean not null default true,
  add column if not exists labs_experiments jsonb not null
    default '{"focus-mode": false, "compact-home": false}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_preferences_custom_accent_color_format'
      and conrelid = 'public.user_preferences'::regclass
  ) then
    alter table public.user_preferences
      add constraint user_preferences_custom_accent_color_format
      check (
        custom_accent_color is null
        or custom_accent_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_preferences_labs_experiments_object'
      and conrelid = 'public.user_preferences'::regclass
  ) then
    alter table public.user_preferences
      add constraint user_preferences_labs_experiments_object
      check (jsonb_typeof(labs_experiments) = 'object');
  end if;
end;
$$;

alter table public.app_notifications
  add column if not exists actor_id uuid
  references public.public_profiles(id) on delete set null;

create or replace function public.create_app_notification(
  recipient_id uuid,
  actor_id uuid,
  notification_category text,
  notification_title text,
  notification_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_insert boolean;
begin
  if recipient_id is null or char_length(btrim(coalesce(notification_title, ''))) = 0 then
    return;
  end if;

  select
    coalesce(p.notifications_enabled, true)
    and case notification_category
      when 'social' then coalesce(p.social_notifications, true)
      when 'account' then coalesce(p.account_notifications, true)
      when 'product' then coalesce(p.product_updates, false)
      else true
    end
  into should_insert
  from (select recipient_id as user_id) as recipient
  left join public.user_preferences as p on p.user_id = recipient.user_id;

  if coalesce(should_insert, false) then
    insert into public.app_notifications (
      user_id, actor_id, title, body, category
    )
    values (
      recipient_id,
      actor_id,
      left(btrim(notification_title), 120),
      left(coalesce(notification_body, ''), 1000),
      notification_category
    );
  end if;
end;
$$;

revoke all on function public.create_app_notification(uuid, uuid, text, text, text)
  from public, anon, authenticated;

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_label text;
begin
  if new.follower_id = new.following_id then
    return new;
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), nullif(p.username, ''), 'A BRITUME member')
    into actor_label
    from public.public_profiles as p
    where p.id = new.follower_id;
  perform public.create_app_notification(
    new.following_id, new.follower_id, 'social', 'New follower',
    coalesce(actor_label, 'A BRITUME member') || ' followed you.'
  );
  return new;
end;
$$;

drop trigger if exists app_notification_on_follow on public.follows;
create trigger app_notification_on_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_post_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
  actor_label text;
begin
  select p.author_id into recipient_id
    from public.posts as p where p.id = new.post_id;
  if recipient_id is null or recipient_id = new.user_id then
    return new;
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), nullif(p.username, ''), 'A BRITUME member')
    into actor_label
    from public.public_profiles as p where p.id = new.user_id;
  perform public.create_app_notification(
    recipient_id, new.user_id, 'social', 'New like',
    coalesce(actor_label, 'A BRITUME member') || ' liked your post.'
  );
  return new;
end;
$$;

drop trigger if exists app_notification_on_post_like on public.post_likes;
create trigger app_notification_on_post_like
  after insert on public.post_likes
  for each row execute function public.notify_on_post_like();

create or replace function public.notify_on_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
  actor_label text;
begin
  select p.author_id into recipient_id
    from public.posts as p where p.id = new.post_id;
  if recipient_id is null or recipient_id = new.author_id then
    return new;
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), nullif(p.username, ''), 'A BRITUME member')
    into actor_label
    from public.public_profiles as p where p.id = new.author_id;
  perform public.create_app_notification(
    recipient_id, new.author_id, 'social', 'New comment',
    coalesce(actor_label, 'A BRITUME member') || ' commented on your post.'
  );
  return new;
end;
$$;

drop trigger if exists app_notification_on_post_comment on public.post_comments;
create trigger app_notification_on_post_comment
  after insert on public.post_comments
  for each row execute function public.notify_on_post_comment();

create or replace function public.notify_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
  actor_label text;
begin
  select case
    when c.member_a = new.sender_id then c.member_b
    else c.member_a
  end into recipient_id
  from public.direct_conversations as c
  where c.id = new.conversation_id
    and new.sender_id in (c.member_a, c.member_b);

  if recipient_id is null then
    return new;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), nullif(p.username, ''), 'A BRITUME member')
    into actor_label
    from public.public_profiles as p where p.id = new.sender_id;
  perform public.create_app_notification(
    recipient_id, new.sender_id, 'social', 'New message',
    'New message from ' || coalesce(actor_label, 'a BRITUME member') || '.'
  );
  return new;
end;
$$;

drop trigger if exists app_notification_on_direct_message on public.messages;
create trigger app_notification_on_direct_message
  after insert on public.messages
  for each row execute function public.notify_on_direct_message();

create or replace function public.notify_on_profile_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_app_notification(
    new.id, null, 'account', 'Profile ready',
    'Your BRITUME profile is ready to personalize.'
  );
  return new;
end;
$$;

drop trigger if exists app_notification_on_profile_created on public.profiles;
create trigger app_notification_on_profile_created
  after insert on public.profiles
  for each row execute function public.notify_on_profile_created();
