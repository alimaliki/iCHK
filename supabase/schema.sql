create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('supervisor', 'team')),
  username text unique,
  team_id uuid,
  team_name text,
  created_at timestamptz not null default now(),
  constraint team_profile_has_team check (role <> 'team' or team_id is not null)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  username text unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  availability text not null default 'ready' check (availability in ('ready', 'busy', 'off-shift')),
  shift text not null default 'morning' check (shift in ('morning', 'evening', 'night')),
  account_uid uuid unique references auth.users(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_team_id_fkey foreign key (team_id) references public.teams(id) on delete cascade;

create table public.tasks (
  id text primary key check (id ~ '^[A-Z0-9_-]{1,40}$'),
  task_number text not null unique check (task_number ~ '^[A-Z0-9_-]{1,40}$'),
  title text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 2000),
  src text not null default '' check (length(src) <= 100),
  fms_id text not null default '' check (length(fms_id) <= 2048 and (fms_id = '' or fms_id ~ '^https://')),
  department text not null default '' check (length(department) <= 120),
  region text not null default '' check (length(region) <= 120),
  fdt text not null default '' check (length(fdt) <= 120),
  efu text not null default '0' check (length(efu) <= 80),
  maintenance text not null default '' check (length(maintenance) <= 120),
  case_status text not null default '' check (length(case_status) <= 120),
  escalation text not null default '' check (length(escalation) <= 120),
  gr_request text not null default 'no' check (gr_request in ('yes', 'no')),
  case_created_at timestamptz,
  location text not null default '' check (length(location) <= 120),
  governorates text[] not null check (
    cardinality(governorates) between 1 and 18
    and governorates <@ array['AN', 'KR', 'NJ', 'BB', 'BG', 'QA', 'MU', 'DQ', 'BS', 'MY', 'WA', 'NI', 'DH', 'SD', 'DY', 'KI', 'ER', 'SU']::text[]
  ),
  governorate text not null check (governorate = governorates[1]),
  team_id uuid references public.teams(id),
  team_name text,
  status text not null default 'open' check (status in ('open', 'onHold', 'done')),
  archived boolean not null default false,
  check_status text not null default 'none' check (check_status in ('none', 'requested', 'checked')),
  check_requested_by uuid references auth.users(id),
  check_requested_at timestamptz,
  check_checked_by uuid references auth.users(id),
  check_checked_at timestamptz,
  check_viewed_by uuid references auth.users(id),
  check_viewed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  task_id text not null references public.tasks(id) on delete cascade,
  text text not null check (length(text) between 1 and 2000),
  sender_id uuid not null references auth.users(id),
  sender_name text not null,
  role text not null check (role in ('supervisor', 'team')),
  created_at timestamptz not null default now()
);

create index messages_task_created_idx on public.messages(task_id, created_at);
create index tasks_team_created_idx on public.tasks(team_id, created_at desc);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  phone text not null default '' check (length(phone) <= 40),
  responsibility text not null default '' check (length(responsibility) <= 100),
  employee_id text not null default '' check (length(employee_id) <= 40),
  username text not null default '' check (length(username) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.profiles where id = (select auth.uid()) and role = 'team'
$$;

create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'supervisor', false)
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_team_id() from public;
revoke all on function public.is_supervisor() from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_team_id() to authenticated;
grant execute on function public.is_supervisor() to authenticated;

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
    if new.team_name is distinct from (select name from public.teams where id = new.team_id) then
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
    if (to_jsonb(new) - array['title', 'description', 'src', 'fms_id', 'department', 'region', 'fdt', 'efu', 'maintenance', 'case_status', 'escalation', 'gr_request', 'case_created_at', 'created_at', 'location', 'governorates', 'governorate', 'team_id', 'team_name', 'status', 'closed_at'])
      = (to_jsonb(old) - array['title', 'description', 'src', 'fms_id', 'department', 'region', 'fdt', 'efu', 'maintenance', 'case_status', 'escalation', 'gr_request', 'case_created_at', 'created_at', 'location', 'governorates', 'governorate', 'team_id', 'team_name', 'status', 'closed_at'])
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

create trigger tasks_guard_update
before update on public.tasks
for each row execute function public.guard_task_update();

create or replace function public.guard_message_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_supervisor()
    and (to_jsonb(new) - 'text') = (to_jsonb(old) - 'text') then
    return new;
  end if;
  raise exception 'Only supervisors can edit message text';
end;
$$;

create trigger messages_guard_update
before update on public.messages
for each row execute function public.guard_message_update();

create or replace function public.guard_member_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_supervisor()
    and new.id = old.id
    and new.team_id = old.team_id
    and new.created_at = old.created_at then
    return new;
  end if;
  raise exception 'Member identity fields cannot be changed';
end;
$$;

create trigger members_guard_update
before update on public.members
for each row execute function public.guard_member_update();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
alter table public.members enable row level security;

create policy "Profiles are visible to their owner and supervisors"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_supervisor());

create policy "Teams are visible to supervisors and their team"
on public.teams for select to authenticated
using (public.is_supervisor() or id = (select public.current_team_id()));

create policy "Supervisors create tasks"
on public.tasks for insert to authenticated
with check (
  public.is_supervisor()
  and created_by = (select auth.uid())
  and id = task_number
  and (
    (team_id is null and team_name is null)
    or (team_id is not null and team_name = (select name from public.teams where id = team_id))
  )
);

create policy "Users read tasks for their role"
on public.tasks for select to authenticated
using (public.is_supervisor() or team_id = (select public.current_team_id()));

create policy "Supervisors and assigned teams update tasks"
on public.tasks for update to authenticated
using (public.is_supervisor() or team_id = (select public.current_team_id()))
with check (public.is_supervisor() or team_id = (select public.current_team_id()));

create policy "Supervisors delete tasks"
on public.tasks for delete to authenticated
using (public.is_supervisor());

create policy "Users read messages for accessible tasks"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = messages.task_id
      and (public.is_supervisor() or tasks.team_id = (select public.current_team_id()))
  )
);

create policy "Users send messages to accessible tasks"
on public.messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and role = public.current_user_role()
  and exists (
    select 1 from public.tasks
    where tasks.id = messages.task_id
      and (public.is_supervisor() or tasks.team_id = (select public.current_team_id()))
  )
);

create policy "Supervisors update task messages"
on public.messages for update to authenticated
using (public.is_supervisor())
with check (public.is_supervisor());

create policy "Supervisors delete task messages"
on public.messages for delete to authenticated
using (public.is_supervisor());

create policy "Supervisors manage team members"
on public.members for all to authenticated
using (public.is_supervisor())
with check (public.is_supervisor());

grant select on public.profiles, public.teams, public.tasks, public.messages, public.members to authenticated;
grant insert, update, delete on public.tasks, public.messages, public.members to authenticated;
grant select, insert, update, delete on public.profiles, public.teams, public.tasks, public.messages, public.members to service_role;

alter table public.profiles replica identity full;
alter table public.teams replica identity full;
alter table public.tasks replica identity full;
alter table public.messages replica identity full;
alter table public.members replica identity full;

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.members;
