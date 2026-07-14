alter table public.content_release_targets
add column if not exists last_provider_status text,
add column if not exists provider_status_updated_at timestamptz,
add column if not exists last_provider_event_id text,
add column if not exists last_provider_error text,
add column if not exists delivered_at timestamptz,
add column if not exists delayed_at timestamptz,
add column if not exists bounced_at timestamptz,
add column if not exists complained_at timestamptz,
add column if not exists suppressed_at timestamptz;

alter table public.content_release_targets
drop constraint if exists content_release_targets_last_provider_status_check;

alter table public.content_release_targets
add constraint content_release_targets_last_provider_status_check check (
  last_provider_status is null
  or last_provider_status in (
    'accepted',
    'delayed',
    'delivered',
    'failed',
    'bounced',
    'complained',
    'suppressed'
  )
);

alter table public.content_release_targets
drop constraint if exists content_release_targets_last_provider_event_id_check;

alter table public.content_release_targets
add constraint content_release_targets_last_provider_event_id_check check (
  last_provider_event_id is null
  or char_length(btrim(last_provider_event_id)) between 1 and 255
);

alter table public.content_release_targets
drop constraint if exists content_release_targets_last_provider_error_check;

alter table public.content_release_targets
add constraint content_release_targets_last_provider_error_check check (
  last_provider_error is null
  or char_length(btrim(last_provider_error)) between 1 and 255
);

create index if not exists content_release_targets_provider_status_idx
  on public.content_release_targets (last_provider_status, provider_status_updated_at desc)
  where last_provider_status is not null;

comment on column public.content_release_targets.last_provider_status is
  'Most recent normalized provider lifecycle state observed from signed webhooks.';
comment on column public.content_release_targets.last_provider_error is
  'Sanitized provider diagnostic code for the latest actionable delivery feedback.';
