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
  check (preferred_dictionary_dialect in ('ALL', 'S', 'B', 'A', 'L', 'F', 'M'));

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
    status in (
      'queued',
      'processing',
      'accepted',
      'delivered',
      'delayed',
      'failed',
      'bounced',
      'complained',
      'suppressed',
      'dead_letter',
      'sent'
    )
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
  status text not null check (
    status in (
      'accepted',
      'delivered',
      'delayed',
      'failed',
      'bounced',
      'complained',
      'suppressed',
      'sent'
    )
  ),
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
    status in (
      'queued',
      'processing',
      'retry_scheduled',
      'accepted',
      'failed',
      'dead_letter',
      'sent'
    )
  ),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  provider_message_id text,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (attempt_count >= 0 and attempt_count <= max_attempts),
  check (max_attempts between 1 and 25),
  check (
    lock_expires_at is null
    or (locked_at is not null and lock_expires_at > locked_at)
  )
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

create table if not exists public.audience_consent_events (
  id uuid primary key default gen_random_uuid(),
  audience_contact_id uuid not null references public.audience_contacts (id) on delete cascade,
  topic text not null check (
    topic in ('lessons', 'books', 'general_updates', 'all')
  ),
  action text not null check (
    action in ('opted_in', 'opted_out', 'suppressed', 'suppression_lifted')
  ),
  source text not null check (
    source in (
      'contact_form',
      'dashboard',
      'public_preferences',
      'resend_webhook',
      'admin_migration',
      'system'
    )
  ),
  policy_version text not null check (char_length(policy_version) between 1 and 100),
  opt_in_request_id uuid references public.audience_opt_in_requests (id) on delete set null,
  provider_event_id text check (
    provider_event_id is null or char_length(provider_event_id) between 1 and 255
  ),
  dedupe_key text unique check (
    dedupe_key is null or char_length(dedupe_key) between 1 and 255
  ),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (pg_column_size(metadata) <= 65536)
);

create table if not exists public.audience_suppressions (
  id uuid primary key default gen_random_uuid(),
  audience_contact_id uuid not null references public.audience_contacts (id) on delete cascade,
  reason text not null check (
    reason in (
      'provider_unsubscribe',
      'hard_bounce',
      'spam_complaint',
      'manual',
      'invalid_address'
    )
  ),
  provider text check (provider in ('resend', 'manual', 'system')),
  provider_event_id text check (
    provider_event_id is null or char_length(provider_event_id) between 1 and 255
  ),
  suppressed_at timestamptz not null default now(),
  lifted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lifted_at is null or lifted_at >= suppressed_at),
  check (pg_column_size(metadata) <= 65536)
);

create table if not exists public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'resend'),
  provider_event_id text not null check (
    char_length(provider_event_id) between 1 and 255
  ),
  event_type text not null check (char_length(event_type) between 1 and 120),
  provider_created_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received' check (
    status in ('received', 'processed', 'ignored', 'failed')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  payload jsonb not null default '{}'::jsonb check (
    pg_column_size(payload) <= 1048576
  ),
  unique (provider, provider_event_id)
);

insert into public.audience_consent_events (
  audience_contact_id,
  topic,
  action,
  source,
  policy_version,
  dedupe_key,
  occurred_at,
  metadata
)
select
  contact.id,
  subscription.topic,
  'opted_in',
  'admin_migration',
  'legacy-2026-06-22',
  'legacy-audience-consent:' || contact.id::text || ':' || subscription.topic,
  coalesce(contact.consented_at, contact.updated_at, contact.created_at),
  jsonb_build_object(
    'migrated', true,
    'original_source', contact.source
  )
from public.audience_contacts as contact
cross join lateral (
  values
    ('lessons', contact.lessons_opt_in),
    ('books', contact.books_opt_in),
    ('general_updates', contact.general_updates_opt_in)
) as subscription(topic, is_opted_in)
where subscription.is_opted_in
on conflict (dedupe_key) do nothing;

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

create index if not exists notification_email_jobs_eligible_idx
  on public.notification_email_jobs (next_attempt_at, created_at)
  where status in ('queued', 'retry_scheduled');

create index if not exists notification_email_jobs_expired_lease_idx
  on public.notification_email_jobs (lock_expires_at)
  where status = 'processing';

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

create index if not exists audience_consent_events_contact_occurred_at_idx
  on public.audience_consent_events (audience_contact_id, occurred_at desc);

create index if not exists audience_consent_events_topic_occurred_at_idx
  on public.audience_consent_events (topic, occurred_at desc);

create index if not exists audience_consent_events_provider_event_id_idx
  on public.audience_consent_events (provider_event_id)
  where provider_event_id is not null;

create unique index if not exists audience_suppressions_active_reason_idx
  on public.audience_suppressions (audience_contact_id, reason)
  where lifted_at is null;

create index if not exists audience_suppressions_active_suppressed_at_idx
  on public.audience_suppressions (suppressed_at desc)
  where lifted_at is null;

create index if not exists provider_webhook_events_status_received_at_idx
  on public.provider_webhook_events (status, received_at asc);

create index if not exists provider_webhook_events_provider_created_at_idx
  on public.provider_webhook_events (provider, provider_created_at desc)
  where provider_created_at is not null;

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

create or replace function public.claim_notification_email_jobs(
  p_limit integer default 5,
  p_job_id uuid default null,
  p_lease_seconds integer default 300
)
returns setof public.notification_email_jobs
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'p_lease_seconds must be between 30 and 3600';
  end if;

  return query
  with claimable_jobs as (
    select job.id
    from public.notification_email_jobs as job
    where
      (p_job_id is null or job.id = p_job_id)
      and job.attempt_count < job.max_attempts
      and (
        (
          job.status in ('queued', 'retry_scheduled')
          and job.next_attempt_at <= pg_catalog.now()
        )
        or (
          job.status = 'processing'
          and coalesce(
            job.lock_expires_at,
            job.last_attempt_at
              + pg_catalog.make_interval(secs => p_lease_seconds),
            job.created_at
              + pg_catalog.make_interval(secs => p_lease_seconds)
          ) <= pg_catalog.now()
        )
      )
    order by job.next_attempt_at asc, job.created_at asc
    for update of job skip locked
    limit p_limit
  )
  update public.notification_email_jobs as job
  set
    status = 'processing',
    attempt_count = job.attempt_count + 1,
    last_attempt_at = pg_catalog.now(),
    locked_at = pg_catalog.now(),
    lock_expires_at = pg_catalog.now()
      + pg_catalog.make_interval(secs => p_lease_seconds),
    last_error = null
  from claimable_jobs
  where job.id = claimable_jobs.id
  returning job.*;
end;
$$;

grant execute on function public.is_admin() to anon, authenticated;
revoke all on function public.claim_notification_email_jobs(integer, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_notification_email_jobs(integer, uuid, integer)
  to service_role;

comment on table public.audience_consent_events is
  'Append-only evidence for audience topic consent and suppression changes.';
comment on table public.audience_suppressions is
  'Active and historical restrictions that override ordinary marketing preferences.';
comment on table public.provider_webhook_events is
  'Idempotent inbox for signed provider webhook processing and replay diagnostics.';
comment on function public.claim_notification_email_jobs(integer, uuid, integer) is
  'Atomically leases eligible notification email jobs for trusted background workers.';

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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_email_jobs enable row level security;
alter table public.audience_contacts enable row level security;
alter table public.audience_contact_sync_state enable row level security;
alter table public.audience_opt_in_requests enable row level security;
alter table public.audience_consent_events enable row level security;
alter table public.audience_suppressions enable row level security;
alter table public.provider_webhook_events enable row level security;
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
drop policy if exists "Admins can read all audience consent events" on public.audience_consent_events;
drop policy if exists "Admins can read all audience suppressions" on public.audience_suppressions;
drop policy if exists "Admins can read all provider webhook events" on public.provider_webhook_events;
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

create policy "Admins can read all audience consent events"
on public.audience_consent_events
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all audience suppressions"
on public.audience_suppressions
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all provider webhook events"
on public.provider_webhook_events
for select
to authenticated
using (public.is_admin());

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
alter table public.audience_contacts
drop constraint if exists audience_contacts_source_check;

alter table public.audience_contacts
add constraint audience_contacts_source_check check (
  source in (
    'contact_form',
    'dashboard',
    'signup',
    'public_preferences',
    'resend_webhook',
    'system'
  )
);

alter table public.audience_consent_events
drop constraint if exists audience_consent_events_source_check;

alter table public.audience_consent_events
add constraint audience_consent_events_source_check check (
  source in (
    'contact_form',
    'dashboard',
    'public_preferences',
    'resend_webhook',
    'admin_migration',
    'signup',
    'system'
  )
);

create table if not exists public.audience_preference_requests (
  id uuid primary key default gen_random_uuid(),
  audience_contact_id uuid not null references public.audience_contacts (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) between 32 and 128),
  locale text not null default 'en' check (locale in ('en', 'nl')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (used_at is null or used_at >= created_at)
);

create index if not exists audience_preference_requests_contact_created_at_idx
  on public.audience_preference_requests (audience_contact_id, created_at desc);

create index if not exists audience_preference_requests_expires_at_idx
  on public.audience_preference_requests (expires_at)
  where used_at is null;

alter table public.audience_preference_requests enable row level security;

drop policy if exists "Admins can read all audience preference requests"
  on public.audience_preference_requests;

create policy "Admins can read all audience preference requests"
on public.audience_preference_requests
for select
to authenticated
using (public.is_admin());

create or replace function public.apply_audience_preferences(
  p_email text,
  p_full_name text,
  p_locale text,
  p_profile_id uuid,
  p_source text,
  p_lessons_opt_in boolean,
  p_books_opt_in boolean,
  p_general_updates_opt_in boolean,
  p_actor text,
  p_policy_version text,
  p_occurred_at timestamptz,
  p_opt_in_request_id uuid,
  p_dedupe_prefix text
)
returns public.audience_contacts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contact public.audience_contacts%rowtype;
  v_existing public.audience_contacts%rowtype;
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_full_name text := nullif(pg_catalog.btrim(p_full_name), '');
  v_is_subscribed boolean;
  v_now timestamptz := coalesce(p_occurred_at, pg_catalog.now());
begin
  if pg_catalog.char_length(v_email) not between 3 and 254 then
    raise exception 'A valid audience email is required.';
  end if;

  if p_locale not in ('en', 'nl') then
    raise exception 'Unsupported audience locale.';
  end if;

  if p_source not in (
    'contact_form',
    'dashboard',
    'signup',
    'public_preferences',
    'resend_webhook',
    'system'
  ) then
    raise exception 'Unsupported audience preference source.';
  end if;

  if p_actor not in ('visitor', 'authenticated_user', 'provider', 'system') then
    raise exception 'Unsupported audience preference actor.';
  end if;

  if p_lessons_opt_in is null
    or p_books_opt_in is null
    or p_general_updates_opt_in is null then
    raise exception 'Audience topic preferences cannot be null.';
  end if;

  if v_full_name is not null and pg_catalog.char_length(v_full_name) > 200 then
    raise exception 'Audience full name is too long.';
  end if;

  if pg_catalog.char_length(pg_catalog.btrim(p_policy_version)) not between 1 and 100 then
    raise exception 'A valid policy version is required.';
  end if;

  if p_dedupe_prefix is not null
    and pg_catalog.char_length(p_dedupe_prefix) not between 1 and 200 then
    raise exception 'Invalid audience preference dedupe prefix.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_email, 0)
  );

  select contact.*
  into v_existing
  from public.audience_contacts as contact
  where contact.email = v_email
  for update;

  if p_actor in ('provider', 'system') and (
    (p_lessons_opt_in and not coalesce(v_existing.lessons_opt_in, false))
    or (p_books_opt_in and not coalesce(v_existing.books_opt_in, false))
    or (
      p_general_updates_opt_in
      and not coalesce(v_existing.general_updates_opt_in, false)
    )
  ) then
    raise exception 'Only an explicit user command may opt into audience topics.';
  end if;

  v_is_subscribed := p_lessons_opt_in
    or p_books_opt_in
    or p_general_updates_opt_in;

  insert into public.audience_contacts (
    email,
    full_name,
    locale,
    profile_id,
    source,
    lessons_opt_in,
    books_opt_in,
    general_updates_opt_in,
    consented_at,
    unsubscribed_at,
    created_at,
    updated_at
  )
  values (
    v_email,
    v_full_name,
    p_locale,
    p_profile_id,
    p_source,
    p_lessons_opt_in,
    p_books_opt_in,
    p_general_updates_opt_in,
    case when v_is_subscribed then v_now else null end,
    case when v_is_subscribed then null else v_now end,
    v_now,
    v_now
  )
  on conflict (email) do update
  set
    full_name = coalesce(excluded.full_name, audience_contacts.full_name),
    locale = excluded.locale,
    profile_id = coalesce(excluded.profile_id, audience_contacts.profile_id),
    source = excluded.source,
    lessons_opt_in = excluded.lessons_opt_in,
    books_opt_in = excluded.books_opt_in,
    general_updates_opt_in = excluded.general_updates_opt_in,
    consented_at = case
      when v_is_subscribed
        then coalesce(audience_contacts.consented_at, v_now)
      else audience_contacts.consented_at
    end,
    unsubscribed_at = case when v_is_subscribed then null else v_now end,
    updated_at = v_now
  returning * into v_contact;

  insert into public.audience_consent_events (
    audience_contact_id,
    topic,
    action,
    source,
    policy_version,
    opt_in_request_id,
    dedupe_key,
    occurred_at,
    metadata
  )
  select
    v_contact.id,
    change.topic,
    case when change.next_value then 'opted_in' else 'opted_out' end,
    p_source,
    pg_catalog.btrim(p_policy_version),
    p_opt_in_request_id,
    case
      when p_dedupe_prefix is null then null
      else p_dedupe_prefix || ':' || change.topic || ':'
        || case when change.next_value then 'opted_in' else 'opted_out' end
    end,
    v_now,
    pg_catalog.jsonb_build_object('actor', p_actor)
  from (
    values
      (
        'lessons',
        coalesce(v_existing.lessons_opt_in, false),
        p_lessons_opt_in
      ),
      (
        'books',
        coalesce(v_existing.books_opt_in, false),
        p_books_opt_in
      ),
      (
        'general_updates',
        coalesce(v_existing.general_updates_opt_in, false),
        p_general_updates_opt_in
      )
  ) as change(topic, previous_value, next_value)
  where change.previous_value is distinct from change.next_value
  on conflict (dedupe_key) do nothing;

  return v_contact;
end;
$$;

create or replace function public.confirm_audience_opt_in_request(
  p_token_hash text,
  p_policy_version text,
  p_occurred_at timestamptz
)
returns table (
  status text,
  request_id uuid,
  audience_contact_id uuid,
  email text,
  full_name text,
  locale text,
  lessons_opt_in boolean,
  books_opt_in boolean,
  general_updates_opt_in boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.audience_opt_in_requests%rowtype;
  v_contact public.audience_contacts%rowtype;
  v_now timestamptz := coalesce(p_occurred_at, pg_catalog.now());
begin
  select opt_in_request.*
  into v_request
  from public.audience_opt_in_requests as opt_in_request
  where opt_in_request.token_hash = p_token_hash
  for update;

  if not found then
    return query select
      'invalid'::text, null::uuid, null::uuid, null::text, null::text,
      null::text, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  if v_request.confirmed_at is not null then
    select contact.*
    into v_contact
    from public.audience_contacts as contact
    where contact.email = pg_catalog.lower(pg_catalog.btrim(v_request.email));

    return query select
      'already_confirmed'::text,
      v_request.id,
      v_contact.id,
      v_request.email,
      v_request.full_name,
      v_request.locale,
      v_request.lessons_requested,
      v_request.books_requested,
      v_request.general_updates_requested;
    return;
  end if;

  if v_request.expires_at <= v_now then
    return query select
      'expired'::text,
      v_request.id,
      null::uuid,
      v_request.email,
      v_request.full_name,
      v_request.locale,
      v_request.lessons_requested,
      v_request.books_requested,
      v_request.general_updates_requested;
    return;
  end if;

  select *
  into v_contact
  from public.apply_audience_preferences(
    v_request.email,
    v_request.full_name,
    v_request.locale,
    null,
    'contact_form',
    v_request.lessons_requested,
    v_request.books_requested,
    v_request.general_updates_requested,
    'visitor',
    p_policy_version,
    v_now,
    v_request.id,
    'opt-in-request:' || v_request.id::text
  );

  update public.audience_opt_in_requests as opt_in_request
  set confirmed_at = v_now, updated_at = v_now
  where opt_in_request.id = v_request.id;

  return query select
    'confirmed'::text,
    v_request.id,
    v_contact.id,
    v_contact.email,
    v_contact.full_name,
    v_contact.locale,
    v_contact.lessons_opt_in,
    v_contact.books_opt_in,
    v_contact.general_updates_opt_in;
end;
$$;

create or replace function public.apply_audience_preference_request(
  p_token_hash text,
  p_lessons_opt_in boolean,
  p_books_opt_in boolean,
  p_general_updates_opt_in boolean,
  p_policy_version text,
  p_occurred_at timestamptz
)
returns table (
  status text,
  request_id uuid,
  audience_contact_id uuid,
  email text,
  full_name text,
  locale text,
  lessons_opt_in boolean,
  books_opt_in boolean,
  general_updates_opt_in boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.audience_preference_requests%rowtype;
  v_contact public.audience_contacts%rowtype;
  v_now timestamptz := coalesce(p_occurred_at, pg_catalog.now());
begin
  select preference_request.*
  into v_request
  from public.audience_preference_requests as preference_request
  where preference_request.token_hash = p_token_hash
  for update;

  if not found then
    return query select
      'invalid'::text, null::uuid, null::uuid, null::text, null::text,
      null::text, null::boolean, null::boolean, null::boolean;
    return;
  end if;

  select contact.*
  into v_contact
  from public.audience_contacts as contact
  where contact.id = v_request.audience_contact_id
  for update;

  if v_request.used_at is not null then
    return query select
      'already_used'::text,
      v_request.id,
      v_contact.id,
      v_contact.email,
      v_contact.full_name,
      v_contact.locale,
      v_contact.lessons_opt_in,
      v_contact.books_opt_in,
      v_contact.general_updates_opt_in;
    return;
  end if;

  if v_request.expires_at <= v_now then
    return query select
      'expired'::text,
      v_request.id,
      v_contact.id,
      v_contact.email,
      v_contact.full_name,
      v_contact.locale,
      v_contact.lessons_opt_in,
      v_contact.books_opt_in,
      v_contact.general_updates_opt_in;
    return;
  end if;

  select *
  into v_contact
  from public.apply_audience_preferences(
    v_contact.email,
    v_contact.full_name,
    v_request.locale,
    v_contact.profile_id,
    'public_preferences',
    p_lessons_opt_in,
    p_books_opt_in,
    p_general_updates_opt_in,
    'visitor',
    p_policy_version,
    v_now,
    null,
    'preference-request:' || v_request.id::text
  );

  update public.audience_preference_requests as preference_request
  set used_at = v_now
  where preference_request.id = v_request.id;

  return query select
    'updated'::text,
    v_request.id,
    v_contact.id,
    v_contact.email,
    v_contact.full_name,
    v_contact.locale,
    v_contact.lessons_opt_in,
    v_contact.books_opt_in,
    v_contact.general_updates_opt_in;
end;
$$;

revoke all on function public.apply_audience_preferences(
  text, text, text, uuid, text, boolean, boolean, boolean,
  text, text, timestamptz, uuid, text
) from public, anon, authenticated;
grant execute on function public.apply_audience_preferences(
  text, text, text, uuid, text, boolean, boolean, boolean,
  text, text, timestamptz, uuid, text
) to service_role;

revoke all on function public.confirm_audience_opt_in_request(
  text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.confirm_audience_opt_in_request(
  text, text, timestamptz
) to service_role;

revoke all on function public.apply_audience_preference_request(
  text, boolean, boolean, boolean, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_audience_preference_request(
  text, boolean, boolean, boolean, text, timestamptz
) to service_role;

comment on table public.audience_preference_requests is
  'Short-lived, single-use hashed links for no-account audience preference management.';
comment on function public.apply_audience_preferences(
  text, text, text, uuid, text, boolean, boolean, boolean,
  text, text, timestamptz, uuid, text
) is 'Atomically updates audience topics and appends consent evidence for changed preferences.';
comment on function public.confirm_audience_opt_in_request(text, text, timestamptz) is
  'Atomically consumes a double opt-in request and records its topic consent.';
comment on function public.apply_audience_preference_request(
  text, boolean, boolean, boolean, text, timestamptz
) is 'Atomically consumes a public preference link and records topic changes.';
