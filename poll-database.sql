-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.student_polls (
    id text primary key,
    status text not null default 'not_launched' check (status in ('not_launched', 'open', 'closed', 'published')),
    ends_at timestamptz null,
    launched_at timestamptz null
);

alter table public.student_polls add column if not exists launched_at timestamptz null;
alter table public.student_polls alter column status set default 'not_launched';
alter table public.student_polls drop constraint if exists student_polls_status_check;
alter table public.student_polls add constraint student_polls_status_check
    check (status in ('not_launched', 'open', 'closed', 'published'));

insert into public.student_polls (id, status, ends_at, launched_at)
values ('student-future', 'not_launched', null, null)
on conflict (id) do nothing;

-- This migration locks any pre-feature poll installation while retaining every stored vote.
update public.student_polls
set status = 'not_launched'
where id = 'student-future' and launched_at is null;

create table if not exists public.student_poll_votes (
    id bigint generated always as identity primary key,
    poll_id text not null references public.student_polls(id),
    voter_hash char(64) not null,
    choice text not null check (choice in ('continue', 'close')),
    created_at timestamptz not null default now(),
    constraint student_poll_votes_once_per_voter unique (poll_id, voter_hash)
);

create table if not exists public.student_poll_rate_limits (
    poll_id text not null references public.student_polls(id),
    ip_hash char(64) not null,
    window_start timestamptz not null,
    hits integer not null default 0,
    primary key (poll_id, ip_hash)
);

alter table public.student_polls enable row level security;
alter table public.student_poll_votes enable row level security;
alter table public.student_poll_rate_limits enable row level security;
drop policy if exists student_polls_deny_client_access on public.student_polls;
create policy student_polls_deny_client_access on public.student_polls
    as restrictive for all to public using (false) with check (false);
drop policy if exists student_poll_votes_deny_client_access on public.student_poll_votes;
create policy student_poll_votes_deny_client_access on public.student_poll_votes
    as restrictive for all to public using (false) with check (false);
drop policy if exists student_poll_rate_limits_deny_client_access on public.student_poll_rate_limits;
create policy student_poll_rate_limits_deny_client_access on public.student_poll_rate_limits
    as restrictive for all to public using (false) with check (false);
revoke all on public.student_polls, public.student_poll_votes, public.student_poll_rate_limits from public, anon, authenticated;
grant select on public.student_polls, public.student_poll_votes to service_role;

create or replace function public.submit_student_poll_vote(
    p_poll_id text,
    p_voter_hash text,
    p_choice text,
    p_ip_hash text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_poll public.student_polls%rowtype;
    v_window timestamptz := date_trunc('minute', now());
    v_hits integer;
begin
    if p_poll_id is distinct from 'student-future'
        or p_choice is null or p_choice not in ('continue', 'close')
        or p_voter_hash is null or p_voter_hash !~ '^[0-9a-f]{64}$'
        or p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
        return 'invalid';
    end if;

    select * into v_poll from public.student_polls where id = p_poll_id for share;
    if not found then return 'unavailable'; end if;
    if v_poll.launched_at is null or v_poll.status = 'not_launched' then return 'not_launched'; end if;
    if v_poll.status <> 'open' or (v_poll.ends_at is not null and v_poll.ends_at <= now()) then
        return 'closed';
    end if;

    delete from public.student_poll_rate_limits
    where poll_id = p_poll_id and window_start < now() - interval '1 day';

    insert into public.student_poll_rate_limits (poll_id, ip_hash, window_start, hits)
    values (p_poll_id, p_ip_hash, v_window, 1)
    on conflict (poll_id, ip_hash) do update
        set window_start = case
                when public.student_poll_rate_limits.window_start >= excluded.window_start
                then public.student_poll_rate_limits.window_start
                else excluded.window_start
            end,
            hits = case
                when public.student_poll_rate_limits.window_start >= excluded.window_start
                then public.student_poll_rate_limits.hits + 1
                else 1
            end
    returning hits into v_hits;
    if v_hits > 30 then return 'rate_limited'; end if;

    insert into public.student_poll_votes (poll_id, voter_hash, choice)
    values (p_poll_id, p_voter_hash, p_choice)
    on conflict (poll_id, voter_hash) do nothing;
    if not found then return 'duplicate'; end if;
    return 'accepted';
end;
$$;

create or replace function public.admin_transition_student_poll(p_action text, p_poll_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_current public.student_polls%rowtype;
    v_from text;
    v_to text;
begin
    if p_poll_id is distinct from 'student-future' then return 'invalid'; end if;
    select * into v_current from public.student_polls where id = p_poll_id for update;
    if not found then return 'unavailable'; end if;

    if p_action = 'launch' then
        if v_current.status <> 'not_launched' or v_current.launched_at is not null then return 'invalid_state'; end if;
        if v_current.ends_at is not null and v_current.ends_at <= now() then return 'expired'; end if;
        update public.student_polls set status = 'open', launched_at = now() where id = p_poll_id;
        return 'ok';
    elsif p_action = 'open' then v_from := 'closed'; v_to := 'open';
    elsif p_action = 'close' then v_from := 'open'; v_to := 'closed';
    elsif p_action = 'publish' then v_from := 'closed'; v_to := 'published';
    elsif p_action = 'unpublish' then v_from := 'published'; v_to := 'closed';
    else return 'invalid'; end if;

    if v_current.status <> v_from or v_current.launched_at is null then return 'invalid_state'; end if;
    if p_action = 'open' and v_current.ends_at is not null and v_current.ends_at <= now() then
        return 'expired';
    end if;

    update public.student_polls set status = v_to where id = p_poll_id;
    return 'ok';
end;
$$;

revoke all on function public.submit_student_poll_vote(text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_transition_student_poll(text, text) from public, anon, authenticated;
grant execute on function public.submit_student_poll_vote(text, text, text, text) to service_role;
grant execute on function public.admin_transition_student_poll(text, text) to service_role;
