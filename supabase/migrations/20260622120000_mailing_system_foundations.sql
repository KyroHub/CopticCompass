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

alter table public.notification_events
drop constraint if exists notification_events_status_check;

alter table public.notification_events
add constraint notification_events_status_check check (
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
);

alter table public.notification_deliveries
drop constraint if exists notification_deliveries_status_check;

alter table public.notification_deliveries
add constraint notification_deliveries_status_check check (
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
);

alter table public.notification_email_jobs
add column if not exists attempt_count integer not null default 0,
add column if not exists max_attempts integer not null default 5,
add column if not exists next_attempt_at timestamptz not null default now(),
add column if not exists last_attempt_at timestamptz,
add column if not exists locked_at timestamptz,
add column if not exists lock_expires_at timestamptz,
add column if not exists provider_message_id text;

alter table public.notification_email_jobs
drop constraint if exists notification_email_jobs_status_check;

alter table public.notification_email_jobs
add constraint notification_email_jobs_status_check check (
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
add constraint notification_email_jobs_attempt_count_check check (
  attempt_count >= 0 and attempt_count <= max_attempts
),
add constraint notification_email_jobs_max_attempts_check check (
  max_attempts between 1 and 25
),
add constraint notification_email_jobs_lock_window_check check (
  lock_expires_at is null
  or (locked_at is not null and lock_expires_at > locked_at)
);

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

create index if not exists notification_email_jobs_eligible_idx
  on public.notification_email_jobs (next_attempt_at, created_at)
  where status in ('queued', 'retry_scheduled');

create index if not exists notification_email_jobs_expired_lease_idx
  on public.notification_email_jobs (lock_expires_at)
  where status = 'processing';

alter table public.audience_consent_events enable row level security;
alter table public.audience_suppressions enable row level security;
alter table public.provider_webhook_events enable row level security;

drop policy if exists "Admins can read all audience consent events"
  on public.audience_consent_events;
drop policy if exists "Admins can read all audience suppressions"
  on public.audience_suppressions;
drop policy if exists "Admins can read all provider webhook events"
  on public.provider_webhook_events;

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
