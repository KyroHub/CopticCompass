create extension if not exists pg_net;
create extension if not exists pg_cron;

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

create or replace function public.invoke_notification_email_worker(
  p_limit integer default 5
)
returns table (
  request_id bigint,
  invoked boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_service_role_key text;
  v_worker_token text;
  v_limit integer;
begin
  v_limit := least(greatest(coalesce(p_limit, 5), 1), 25);

  select nullif(btrim(decrypted_secret), '')
  into v_project_url
  from vault.decrypted_secrets
  where name = 'notification_worker_project_url'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  select nullif(btrim(decrypted_secret), '')
  into v_service_role_key
  from vault.decrypted_secrets
  where name = 'notification_worker_service_role_key'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  select nullif(btrim(decrypted_secret), '')
  into v_worker_token
  from vault.decrypted_secrets
  where name = 'notification_worker_bearer_token'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if v_project_url is null
    or v_service_role_key is null
    or v_worker_token is null
  then
    request_id := null;
    invoked := false;
    reason := 'missing_vault_secret';
    return next;
    return;
  end if;

  v_project_url := rtrim(v_project_url, '/');

  return query
  select
    net.http_post(
      url := v_project_url || '/functions/v1/process-notification-email',
      body := jsonb_build_object('limit', v_limit),
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || v_service_role_key,
        'Content-Type',
        'application/json',
        'X-Notification-Worker-Token',
        v_worker_token
      ),
      timeout_milliseconds := 10000
    ) as request_id,
    true as invoked,
    'invoked'::text as reason;
end;
$$;

revoke all on function public.invoke_notification_email_worker(integer)
  from public, anon, authenticated;
grant execute on function public.invoke_notification_email_worker(integer)
  to service_role;

comment on function public.invoke_notification_email_worker(integer) is
  'Invokes process-notification-email through pg_net using named Supabase Vault secrets for scheduled notification queue recovery.';

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'process-notification-email-recovery'
  ) then
    perform cron.unschedule('process-notification-email-recovery');
  end if;

  perform cron.schedule(
    'process-notification-email-recovery',
    '* * * * *',
    'select public.invoke_notification_email_worker(5);'
  );
end;
$$;
