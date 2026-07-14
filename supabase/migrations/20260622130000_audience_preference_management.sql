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
