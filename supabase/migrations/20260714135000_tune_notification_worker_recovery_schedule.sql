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
    '*/5 * * * *',
    'select public.invoke_notification_email_worker(5);'
  );
end;
$$;
