create table if not exists public.notification_email_job_audit_events (
  id uuid primary key default gen_random_uuid(),
  notification_email_job_id uuid not null references public.notification_email_jobs (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('manual_retry')),
  reason text not null check (
    char_length(btrim(reason)) between 8 and 1000
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (pg_column_size(metadata) <= 65536)
);

create index if not exists notification_email_job_audit_events_job_created_idx
  on public.notification_email_job_audit_events (
    notification_email_job_id,
    created_at desc
  );

create index if not exists notification_email_job_audit_events_actor_created_idx
  on public.notification_email_job_audit_events (actor_id, created_at desc)
  where actor_id is not null;

alter table public.notification_email_job_audit_events
  enable row level security;

drop policy if exists "Admins can read all notification email jobs"
  on public.notification_email_jobs;
drop policy if exists "Admins can read all notification email job audit events"
  on public.notification_email_job_audit_events;

create policy "Admins can read all notification email jobs"
on public.notification_email_jobs
for select
to authenticated
using (public.is_admin());

create policy "Admins can read all notification email job audit events"
on public.notification_email_job_audit_events
for select
to authenticated
using (public.is_admin());

create or replace function public.enqueue_notification_email_job(
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id text,
  p_recipient text,
  p_subject text,
  p_text_body text,
  p_to_recipients text[],
  p_payload jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_from_email text default null,
  p_html_body text default null,
  p_cc_recipients text[] default '{}'::text[],
  p_bcc_recipients text[] default '{}'::text[],
  p_reply_to_recipients text[] default '{}'::text[],
  p_max_attempts integer default 5
)
returns table (
  event_id uuid,
  event_status text,
  job_already_existed boolean,
  job_id uuid,
  job_status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_event_status text;
  v_job_id uuid;
  v_job_status text;
  v_job_already_existed boolean := false;
begin
  if p_event_type is null or btrim(p_event_type) = '' then
    raise exception 'p_event_type is required';
  end if;

  if p_aggregate_type is null or btrim(p_aggregate_type) = '' then
    raise exception 'p_aggregate_type is required';
  end if;

  if p_aggregate_id is null or btrim(p_aggregate_id) = '' then
    raise exception 'p_aggregate_id is required';
  end if;

  if p_recipient is null or btrim(p_recipient) = '' then
    raise exception 'p_recipient is required';
  end if;

  if p_subject is null or btrim(p_subject) = '' then
    raise exception 'p_subject is required';
  end if;

  if p_text_body is null or btrim(p_text_body) = '' then
    raise exception 'p_text_body is required';
  end if;

  if p_to_recipients is null or cardinality(p_to_recipients) = 0 then
    raise exception 'p_to_recipients must contain at least one recipient';
  end if;

  if p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 25 then
    raise exception 'p_max_attempts must be between 1 and 25';
  end if;

  insert into public.notification_events (
    aggregate_id,
    aggregate_type,
    channel,
    dedupe_key,
    event_type,
    payload,
    recipient,
    subject
  )
  values (
    p_aggregate_id,
    p_aggregate_type,
    'email',
    p_dedupe_key,
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    p_recipient,
    p_subject
  )
  on conflict (dedupe_key) do update
  set dedupe_key = excluded.dedupe_key
  returning id, status into v_event_id, v_event_status;

  insert into public.notification_email_jobs (
    bcc_recipients,
    cc_recipients,
    from_email,
    html_body,
    max_attempts,
    notification_event_id,
    reply_to_recipients,
    subject,
    text_body,
    to_recipients
  )
  values (
    coalesce(p_bcc_recipients, '{}'::text[]),
    coalesce(p_cc_recipients, '{}'::text[]),
    p_from_email,
    p_html_body,
    p_max_attempts,
    v_event_id,
    coalesce(p_reply_to_recipients, '{}'::text[]),
    p_subject,
    p_text_body,
    p_to_recipients
  )
  on conflict (notification_event_id) do nothing
  returning id, status into v_job_id, v_job_status;

  if v_job_id is null then
    select job.id, job.status
    into v_job_id, v_job_status
    from public.notification_email_jobs as job
    where job.notification_event_id = v_event_id;

    v_job_already_existed := true;
  end if;

  if v_job_id is null then
    raise exception 'Could not create or load notification email job';
  end if;

  return query
  select
    v_event_id,
    v_event_status,
    v_job_already_existed,
    v_job_id,
    v_job_status;
end;
$$;

revoke all on function public.enqueue_notification_email_job(
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  jsonb,
  text,
  text,
  text,
  text[],
  text[],
  text[],
  integer
) from public, anon, authenticated;

grant execute on function public.enqueue_notification_email_job(
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  jsonb,
  text,
  text,
  text,
  text[],
  text[],
  text[],
  integer
) to service_role;

create or replace function public.retry_notification_email_job(
  p_job_id uuid,
  p_reason text
)
returns table (
  event_id uuid,
  job_id uuid,
  job_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_event public.notification_events%rowtype;
  v_job public.notification_email_jobs%rowtype;
  v_previous_job_status text;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_required_transactional boolean := false;
  v_suppressed_recipient text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can retry notification email jobs';
  end if;

  if p_job_id is null then
    raise exception 'p_job_id is required';
  end if;

  if char_length(v_reason) < 8 or char_length(v_reason) > 1000 then
    raise exception 'A retry reason between 8 and 1000 characters is required';
  end if;

  select *
  into v_job
  from public.notification_email_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Notification email job not found';
  end if;

  if v_job.status not in ('failed', 'dead_letter') then
    raise exception 'Only failed or dead-letter notification email jobs can be retried manually';
  end if;
  v_previous_job_status := v_job.status;

  select *
  into v_event
  from public.notification_events
  where id = v_job.notification_event_id
  for update;

  if not found then
    raise exception 'Notification event not found';
  end if;

  v_required_transactional :=
    v_event.payload @> '{"notification_classification":{"required_transactional":true}}'::jsonb;

  if not v_required_transactional then
    select contact.email
    into v_suppressed_recipient
    from public.audience_contacts as contact
    inner join public.audience_suppressions as suppression
      on suppression.audience_contact_id = contact.id
      and suppression.lifted_at is null
    where lower(contact.email) = any (
      select lower(recipient.email)
      from unnest(v_job.to_recipients) as recipient(email)
    )
    limit 1;

    if v_suppressed_recipient is not null then
      raise exception 'Recipient is actively suppressed and this notification is not classified as required transactional mail';
    end if;
  end if;

  update public.notification_email_jobs
  set
    last_error = null,
    lock_expires_at = null,
    locked_at = null,
    max_attempts = greatest(max_attempts, attempt_count + 1),
    next_attempt_at = now(),
    processed_at = null,
    status = 'queued'
  where id = v_job.id
  returning * into v_job;

  update public.notification_events
  set
    last_error = null,
    processed_at = null,
    status = 'queued'
  where id = v_event.id
  returning * into v_event;

  insert into public.notification_email_job_audit_events (
    action,
    actor_id,
    metadata,
    notification_email_job_id,
    reason
  )
  values (
    'manual_retry',
    v_actor_id,
    jsonb_build_object(
      'previous_job_status',
      v_previous_job_status,
      'required_transactional',
      v_required_transactional
    ),
    v_job.id,
    v_reason
  );

  return query
  select v_event.id, v_job.id, v_job.status;
end;
$$;

revoke all on function public.retry_notification_email_job(uuid, text)
  from public, anon, authenticated;
grant execute on function public.retry_notification_email_job(uuid, text)
  to authenticated;

comment on table public.notification_email_job_audit_events is
  'Admin recovery actions for durable notification email jobs.';
comment on function public.enqueue_notification_email_job(
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  jsonb,
  text,
  text,
  text,
  text[],
  text[],
  text[],
  integer
) is
  'Atomically creates or reuses a logical notification event and its durable email job.';
comment on function public.retry_notification_email_job(uuid, text) is
  'Queues a failed or dead-letter notification email job for one audited manual retry.';
