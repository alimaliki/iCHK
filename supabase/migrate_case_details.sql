alter table public.teams
  add column if not exists shift text not null default 'morning';

alter table public.teams
  drop constraint if exists teams_shift_check,
  add constraint teams_shift_check check (shift in ('morning', 'evening', 'night'));

alter table public.tasks
  add column if not exists src text not null default '',
  add column if not exists fms_id text not null default '',
  add column if not exists department text not null default '',
  add column if not exists region text not null default '',
  add column if not exists fdt text not null default '',
  add column if not exists efu text not null default '0',
  add column if not exists maintenance text not null default '',
  add column if not exists case_status text not null default '',
  add column if not exists escalation text not null default '',
  add column if not exists gr_request text not null default 'no',
  add column if not exists case_created_at timestamptz,
  add column if not exists closed_at timestamptz;

update public.tasks set efu = '0' where btrim(efu) = '';
update public.tasks set gr_request = 'no' where btrim(gr_request) = '';

alter table public.tasks
  alter column efu set default '0',
  alter column gr_request set default 'no';

alter table public.tasks
  drop constraint if exists tasks_status_check,
  add constraint tasks_status_check check (status in ('open', 'onHold', 'done')),
  drop constraint if exists tasks_case_details_check,
  add constraint tasks_case_details_check check (
    length(src) <= 100
    and length(fms_id) <= 2048
    and (fms_id = '' or fms_id ~ '^https://')
    and length(department) <= 120
    and length(region) <= 120
    and length(fdt) <= 120
    and length(efu) <= 80
    and length(maintenance) <= 120
    and length(case_status) <= 120
    and length(escalation) <= 120
    and gr_request in ('yes', 'no')
  );

create or replace function public.guard_task_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_supervisor() then
    if new.id <> old.id or new.task_number <> old.task_number then
      raise exception 'Task identifiers cannot be changed';
    end if;
    if new.team_name <> (select name from public.teams where id = new.team_id) then
      raise exception 'Task team name must match its assigned team';
    end if;
    if (to_jsonb(new) - array['status', 'archived', 'closed_at'])
      = (to_jsonb(old) - array['status', 'archived', 'closed_at'])
      and new.status in ('open', 'onHold', 'done')
      and (
        (new.status = old.status and new.closed_at is not distinct from old.closed_at)
        or (new.status <> old.status and (
          (new.status = 'done' and new.closed_at is not null)
          or (new.status <> 'done' and new.closed_at is null)
        ))
      )
      and (not new.archived or new.status = 'done')
      and (new.archived = old.archived or old.status = 'done' or new.archived = false) then
      return new;
    end if;
    if (to_jsonb(new) - array['title', 'description', 'src', 'fms_id', 'department', 'region', 'fdt', 'efu', 'maintenance', 'case_status', 'escalation', 'gr_request', 'case_created_at', 'location', 'governorates', 'governorate', 'team_id', 'team_name', 'status', 'closed_at'])
      = (to_jsonb(old) - array['title', 'description', 'src', 'fms_id', 'department', 'region', 'fdt', 'efu', 'maintenance', 'case_status', 'escalation', 'gr_request', 'case_created_at', 'location', 'governorates', 'governorate', 'team_id', 'team_name', 'status', 'closed_at'])
      and length(new.title) between 1 and 160
      and length(new.description) <= 2000
      and length(new.location) <= 120
      and cardinality(new.governorates) between 1 and 18
      and new.governorates <@ array['AN', 'KR', 'NJ', 'BB', 'BG', 'QA', 'MU', 'DQ', 'BS', 'MY', 'WA', 'NI', 'DH', 'SD', 'DY', 'KI', 'ER', 'SU']::text[]
      and new.governorate = new.governorates[1]
      and new.status in ('open', 'onHold', 'done')
      and ((new.status = 'done' and new.closed_at is not null) or (new.status <> 'done' and new.closed_at is null)) then
      return new;
    end if;
    if (to_jsonb(new) - array['check_status', 'check_checked_by', 'check_checked_at'])
      = (to_jsonb(old) - array['check_status', 'check_checked_by', 'check_checked_at'])
      and old.check_status = 'requested'
      and new.check_status = 'checked'
      and new.check_checked_by = auth.uid()
      and new.check_checked_at is not null then
      return new;
    end if;
    if (to_jsonb(new) - array['check_viewed_by', 'check_viewed_at'])
      = (to_jsonb(old) - array['check_viewed_by', 'check_viewed_at'])
      and old.check_status = 'requested'
      and new.check_status = 'requested'
      and new.check_viewed_by = auth.uid()
      and new.check_viewed_at is not null then
      return new;
    end if;
  end if;

  if public.current_user_role() = 'team'
    and old.team_id = public.current_team_id()
    and (to_jsonb(new) - array['check_status', 'check_requested_by', 'check_requested_at'])
      = (to_jsonb(old) - array['check_status', 'check_requested_by', 'check_requested_at'])
    and old.check_status in ('none', 'checked')
    and new.check_status = 'requested'
    and new.check_requested_by = auth.uid()
    and new.check_requested_at is not null then
    return new;
  end if;

  raise exception 'Task update is not permitted';
end;
$$;
