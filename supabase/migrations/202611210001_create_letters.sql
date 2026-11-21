create extension if not exists pgcrypto;

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  sort_order integer unique,
  title text,
  letter text not null,
  name text,
  email text,
  programme text,
  cohort text,
  theme text,
  source text not null default 'web' check (source in ('web', 'collected')),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  consent_to_publish boolean not null default false,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  constraint letters_title_length check (title is null or char_length(title) <= 160),
  constraint letters_letter_length check (char_length(letter) between 1 and 12000),
  constraint letters_name_length check (name is null or char_length(name) <= 120),
  constraint letters_email_length check (email is null or char_length(email) <= 254),
  constraint letters_programme_length check (programme is null or char_length(programme) <= 160),
  constraint letters_cohort_length check (cohort is null or char_length(cohort) <= 80),
  constraint letters_theme_length check (theme is null or char_length(theme) <= 100),
  constraint published_letters_need_consent check (status <> 'published' or consent_to_publish = true)
);

create index if not exists letters_public_order_idx
  on public.letters (status, sort_order, submitted_at desc);

alter table public.letters enable row level security;
revoke all on table public.letters from anon, authenticated;
grant all on table public.letters to service_role;

create or replace function public.set_letter_published_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  elsif new.status <> 'published' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_letter_published_at on public.letters;
create trigger set_letter_published_at
before insert or update of status on public.letters
for each row execute function public.set_letter_published_at();
