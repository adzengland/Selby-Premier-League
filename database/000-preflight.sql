-- Read-only checks. Run as postgres before 001-sprint.sql.
-- Confirm every real player has exactly one linked Auth user.
select p.name, p.user_id,
       case when p.user_id is null then 'NOT LINKED'
            when u.id is null then 'AUTH USER MISSING'
            else 'LINKED' end as sprint_access
from public.players p
left join auth.users u on u.id = p.user_id
order by p.name;

-- This should return zero rows. Sprint rejects ambiguous account mappings.
select user_id, count(*) as player_rows
from public.players
where user_id is not null
group by user_id
having count(*) > 1;

-- These existing columns are used; player primary-key type is not assumed.
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='players'
  and column_name in ('name','user_id','avatar_url')
order by column_name;
