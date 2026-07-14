alter table public.content_releases
drop constraint if exists content_releases_status_check;

alter table public.content_releases
add constraint content_releases_status_check check (
  status in (
    'draft',
    'approved',
    'queued',
    'sending',
    'sent',
    'partially_failed',
    'cancelled'
  )
);

create table if not exists public.content_release_targets (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.content_releases (id) on delete cascade,
  language text not null check (language in ('en', 'nl')),
  segment_id text not null check (char_length(btrim(segment_id)) between 1 and 255),
  topic_id text not null check (char_length(btrim(topic_id)) between 1 and 255),
  subject_snapshot text not null check (char_length(btrim(subject_snapshot)) between 1 and 160),
  recipient_count_snapshot integer not null check (recipient_count_snapshot >= 0),
  status text not null default 'pending' check (
    status in (
      'pending',
      'creating',
      'created',
      'sending',
      'accepted',
      'failed',
      'cancelled'
    )
  ),
  provider_broadcast_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  creating_started_at timestamptz,
  created_provider_at timestamptz,
  sending_started_at timestamptz,
  accepted_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  unique (release_id, language, segment_id, topic_id),
  unique (provider_broadcast_id),
  check (
    provider_broadcast_id is null
    or char_length(btrim(provider_broadcast_id)) between 1 and 255
  )
);

create index if not exists content_release_targets_release_status_idx
  on public.content_release_targets (release_id, status, next_attempt_at);

create index if not exists content_release_targets_provider_broadcast_idx
  on public.content_release_targets (provider_broadcast_id)
  where provider_broadcast_id is not null;

alter table public.content_release_targets enable row level security;

drop policy if exists "Admins can read all content release targets"
  on public.content_release_targets;

create policy "Admins can read all content release targets"
on public.content_release_targets
for select
to authenticated
using (public.is_admin());

create or replace function public.queue_content_release_delivery_with_targets(
  p_release_id uuid,
  p_item_count integer,
  p_targets jsonb
)
returns table (
  release_id uuid,
  release_status text,
  target_count integer,
  total_recipient_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_now timestamptz := now();
  v_release public.content_releases%rowtype;
  v_target record;
  v_target_count integer := 0;
  v_total_recipient_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can queue content release delivery';
  end if;

  if p_release_id is null then
    raise exception 'p_release_id is required';
  end if;

  if p_item_count is null or p_item_count < 1 then
    raise exception 'p_item_count must be greater than zero';
  end if;

  if p_targets is null or jsonb_typeof(p_targets) <> 'array' then
    raise exception 'p_targets must be a JSON array';
  end if;

  select *
  into v_release
  from public.content_releases
  where id = p_release_id
  for update;

  if not found then
    raise exception 'Content release not found';
  end if;

  if v_release.status not in ('approved', 'partially_failed') then
    raise exception 'Only approved or partially failed releases can be queued';
  end if;

  for v_target in
    select *
    from jsonb_to_recordset(p_targets) as target(
      language text,
      segment_id text,
      topic_id text,
      subject_snapshot text,
      recipient_count_snapshot integer
    )
  loop
    if v_target.language not in ('en', 'nl') then
      raise exception 'Target language must be en or nl';
    end if;

    if v_target.segment_id is null or btrim(v_target.segment_id) = '' then
      raise exception 'Target segment_id is required';
    end if;

    if v_target.topic_id is null or btrim(v_target.topic_id) = '' then
      raise exception 'Target topic_id is required';
    end if;

    if v_target.subject_snapshot is null or btrim(v_target.subject_snapshot) = '' then
      raise exception 'Target subject_snapshot is required';
    end if;

    if v_target.recipient_count_snapshot is null or v_target.recipient_count_snapshot < 1 then
      raise exception 'Target recipient_count_snapshot must be greater than zero';
    end if;

    insert into public.content_release_targets (
      language,
      next_attempt_at,
      recipient_count_snapshot,
      release_id,
      segment_id,
      status,
      subject_snapshot,
      topic_id,
      updated_at
    )
    values (
      v_target.language,
      v_now,
      v_target.recipient_count_snapshot,
      p_release_id,
      btrim(v_target.segment_id),
      'pending',
      btrim(v_target.subject_snapshot),
      btrim(v_target.topic_id),
      v_now
    )
    on conflict (release_id, language, segment_id, topic_id) do update
    set
      accepted_at = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.accepted_at
        else null
      end,
      cancelled_at = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.cancelled_at
        else null
      end,
      failed_at = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.failed_at
        else null
      end,
      last_error = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.last_error
        else null
      end,
      sending_started_at = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.sending_started_at
        else null
      end,
      next_attempt_at = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.next_attempt_at
        else excluded.next_attempt_at
      end,
      recipient_count_snapshot = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.recipient_count_snapshot
        else excluded.recipient_count_snapshot
      end,
      status = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.status
        else 'pending'
      end,
      subject_snapshot = case
        when public.content_release_targets.status = 'accepted'
          then public.content_release_targets.subject_snapshot
        else excluded.subject_snapshot
      end,
      updated_at = v_now;

    v_target_count := v_target_count + 1;
    v_total_recipient_count :=
      v_total_recipient_count + v_target.recipient_count_snapshot;
  end loop;

  if v_target_count = 0 then
    raise exception 'At least one release target is required';
  end if;

  update public.content_release_targets as target
  set
    cancelled_at = v_now,
    last_error = 'Target no longer matches the current release plan.',
    status = 'cancelled',
    updated_at = v_now
  where target.release_id = p_release_id
    and target.status <> 'accepted'
    and not exists (
      select 1
      from jsonb_to_recordset(p_targets) as planned(
        language text,
        segment_id text,
        topic_id text,
        subject_snapshot text,
        recipient_count_snapshot integer
      )
      where planned.language = target.language
        and btrim(planned.segment_id) = target.segment_id
        and btrim(planned.topic_id) = target.topic_id
    );

  update public.content_releases
  set
    delivery_cursor = null,
    delivery_finished_at = null,
    delivery_requested_at = v_now,
    delivery_requested_by = v_actor_id,
    delivery_started_at = null,
    delivery_summary = jsonb_build_object(
      'eligible_recipient_count', v_total_recipient_count,
      'failed_count', 0,
      'item_count', p_item_count,
      'processed_recipient_count', 0,
      'remaining_recipient_count', v_total_recipient_count,
      'sent_count', 0,
      'skipped_count', 0
    ),
    last_delivery_error = null,
    sent_at = null,
    status = 'queued',
    updated_at = v_now
  where id = p_release_id
  returning * into v_release;

  return query
  select
    v_release.id,
    v_release.status,
    v_target_count,
    v_total_recipient_count;
end;
$$;

revoke all on function public.queue_content_release_delivery_with_targets(
  uuid,
  integer,
  jsonb
) from public, anon, authenticated;

grant execute on function public.queue_content_release_delivery_with_targets(
  uuid,
  integer,
  jsonb
) to authenticated;

comment on table public.content_release_targets is
  'Durable per-locale/per-segment Broadcast targets for resumable content release delivery.';
comment on function public.queue_content_release_delivery_with_targets(uuid, integer, jsonb) is
  'Atomically persists a content release target plan and queues the release for Broadcast delivery.';
