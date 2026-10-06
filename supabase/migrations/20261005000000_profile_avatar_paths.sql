-- Stop persisting expiring signed avatar URLs in public.profiles.
alter table public.profiles
  add column if not exists avatar_path text;

-- Recover paths from legacy Supabase signed URLs before clearing those values.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
  ) then
    execute $migration$
      update public.profiles
      set avatar_path = split_part(
        split_part(avatar_url, '/object/sign/avatars/', 2),
        '?',
        1
      )
      where avatar_path is null
        and position('/object/sign/avatars/' in avatar_url) > 0
        and split_part(
          split_part(avatar_url, '/object/sign/avatars/', 2),
          '?',
          1
        ) <> ''
    $migration$;

    execute $migration$
      update public.profiles
      set avatar_url = null
      where avatar_path is not null
        and avatar_url like '%/object/sign/avatars/%'
    $migration$;
  end if;
end
$$;