create extension if not exists pg_net;

create or replace function public.invoke_profile_signup_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_url text;
  v_service_role_key text;
  v_webhook_token text;
begin
  select nullif(btrim(decrypted_secret), '')
  into v_project_url
  from vault.decrypted_secrets
  where name = 'profile_signup_alert_project_url'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  select nullif(btrim(decrypted_secret), '')
  into v_service_role_key
  from vault.decrypted_secrets
  where name = 'profile_signup_alert_service_role_key'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  select nullif(btrim(decrypted_secret), '')
  into v_webhook_token
  from vault.decrypted_secrets
  where name = 'profile_signup_alert_webhook_token'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if v_project_url is null
    or v_service_role_key is null
    or v_webhook_token is null
  then
    raise warning 'Profile signup alert skipped because one or more Vault secrets are missing.';
    return new;
  end if;

  v_project_url := rtrim(v_project_url, '/');

  perform net.http_post(
    url := v_project_url || '/functions/v1/profile-signup-alert',
    body := jsonb_build_object(
      'old_record',
      null,
      'record',
      to_jsonb(new),
      'schema',
      'public',
      'table',
      'profiles',
      'type',
      'INSERT'
    ),
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || v_service_role_key,
      'Content-Type',
      'application/json',
      'X-Signup-Alert-Webhook-Token',
      v_webhook_token
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function public.invoke_profile_signup_alert()
  from public, anon, authenticated;
grant execute on function public.invoke_profile_signup_alert()
  to service_role;

comment on function public.invoke_profile_signup_alert() is
  'Invokes profile-signup-alert through pg_net using named Supabase Vault secrets so database trigger definitions do not store credentials.';

drop trigger if exists "profile-signup-alert"
  on public.profiles;

create trigger "profile-signup-alert"
after insert on public.profiles
for each row
execute function public.invoke_profile_signup_alert();
