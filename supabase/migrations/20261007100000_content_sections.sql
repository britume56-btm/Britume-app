-- Authenticated, user-owned posts for the BRITUME launch content sections.
-- Apply after 20261007060000_social_chat_phase1.sql.
create table if not exists public.module_posts (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  body text not null,
  media_url text,
  price_label text,
  author_id uuid not null references public.public_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint module_posts_section_check
    check (section in ('TV', 'TECHNOLOGIES', 'STUDIOS', 'WEAR', 'FOUNDATION')),
  constraint module_posts_title_length
    check (char_length(btrim(title)) between 1 and 120),
  constraint module_posts_body_length
    check (char_length(btrim(body)) between 1 and 4000),
  constraint module_posts_media_url_length
    check (media_url is null or char_length(media_url) <= 2048),
  constraint module_posts_price_length
    check (price_label is null or char_length(price_label) <= 50)
);

create index if not exists module_posts_section_created_at_idx
  on public.module_posts (section, created_at desc);

alter table public.module_posts enable row level security;

drop policy if exists "Authenticated users can read module posts"
  on public.module_posts;
create policy "Authenticated users can read module posts"
  on public.module_posts for select to authenticated using (true);

drop policy if exists "Users can publish module posts as themselves"
  on public.module_posts;
create policy "Users can publish module posts as themselves"
  on public.module_posts for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "Users can delete their own module posts"
  on public.module_posts;
create policy "Users can delete their own module posts"
  on public.module_posts for delete to authenticated
  using (author_id = auth.uid());

revoke all on table public.module_posts from anon, authenticated;
grant select, insert, delete on table public.module_posts to authenticated;
