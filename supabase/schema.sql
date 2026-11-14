-- ═══════════════════════════════════════════════════════════════════════════
--  SCRYPTORIUM — schéma PostgreSQL / Supabase
--  Exécuter dans l'éditeur SQL Supabase (idempotent).
--
--  Modèle de sécurité :
--   • Le serveur Next.js utilise la clé service_role (jamais exposée au client).
--   • RLS activée partout : le rôle `anon` ne lit que les contenus publiés/publics.
--   • Les tables du club (profils, discussions, votes, marque-pages) sont prêtes
--     pour la phase 4 avec des politiques membre/administrateur.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Bibliothèque ──────────────────────────────────────────────────────────
create table if not exists categories (
  id           text primary key,
  slug         text unique not null,
  name         text not null,
  inscription  text not null default '',
  description  text not null default '',
  accent       text not null default '#C3A16B',
  "order"      int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists books (
  id                 text primary key,
  slug               text unique not null,
  title              text not null,
  original_title     text,
  author             text not null,
  author_nationality text,
  original_language  text,
  edition            text,
  publisher          text,
  year               int,
  pages              int check (pages is null or pages > 0),
  isbn               text,
  cover_url          text,
  color              text not null default '#51252C',
  genres             text[] not null default '{}',
  themes             text[] not null default '{}',
  summary            text not null default '',
  spoiler_analysis   text not null default '',
  summary_spoilers   boolean not null default false,
  editorial          text not null default '',
  status             text check (status in ('to_read','reading','finished','abandoned','to_reread')),
  rating             numeric(4,2) check (rating is null or (rating >= 0 and rating <= 10)),
  read_started_at    date,
  read_finished_at   date,
  current_page       int check (current_page is null or current_page >= 0),
  visibility         text not null default 'draft' check (visibility in ('draft','published','archived')),
  drive_refs         text[] not null default '{}',
  sources            jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Migration idempotente pour les bases créées avant l'ajout de la colonne.
alter table books add column if not exists summary_spoilers boolean not null default false;
alter table books add column if not exists current_page int check (current_page is null or current_page >= 0);
create index if not exists books_visibility_idx on books (visibility);
create index if not exists books_author_idx on books (author);

create table if not exists book_categories (
  book_id     text references books(id) on delete cascade,
  category_id text references categories(id) on delete cascade,
  primary key (book_id, category_id)
);

create table if not exists notes (
  id          text primary key,
  book_id     text not null references books(id) on delete cascade,
  kind        text not null default 'note' check (kind in ('note','quote','annotation')),
  content     text not null,
  page_ref    text,
  visibility  text not null default 'private' check (visibility in ('private','public')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists reviews (
  id              text primary key,
  book_id         text not null references books(id) on delete cascade,
  liked           text not null default '',
  disliked        text not null default '',
  characters      text not null default '',
  themes          text not null default '',
  interpretation  text not null default '',
  learned         text not null default '',
  recommended_for text not null default '',
  spoilers        text not null default '',
  label           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists imports (
  id            text primary key,
  book_id       text references books(id) on delete set null,
  source        text not null check (source in ('upload','paste','drive_ref','drive_api')),
  file_name     text,
  mime_type     text,
  drive_url     text,
  drive_file_id text,
  text          text not null default '',
  content_hash  text,
  status        text not null default 'pending' check (status in ('pending','processed','linked','failed')),
  error         text,
  ai_draft      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists imports_hash_idx on imports (content_hash);

create table if not exists settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null default '{}'
);

-- Secrets serveur (jeton OAuth Google…). Aucune politique : inaccessible hors service_role.
create table if not exists app_secrets (
  key   text primary key,
  value text not null
);

-- ─── Club de lecture (phase 4) ─────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'member' check (role in ('admin','member')),
  preferences  jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create table if not exists discussions (
  id         uuid primary key default gen_random_uuid(),
  book_id    text not null references books(id) on delete cascade,
  question   text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id            uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references discussions(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  content       text not null check (char_length(content) between 1 and 5000),
  has_spoilers  boolean not null default false,
  moderation    text not null default 'pending' check (moderation in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);

create table if not exists votes (
  id         uuid primary key default gen_random_uuid(),
  book_id    text not null references books(id) on delete cascade,
  member_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, member_id)
);

create table if not exists bookmarks (
  member_id  uuid not null references profiles(id) on delete cascade,
  book_id    text not null references books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, book_id)
);

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table categories      enable row level security;
alter table books           enable row level security;
alter table book_categories enable row level security;
alter table notes           enable row level security;
alter table reviews         enable row level security;
alter table imports         enable row level security;
alter table settings        enable row level security;
alter table app_secrets     enable row level security;
alter table profiles        enable row level security;
alter table discussions     enable row level security;
alter table comments        enable row level security;
alter table votes           enable row level security;
alter table bookmarks       enable row level security;

create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);

drop policy if exists "public read published books" on books;
create policy "public read published books" on books for select using (visibility = 'published' or is_admin());

drop policy if exists "public read links" on book_categories;
create policy "public read links" on book_categories for select using (
  exists (select 1 from books b where b.id = book_id and (b.visibility = 'published' or is_admin()))
);

drop policy if exists "public read public notes" on notes;
create policy "public read public notes" on notes for select using (visibility = 'public' or is_admin());

drop policy if exists "public read reviews of published books" on reviews;
create policy "public read reviews of published books" on reviews for select using (
  exists (select 1 from books b where b.id = book_id and (b.visibility = 'published' or is_admin()))
);

drop policy if exists "admin imports" on imports;
create policy "admin imports" on imports for all using (is_admin()) with check (is_admin());

drop policy if exists "public read settings" on settings;
create policy "public read settings" on settings for select using (true);

drop policy if exists "profiles self" on profiles;
create policy "profiles self" on profiles for select using (true);
drop policy if exists "profiles update self" on profiles;
create policy "profiles update self" on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

drop policy if exists "read discussions" on discussions;
create policy "read discussions" on discussions for select using (true);
drop policy if exists "admin discussions" on discussions;
create policy "admin discussions" on discussions for all using (is_admin()) with check (is_admin());

drop policy if exists "read approved comments" on comments;
create policy "read approved comments" on comments for select using (moderation = 'approved' or author_id = auth.uid() or is_admin());
drop policy if exists "members comment" on comments;
create policy "members comment" on comments for insert with check (author_id = auth.uid() and moderation = 'pending');
drop policy if exists "admin moderate" on comments;
create policy "admin moderate" on comments for update using (is_admin());

drop policy if exists "read votes" on votes;
create policy "read votes" on votes for select using (true);
drop policy if exists "members vote" on votes;
create policy "members vote" on votes for insert with check (member_id = auth.uid());
drop policy if exists "members unvote" on votes;
create policy "members unvote" on votes for delete using (member_id = auth.uid());

drop policy if exists "own bookmarks" on bookmarks;
create policy "own bookmarks" on bookmarks for all using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ─── Stockage des couvertures ──────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
on conflict (id) do nothing;

-- ─── Droits d'accès ────────────────────────────────────────────────────────
-- Les projets Supabase récents n'accordent plus d'office les droits sur les tables
-- créées en SQL. Les politiques RLS ci-dessus restent le filtre : `anon` ne lit que
-- le publié, `authenticated` n'écrit que ce que ses politiques permettent,
-- `service_role` (serveur Next.js uniquement) contourne la RLS.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

