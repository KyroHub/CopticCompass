create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  role text not null default 'student' check (role in ('student', 'admin')),
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
add column if not exists preferred_dictionary_dialect text
  not null
  default 'B'
  check (preferred_dictionary_dialect in ('ALL', 'S', 'B', 'A', 'L', 'F'));

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_slug text not null,
  submitted_text text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  rating integer check (rating is null or rating between 1 and 5),
  feedback_text text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.submissions
add column if not exists exercise_id text,
add column if not exists submitted_language text
  check (submitted_language is null or submitted_language in ('en', 'nl')),
add column if not exists answers jsonb,
add column if not exists submission_intent_id text,
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid
  references public.profiles (id) on delete set null,
add column if not exists deletion_reason text,
add column if not exists reviewed_at timestamptz,
add column if not exists reviewed_by uuid
  references public.profiles (id) on delete set null;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  inquiry_type text not null,
  message text not null check (char_length(message) between 5 and 5000),
  locale text not null check (locale in ('en', 'nl')),
  wants_updates boolean not null default false,
  status text not null default 'new' check (
    status in ('new', 'in_progress', 'answered', 'archived')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  channel text not null check (channel in ('email')),
  recipient text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  status text not null default 'queued' check (
    status in ('queued', 'sent', 'failed')
  ),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events (id) on delete cascade,
  channel text not null check (channel in ('email')),
  recipient text not null,
  provider_message_id text,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_email_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid not null unique references public.notification_events (id) on delete cascade,
  subject text not null,
  from_email text,
  to_recipients text[] not null check (cardinality(to_recipients) > 0),
  cc_recipients text[] not null default '{}'::text[],
  bcc_recipients text[] not null default '{}'::text[],
  reply_to_recipients text[] not null default '{}'::text[],
  html_body text,
  text_body text not null,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'sent', 'failed')
  ),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audience_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  email text not null unique check (char_length(email) between 3 and 254),
  full_name text,
  locale text not null default 'en' check (locale in ('en', 'nl')),
  source text not null check (
    source in ('contact_form', 'dashboard', 'signup')
  ),
  lessons_opt_in boolean not null default false,
  books_opt_in boolean not null default false,
  general_updates_opt_in boolean not null default false,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audience_contact_sync_state (
  audience_contact_id uuid primary key references public.audience_contacts (id) on delete cascade,
  provider text not null default 'resend' check (provider in ('resend')),
  provider_contact_id text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audience_opt_in_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  full_name text,
  locale text not null default 'en' check (locale in ('en', 'nl')),
  source text not null check (
    source in ('contact_form', 'signup')
  ),
  lessons_requested boolean not null default false,
  books_requested boolean not null default false,
  general_updates_requested boolean not null default false,
  token_hash text not null unique,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.content_releases (
  id uuid primary key default gen_random_uuid(),
  release_type text not null check (
    release_type in ('lesson', 'publication', 'mixed')
  ),
  audience_segment text not null check (
    audience_segment in ('lessons', 'books', 'general')
  ),
  locale_mode text not null check (
    locale_mode in ('localized', 'en_only', 'nl_only')
  ),
  subject_en text,
  subject_nl text,
  body_en text,
  body_nl text,
  status text not null default 'draft' check (
    status in ('draft', 'approved', 'queued', 'sending', 'sent', 'cancelled')
  ),
  delivery_requested_at timestamptz,
  delivery_requested_by uuid references public.profiles (id),
  delivery_started_at timestamptz,
  delivery_finished_at timestamptz,
  delivery_cursor text,
  delivery_summary jsonb not null default '{}'::jsonb,
  last_delivery_error text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.content_release_items (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.content_releases (id) on delete cascade,
  item_type text not null check (item_type in ('lesson', 'publication')),
  item_id text not null,
  title_snapshot text not null,
  url_snapshot text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  lesson_slug text not null,
  started_at timestamptz not null default timezone('utc', now()),
  last_viewed_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table if not exists public.section_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  lesson_slug text not null,
  section_id text not null,
  section_slug text not null,
  completed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, section_id)
);

create table if not exists public.lesson_bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  lesson_slug text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, lesson_id)
);

create table if not exists public.lesson_notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  lesson_slug text not null,
  note_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, lesson_id)
);

create table if not exists public.entry_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, entry_id)
);

create table if not exists public.entry_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_id text not null,
  entry_headword text not null,
  reason text not null check (
    reason in ('typo', 'translation', 'grammar', 'relation', 'other')
  ),
  commentary text not null check (
    char_length(commentary) between 10 and 5000
  ),
  status text not null default 'open' check (
    status in ('open', 'reviewed', 'resolved', 'dismissed')
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  signal text not null check (signal in ('admin_feedback', 'like', 'dislike')),
  prompt_text text not null check (char_length(prompt_text) between 1 and 12000),
  assistant_response_text text not null check (
    char_length(assistant_response_text) between 1 and 24000
  ),
  feedback_text text,
  inference_provider text not null check (
    inference_provider in ('gemini', 'hf', 'openrouter')
  ),
  page_path text,
  page_title text,
  page_url text,
  page_excerpt text,
  chat_id text,
  user_message_id text,
  assistant_message_id text,
  is_admin_feedback boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (
      signal = 'admin_feedback'
      and is_admin_feedback = true
      and feedback_text is not null
      and char_length(feedback_text) between 1 and 5000
    )
    or (
      signal in ('like', 'dislike')
      and is_admin_feedback = false
      and feedback_text is null
    )
  )
);

create table if not exists public.coptic_documents (
  id bigserial primary key,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768) not null
);

create index if not exists submissions_user_id_idx
  on public.submissions (user_id);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

create index if not exists submissions_lesson_slug_idx
  on public.submissions (lesson_slug);

create index if not exists submissions_status_created_at_idx
  on public.submissions (status, created_at desc);

create index if not exists submissions_exercise_id_idx
  on public.submissions (exercise_id);

create unique index if not exists submissions_submission_intent_id_uidx
  on public.submissions (submission_intent_id)
  where submission_intent_id is not null;

create index if not exists submissions_reviewed_at_idx
  on public.submissions (reviewed_at desc)
  where reviewed_at is not null;

create index if not exists submissions_reviewed_by_idx
  on public.submissions (reviewed_by)
  where reviewed_by is not null;

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create index if not exists contact_messages_status_created_at_idx
  on public.contact_messages (status, created_at desc);

create index if not exists contact_messages_email_created_at_idx
  on public.contact_messages (email, created_at desc);

create index if not exists notification_events_status_created_at_idx
  on public.notification_events (status, created_at desc);

create index if not exists notification_events_aggregate_created_at_idx
  on public.notification_events (aggregate_type, aggregate_id, created_at desc);

create index if not exists notification_events_event_type_created_at_idx
  on public.notification_events (event_type, created_at desc);

create index if not exists notification_deliveries_event_id_idx
  on public.notification_deliveries (event_id);

create index if not exists notification_deliveries_status_created_at_idx
  on public.notification_deliveries (status, created_at desc);

create index if not exists notification_email_jobs_status_created_at_idx
  on public.notification_email_jobs (status, created_at asc);

create index if not exists audience_contacts_profile_id_idx
  on public.audience_contacts (profile_id);

create index if not exists audience_contacts_locale_idx
  on public.audience_contacts (locale);

create index if not exists audience_contacts_source_idx
  on public.audience_contacts (source);

create index if not exists audience_contacts_active_idx
  on public.audience_contacts (
    lessons_opt_in,
    books_opt_in,
    general_updates_opt_in,
    updated_at desc
  );

create index if not exists audience_contacts_consented_at_idx
  on public.audience_contacts (consented_at desc)
  where consented_at is not null;

create index if not exists audience_contact_sync_state_last_synced_at_idx
  on public.audience_contact_sync_state (last_synced_at desc)
  where last_synced_at is not null;

create index if not exists audience_contact_sync_state_last_error_idx
  on public.audience_contact_sync_state (updated_at desc)
  where last_error is not null;

create index if not exists audience_opt_in_requests_expires_at_idx
  on public.audience_opt_in_requests (expires_at);

create index if not exists audience_opt_in_requests_confirmed_at_idx
  on public.audience_opt_in_requests (confirmed_at)
  where confirmed_at is not null;

create index if not exists audience_opt_in_requests_updated_at_idx
  on public.audience_opt_in_requests (updated_at desc);

create index if not exists content_releases_status_created_at_idx
  on public.content_releases (status, created_at desc);

create index if not exists content_releases_segment_created_at_idx
  on public.content_releases (audience_segment, created_at desc);

create index if not exists coptic_documents_embedding_idx
  on public.coptic_documents
  using hnsw (embedding vector_ip_ops);

alter table public.coptic_documents enable row level security;

drop policy if exists "Allow public read access to coptic documents"
  on public.coptic_documents;
create policy "Allow public read access to coptic documents"
  on public.coptic_documents
  for select
  using (true);

drop policy if exists "Allow service role to manage documents"
  on public.coptic_documents;
create policy "Allow service role to manage documents"
  on public.coptic_documents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists content_releases_delivery_requested_at_idx
  on public.content_releases (delivery_requested_at desc);

create index if not exists content_release_items_release_id_idx
  on public.content_release_items (release_id);

create index if not exists content_release_items_item_type_item_id_idx
  on public.content_release_items (item_type, item_id);

create index if not exists lesson_progress_user_id_idx
  on public.lesson_progress (user_id);

create index if not exists lesson_progress_lesson_slug_idx
  on public.lesson_progress (lesson_slug);

create index if not exists lesson_progress_last_viewed_at_idx
  on public.lesson_progress (last_viewed_at desc);

create index if not exists section_progress_user_id_idx
  on public.section_progress (user_id);

create index if not exists section_progress_lesson_id_idx
  on public.section_progress (lesson_id);

create index if not exists section_progress_completed_at_idx
  on public.section_progress (completed_at desc);

create index if not exists lesson_bookmarks_user_id_idx
  on public.lesson_bookmarks (user_id);

create index if not exists lesson_bookmarks_created_at_idx
  on public.lesson_bookmarks (created_at desc);

create index if not exists lesson_notes_user_id_idx
  on public.lesson_notes (user_id);

create index if not exists lesson_notes_updated_at_idx
  on public.lesson_notes (updated_at desc);

create index if not exists entry_favorites_user_id_idx
  on public.entry_favorites (user_id);

create index if not exists entry_favorites_created_at_idx
  on public.entry_favorites (created_at desc);

create index if not exists entry_favorites_entry_id_idx
  on public.entry_favorites (entry_id);

create index if not exists entry_reports_user_id_idx
  on public.entry_reports (user_id);

create index if not exists entry_reports_entry_id_idx
  on public.entry_reports (entry_id);

create index if not exists entry_reports_status_created_at_idx
  on public.entry_reports (status, created_at desc);

create index if not exists chat_feedback_events_user_created_idx
  on public.chat_feedback_events (user_id, created_at desc);

create index if not exists chat_feedback_events_signal_created_idx
  on public.chat_feedback_events (signal, created_at desc);

create index if not exists chat_feedback_events_assistant_message_idx
  on public.chat_feedback_events (assistant_message_id)
  where assistant_message_id is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name, avatar_url)
  values (
    new.id,
    new.email,
    'student',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'Security Breach: Unauthorized role change attempt';
    end if;
  end if;

  return new;
end;
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists check_role_update on public.profiles;

create trigger check_role_update
before update on public.profiles
for each row execute function public.protect_profile_role();

insert into public.profiles (id, email, role, full_name, avatar_url)
select
  id,
  email,
  'student',
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
  set public = excluded.public;

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_email_jobs enable row level security;
alter table public.audience_contacts enable row level security;
alter table public.audience_contact_sync_state enable row level security;
alter table public.audience_opt_in_requests enable row level security;
alter table public.content_releases enable row level security;
alter table public.content_release_items enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.section_progress enable row level security;
alter table public.lesson_bookmarks enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.entry_favorites enable row level security;
alter table public.entry_reports enable row level security;
alter table public.chat_feedback_events enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can read their own submissions" on public.submissions;
drop policy if exists "Admins can read all submissions" on public.submissions;
drop policy if exists "Users can insert their own submissions" on public.submissions;
drop policy if exists "Admins can update submissions" on public.submissions;
drop policy if exists "Admins can read all contact messages" on public.contact_messages;
drop policy if exists "Admins can update contact messages" on public.contact_messages;
drop policy if exists "Admins can read all notification events" on public.notification_events;
drop policy if exists "Admins can read all notification deliveries" on public.notification_deliveries;
drop policy if exists "Users can read their own audience contact" on public.audience_contacts;
drop policy if exists "Admins can read all audience contacts" on public.audience_contacts;
drop policy if exists "Admins can read all audience contact sync states" on public.audience_contact_sync_state;
drop policy if exists "Admins can insert audience contact sync states" on public.audience_contact_sync_state;
drop policy if exists "Admins can update audience contact sync states" on public.audience_contact_sync_state;
drop policy if exists "Admins can read all audience opt-in requests" on public.audience_opt_in_requests;
drop policy if exists "Admins can update audience opt-in requests" on public.audience_opt_in_requests;
drop policy if exists "Admins can read all content releases" on public.content_releases;
drop policy if exists "Admins can insert content releases" on public.content_releases;
drop policy if exists "Admins can update content releases" on public.content_releases;
drop policy if exists "Admins can delete content releases" on public.content_releases;
drop policy if exists "Admins can read all content release items" on public.content_release_items;
drop policy if exists "Admins can insert content release items" on public.content_release_items;
drop policy if exists "Users can read their own lesson progress" on public.lesson_progress;
drop policy if exists "Users can insert their own lesson progress" on public.lesson_progress;
drop policy if exists "Users can update their own lesson progress" on public.lesson_progress;
drop policy if exists "Admins can read all lesson progress" on public.lesson_progress;
drop policy if exists "Users can read their own section progress" on public.section_progress;
drop policy if exists "Users can insert their own section progress" on public.section_progress;
drop policy if exists "Users can update their own section progress" on public.section_progress;
drop policy if exists "Users can delete their own section progress" on public.section_progress;
drop policy if exists "Admins can read all section progress" on public.section_progress;
drop policy if exists "Users can read their own lesson bookmarks" on public.lesson_bookmarks;
drop policy if exists "Users can insert their own lesson bookmarks" on public.lesson_bookmarks;
drop policy if exists "Users can delete their own lesson bookmarks" on public.lesson_bookmarks;
drop policy if exists "Admins can read all lesson bookmarks" on public.lesson_bookmarks;
drop policy if exists "Users can read their own lesson notes" on public.lesson_notes;
drop policy if exists "Users can insert their own lesson notes" on public.lesson_notes;
drop policy if exists "Users can update their own lesson notes" on public.lesson_notes;
drop policy if exists "Users can delete their own lesson notes" on public.lesson_notes;
drop policy if exists "Admins can read all lesson notes" on public.lesson_notes;
drop policy if exists "Users can read their own entry favorites" on public.entry_favorites;
drop policy if exists "Users can insert their own entry favorites" on public.entry_favorites;
drop policy if exists "Users can delete their own entry favorites" on public.entry_favorites;
drop policy if exists "Admins can read all entry favorites" on public.entry_favorites;
drop policy if exists "Users can read their own entry reports" on public.entry_reports;
drop policy if exists "Users can insert their own entry reports" on public.entry_reports;
drop policy if exists "Admins can read all entry reports" on public.entry_reports;
drop policy if exists "Admins can update entry reports" on public.entry_reports;
drop policy if exists "Users can insert their own chat feedback events" on public.chat_feedback_events;
drop policy if exists "Users can read their own chat feedback events" on public.chat_feedback_events;
drop policy if exists "Admins can read all chat feedback events" on public.chat_feedback_events;
drop policy if exists "Avatars are publicly accessible." on storage.objects;
drop policy if exists "Users can upload their own avatar." on storage.objects;
drop policy if exists "Users can update their own avatar." on storage.objects;
drop policy if exists "Users can delete their own avatar." on storage.objects;
drop policy if exists "Users can read their own avatar objects" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read their own submissions"
on public.submissions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all submissions"
on public.submissions
for select
to authenticated
using (public.is_admin());

create policy "Users can insert their own submissions"
on public.submissions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can update submissions"
on public.submissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read all contact messages"
on public.contact_messages
for select
to authenticated
using (public.is_admin());

create policy "Admins can update contact messages"
on public.contact_messages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read all notification events"
on public.notification_events
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all notification deliveries"
on public.notification_deliveries
for select
to authenticated
using (public.is_admin());

create policy "Users can read their own audience contact"
on public.audience_contacts
for select
to authenticated
using (
  profile_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "Admins can read all audience contacts"
on public.audience_contacts
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all audience contact sync states"
on public.audience_contact_sync_state
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert audience contact sync states"
on public.audience_contact_sync_state
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update audience contact sync states"
on public.audience_contact_sync_state
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read all audience opt-in requests"
on public.audience_opt_in_requests
for select
to authenticated
using (public.is_admin());

create policy "Admins can update audience opt-in requests"
on public.audience_opt_in_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can read all content releases"
on public.content_releases
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert content releases"
on public.content_releases
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update content releases"
on public.content_releases
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete content releases"
on public.content_releases
for delete
to authenticated
using (public.is_admin());

create policy "Admins can read all content release items"
on public.content_release_items
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert content release items"
on public.content_release_items
for insert
to authenticated
with check (public.is_admin());

create policy "Users can read their own lesson progress"
on public.lesson_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own lesson progress"
on public.lesson_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own lesson progress"
on public.lesson_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can read all lesson progress"
on public.lesson_progress
for select
to authenticated
using (public.is_admin());

create policy "Users can read their own section progress"
on public.section_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own section progress"
on public.section_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own section progress"
on public.section_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own section progress"
on public.section_progress
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all section progress"
on public.section_progress
for select
to authenticated
using (public.is_admin());

create policy "Users can read their own lesson bookmarks"
on public.lesson_bookmarks
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own lesson bookmarks"
on public.lesson_bookmarks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own lesson bookmarks"
on public.lesson_bookmarks
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all lesson bookmarks"
on public.lesson_bookmarks
for select
to authenticated
using (public.is_admin());

create policy "Users can read their own lesson notes"
on public.lesson_notes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own lesson notes"
on public.lesson_notes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own lesson notes"
on public.lesson_notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own lesson notes"
on public.lesson_notes
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all lesson notes"
on public.lesson_notes
for select
to authenticated
using (public.is_admin());

create policy "Users can read their own entry favorites"
on public.entry_favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own entry favorites"
on public.entry_favorites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own entry favorites"
on public.entry_favorites
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all entry favorites"
on public.entry_favorites
for select
to authenticated
using (public.is_admin());

create policy "Users can read their own entry reports"
on public.entry_reports
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own entry reports"
on public.entry_reports
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can read all entry reports"
on public.entry_reports
for select
to authenticated
using (public.is_admin());

create policy "Admins can update entry reports"
on public.entry_reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can insert their own chat feedback events"
on public.chat_feedback_events
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read their own chat feedback events"
on public.chat_feedback_events
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all chat feedback events"
on public.chat_feedback_events
for select
to authenticated
using (public.is_admin());

create policy "Users can read their own avatar objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
