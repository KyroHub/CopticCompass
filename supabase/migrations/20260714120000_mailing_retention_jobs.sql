create index if not exists notification_email_jobs_retention_processed_idx
  on public.notification_email_jobs (processed_at)
  where status in ('accepted', 'sent') and processed_at is not null;

create index if not exists notification_events_retention_processed_idx
  on public.notification_events (processed_at)
  where status in ('accepted', 'delivered', 'sent') and processed_at is not null;

create or replace function public.run_mailing_retention(
  p_dry_run boolean default true,
  p_now timestamptz default now()
)
returns table (
  retention_target text,
  retention_action text,
  retention_cutoff timestamptz,
  affected_count bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count bigint;
  v_thirty_day_cutoff timestamptz;
  v_ninety_day_cutoff timestamptz;
begin
  if p_now is null then
    raise exception 'p_now is required';
  end if;

  v_thirty_day_cutoff := p_now - interval '30 days';
  v_ninety_day_cutoff := p_now - interval '90 days';

  if coalesce(p_dry_run, true) then
    select count(*)
    into v_count
    from public.audience_opt_in_requests
    where confirmed_at is null
      and expires_at < v_thirty_day_cutoff;
  else
    with deleted as (
      delete from public.audience_opt_in_requests
      where confirmed_at is null
        and expires_at < v_thirty_day_cutoff
      returning 1
    )
    select count(*) into v_count from deleted;
  end if;

  retention_target := 'audience_opt_in_requests';
  retention_action := 'delete_expired_unconfirmed';
  retention_cutoff := v_thirty_day_cutoff;
  affected_count := v_count;
  return next;

  if coalesce(p_dry_run, true) then
    select count(*)
    into v_count
    from public.audience_preference_requests
    where expires_at < v_thirty_day_cutoff;
  else
    with deleted as (
      delete from public.audience_preference_requests
      where expires_at < v_thirty_day_cutoff
      returning 1
    )
    select count(*) into v_count from deleted;
  end if;

  retention_target := 'audience_preference_requests';
  retention_action := 'delete_expired_links';
  retention_cutoff := v_thirty_day_cutoff;
  affected_count := v_count;
  return next;

  if coalesce(p_dry_run, true) then
    select count(*)
    into v_count
    from public.provider_webhook_events
    where received_at < v_ninety_day_cutoff
      and not (
        payload ? 'redacted'
        and payload ->> 'retention_policy' = 'mailing-90-day-detailed-payload'
      );
  else
    with updated as (
      update public.provider_webhook_events
      set payload = jsonb_build_object(
        'redacted',
        true,
        'redacted_at',
        p_now,
        'retention_policy',
        'mailing-90-day-detailed-payload'
      )
      where received_at < v_ninety_day_cutoff
        and not (
          payload ? 'redacted'
          and payload ->> 'retention_policy' = 'mailing-90-day-detailed-payload'
        )
      returning 1
    )
    select count(*) into v_count from updated;
  end if;

  retention_target := 'provider_webhook_events';
  retention_action := 'redact_raw_payload';
  retention_cutoff := v_ninety_day_cutoff;
  affected_count := v_count;
  return next;

  if coalesce(p_dry_run, true) then
    select count(*)
    into v_count
    from public.notification_events
    where status in ('accepted', 'delivered', 'sent')
      and processed_at < v_ninety_day_cutoff
      and not (
        payload ? 'redacted'
        and payload ->> 'retention_policy' = 'mailing-90-day-detailed-payload'
      );
  else
    with updated as (
      update public.notification_events
      set payload = jsonb_build_object(
        'redacted',
        true,
        'redacted_at',
        p_now,
        'retention_policy',
        'mailing-90-day-detailed-payload'
      )
      where status in ('accepted', 'delivered', 'sent')
        and processed_at < v_ninety_day_cutoff
        and not (
          payload ? 'redacted'
          and payload ->> 'retention_policy' = 'mailing-90-day-detailed-payload'
        )
      returning 1
    )
    select count(*) into v_count from updated;
  end if;

  retention_target := 'notification_events';
  retention_action := 'redact_terminal_payload';
  retention_cutoff := v_ninety_day_cutoff;
  affected_count := v_count;
  return next;

  if coalesce(p_dry_run, true) then
    select count(*)
    into v_count
    from public.notification_email_jobs
    where status in ('accepted', 'sent')
      and processed_at < v_ninety_day_cutoff
      and (
        html_body is not null
        or text_body <> '[redacted by mailing retention policy]'
      );
  else
    with updated as (
      update public.notification_email_jobs
      set
        html_body = null,
        text_body = '[redacted by mailing retention policy]'
      where status in ('accepted', 'sent')
        and processed_at < v_ninety_day_cutoff
        and (
          html_body is not null
          or text_body <> '[redacted by mailing retention policy]'
        )
      returning 1
    )
    select count(*) into v_count from updated;
  end if;

  retention_target := 'notification_email_jobs';
  retention_action := 'redact_successful_bodies';
  retention_cutoff := v_ninety_day_cutoff;
  affected_count := v_count;
  return next;
end;
$$;

revoke all on function public.run_mailing_retention(boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.run_mailing_retention(boolean, timestamptz)
  to service_role;

comment on function public.run_mailing_retention(boolean, timestamptz) is
  'Reports or applies retention cleanup for short-lived mailing tokens and detailed delivery payloads. Defaults to dry-run mode.';
