create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.role() = 'service_role' then
      return new;
    end if;

    if not public.is_admin() then
      raise exception 'Security Breach: Unauthorized role change attempt';
    end if;
  end if;

  return new;
end;
$$;
