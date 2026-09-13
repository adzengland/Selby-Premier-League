-- SPL 501 Sprint v1. Run once in Supabase SQL Editor as postgres.
-- Additive: does not change existing players, login, profile or admin policies.
begin;
create schema if not exists sprint_private;
revoke all on schema sprint_private from public, anon, authenticated;

create table if not exists sprint_private.games (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 start_request uuid not null,
 rules_version text not null default 'spl501-v1',
 status text not null default 'active' check(status in ('active','completed','abandoned')),
 started_at timestamptz not null default clock_timestamp(),
 last_shot_at timestamptz,
 completed_at timestamptz,
 remaining integer not null default 501,
 visit_start integer not null default 501,
 visit_no integer not null default 1,
 darts_in_visit integer not null default 0,
 visit_score integer not null default 0,
 total_darts integer not null default 0,
 highest_visit integer not null default 0,
 checkout_score integer,
 elapsed_ms bigint,
 pending_collect boolean not null default false,
 unique(user_id,start_request),
 check(remaining between 0 and 501),
 check(darts_in_visit between 0 and 3),
 check(total_darts between 0 and 1000),
 check(status <> 'completed' or (remaining=0 and total_darts>=9 and elapsed_ms>0))
);
create unique index if not exists sprint_one_active_game on sprint_private.games(user_id) where status='active';
alter table sprint_private.games add column if not exists first_shot_at timestamptz;
update sprint_private.games set first_shot_at=started_at where total_darts>0 and first_shot_at is null;
create index if not exists sprint_best_result on sprint_private.games(user_id,total_darts,elapsed_ms) where status='completed';
create table if not exists sprint_private.shots (
 game_id uuid not null references sprint_private.games(id) on delete cascade,
 request_id uuid not null,
 dart_no integer not null,
 visit_no integer not null,
 x double precision not null,
 y double precision not null,
 score integer not null,
 label text not null,
 is_bust boolean not null,
 response jsonb not null,
 primary key(game_id,request_id),
 unique(game_id,dart_no)
);
alter table sprint_private.games enable row level security;
alter table sprint_private.shots enable row level security;
revoke all on all tables in schema sprint_private from public,anon,authenticated;

create or replace function sprint_private.require_player() returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid(); n integer;
begin
 if u is null then raise exception 'Sign in to play.' using errcode='42501'; end if;
 select count(*) into n from public.players where user_id=u;
 if n<>1 then raise exception 'Your login must be linked to exactly one existing player.' using errcode='42501'; end if;
 return u;
end $$;

create or replace function sprint_private.snapshot(g sprint_private.games) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',g.id,'status',g.status,'remaining',g.remaining,
 'visit_no',g.visit_no,'darts_in_visit',g.darts_in_visit,'total_darts',g.total_darts,
 'highest_visit',g.highest_visit,'visit_score',g.visit_score,'pending_collect',g.pending_collect,
 'elapsed_ms',coalesce(g.elapsed_ms,case when g.first_shot_at is null then 0 else greatest(0,floor(extract(epoch from (clock_timestamp()-g.first_shot_at))*1000)::bigint) end),
 'checkout_score',g.checkout_score,'rules_version',g.rules_version);
$$;

-- Exact raster-measured rings used by this version of the artwork.
create or replace function sprint_private.score_at(x double precision,y double precision) returns jsonb
language plpgsql immutable set search_path='' as $$
declare
 dx double precision:=x-621;dy double precision:=y-607;
 r double precision:=sqrt(dx*dx+dy*dy);a double precision;s double precision;degrees double precision;f double precision;
 i integer;j integer;n integer;m integer;bands double precision[];edge double precision;
 wire double precision:=3.0;divider_distance double precision;
 ord integer[]:=array[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
 rings double precision[][]:=array[[229.5,255.5,388.5,417.5],[229.5,255.5,388.5,417.5],[229.5,255.5,388.5,417.5],[229.5,255.5,388.5,417.5],[229.5,255.5,388.5,417.5],[229.5,255.5,387.5,417.5],[229.5,255.5,387.5,417.5],[229.5,255.5,388.25,417.5],[229.25,255.5,388.25,417.25],[229.0,255.5,388.0,417.0],[228.75,255.5,387.75,416.75],[228.75,255.5,387.5,416.5],[229.5,255.5,387.5,416.5],[229.5,255.5,387.5,416.5],[229.5,255.5,387.5,416.5],[229.5,255.5,387.5,416.5],[228.5,254.5,387.5,416.5],[228.5,254.5,387.5,416.5],[228.5,254.5,386.5,416.5],[228.5,254.5,386.5,415.5],[228.5,254.5,386.5,415.5],[228.5,254.5,386.5,415.5],[228.5,254.5,385.5,414.5],[228.5,254.5,385.5,414.5],[228.5,253.5,385.5,414.5],[228.5,253.5,384.5,414.5],[228.5,253.5,384.25,414.25],[228.5,253.5,384.0,414.0],[228.5,253.5,383.75,413.75],[228.5,253.5,383.5,413.5],[227.5,253.5,383.5,413.5],[227.5,253.5,383.5,413.5],[227.5,252.5,383.5,412.5],[227.5,252.5,383.5,412.5],[227.5,252.5,383.5,412.5],[227.5,252.5,382.5,412.5],[227.5,252.5,382.5,411.5],[227.5,252.5,382.5,411.5],[226.5,251.5,381.5,410.5],[226.5,251.5,381.5,410.5],[226.5,250.5,380.5,410.5],[226.5,250.5,380.5,409.5],[225.5,250.5,380.5,409.5],[225.5,250.5,380.5,409.5],[225.5,250.5,380.0,409.0],[225.5,250.5,379.5,408.5],[225.5,250.5,379.0,408.0],[225.5,250.5,379.0,407.5],[225.5,250.5,379.5,407.5],[225.5,249.5,379.5,407.5],[224.5,249.5,378.5,407.5],[223.5,249.5,378.5,406.5],[223.5,249.5,378.5,406.5],[223.5,249.5,378.5,406.5],[223.5,249.5,377.5,406.5],[223.5,249.5,377.5,405.5],[223.5,249.5,377.5,405.5],[223.5,248.5,377.5,405.5],[222.5,248.5,376.5,404.5],[223.5,248.5,376.5,404.5],[222.5,248.5,375.5,403.5],[222.5,247.5,375.5,403.5],[222.5,247.25,374.75,403.0],[222.5,247.0,374.0,402.5],[222.5,246.75,373.25,402.0],[222.5,246.5,372.5,401.5],[222.5,246.5,372.5,401.5],[221.5,246.5,372.5,400.5],[220.5,246.5,371.5,400.5],[220.5,246.5,371.5,400.5],[220.5,245.5,371.5,399.5],[220.5,245.5,371.5,399.5],[220.5,245.5,371.5,398.5],[220.5,245.5,370.5,398.5],[220.5,244.5,370.5,398.5],[219.5,244.5,369.5,398.5],[219.5,244.5,370.5,398.5],[219.5,244.5,369.5,397.5],[220.5,244.5,369.5,397.5],[220.5,244.5,369.5,397.5],[220.5,244.5,369.75,397.25],[220.5,244.5,370.0,397.0],[220.5,244.5,370.25,396.75],[220.5,244.5,370.25,396.5],[219.5,244.5,369.5,396.5],[219.5,244.5,369.5,396.5],[219.5,244.5,370.5,397.5],[219.5,243.5,370.5,396.5],[219.5,243.5,370.5,396.5],[219.5,243.5,370.5,396.5],[219.5,243.5,370.5,396.5],[219.5,243.5,370.5,396.5],[219.5,243.5,370.5,396.5],[219.5,243.5,370.5,396.5],[219.5,243.5,370.5,397.5],[219.5,243.5,369.5,396.5],[219.5,243.5,369.5,397.5],[220.25,244.5,370.5,398.0],[220.25,244.5,370.5,398.0],[220.0,244.5,370.5,397.5],[219.75,244.5,370.5,397.0],[219.5,244.5,370.5,397.0],[219.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,245.5,370.5,397.5],[220.5,245.5,370.5,397.5],[220.5,245.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,245.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,398.5],[220.5,245.5,370.5,398.5],[220.5,245.5,370.5,398.25],[220.5,245.5,370.5,398.0],[220.5,245.5,370.5,397.75],[220.5,245.5,370.5,397.5],[220.5,245.5,370.5,397.5],[220.5,244.5,371.5,397.5],[220.5,245.5,371.5,397.5],[221.5,245.5,371.5,397.5],[221.5,245.5,371.5,398.5],[221.5,244.5,371.5,397.5],[221.5,244.5,371.5,397.5],[221.5,245.5,371.5,397.5],[221.5,245.5,372.5,398.5],[221.5,245.5,372.5,398.5],[221.5,245.5,371.5,398.5],[221.5,245.5,371.5,398.5],[221.5,245.5,371.5,398.5],[222.5,245.75,372.5,398.5],[222.5,245.75,372.5,398.5],[222.5,246.0,372.5,398.5],[222.5,246.25,372.5,398.5],[222.5,246.5,372.5,398.5],[221.5,246.5,372.5,399.5],[221.5,246.5,372.5,399.5],[222.5,246.5,373.5,399.5],[222.5,246.5,373.5,400.5],[222.5,246.5,374.5,400.5],[222.5,246.5,374.5,400.5],[222.5,246.5,374.5,400.5],[222.5,246.5,374.5,400.5],[222.5,246.5,374.5,400.5],[222.5,247.5,374.5,400.5],[222.5,247.5,374.5,400.5],[222.5,247.5,374.5,401.5],[222.5,247.5,374.5,401.5],[222.5,247.5,374.5,401.5],[222.75,247.75,374.5,401.5],[223.0,248.0,374.5,401.5],[223.25,248.25,374.5,401.5],[223.5,248.5,374.5,401.5],[223.5,248.5,374.5,401.5],[223.5,248.5,375.5,401.5],[223.5,248.5,375.5,401.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,402.5],[224.5,248.5,375.5,402.5],[224.5,248.5,375.5,403.5],[224.5,247.5,375.5,403.5],[224.5,247.5,375.5,403.5],[223.5,248.5,376.5,403.5],[223.5,248.5,376.5,403.5],[223.5,248.5,376.25,403.5],[223.5,248.5,376.0,403.5],[223.5,248.5,375.75,403.5],[223.5,248.5,375.5,403.5],[223.5,248.5,375.5,403.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,403.5],[222.5,248.5,375.5,402.5],[222.5,248.5,375.5,403.5],[223.5,248.5,375.5,403.5],[223.5,248.5,375.5,403.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,403.5],[223.5,248.5,375.5,402.5],[223.5,248.5,375.5,402.5],[223.5,248.25,375.5,402.5],[223.5,248.25,375.5,402.25],[223.5,248.0,375.5,402.0],[223.5,247.75,375.5,401.75],[223.5,247.5,375.5,401.75],[223.5,246.5,375.5,401.5],[223.5,246.5,375.5,402.5],[223.5,247.5,375.5,401.5],[223.5,247.5,374.5,402.5],[223.5,247.5,374.5,401.5],[223.5,247.5,374.5,401.5],[222.5,246.5,374.5,401.5],[222.5,246.5,374.5,401.5],[223.5,247.5,374.5,400.5],[223.5,247.5,374.5,400.5],[222.5,247.5,373.5,400.5],[222.5,247.5,373.5,400.5],[222.5,247.5,373.5,400.5],[222.5,247.5,373.5,399.75],[222.5,247.5,373.5,399.75],[222.5,247.5,373.5,400.0],[222.5,247.5,373.5,400.25],[222.5,247.5,373.5,400.5],[222.5,246.5,373.5,400.5],[222.5,246.5,373.5,400.5],[222.5,246.5,373.5,400.5],[221.5,246.5,373.5,400.5],[221.5,246.5,373.5,400.5],[221.5,246.5,373.5,400.5],[221.5,246.5,373.5,399.5],[221.5,246.5,372.5,399.5],[221.5,246.5,372.5,399.5],[221.5,245.5,372.5,399.5],[221.5,245.5,372.5,399.5],[221.5,245.5,371.5,398.5],[220.5,245.5,371.5,398.5],[220.5,245.5,371.5,398.5],[220.5,245.25,371.25,398.25],[220.5,245.0,371.0,398.0],[220.5,244.75,370.75,397.75],[220.5,244.5,370.75,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,370.5,397.5],[220.5,244.5,369.5,397.5],[220.5,244.5,369.5,396.5],[219.5,244.5,369.5,396.5],[219.5,244.5,369.5,396.5],[219.5,244.5,369.5,396.5],[219.5,244.5,369.5,396.5],[219.5,243.5,369.5,396.5],[218.5,243.5,369.5,396.5],[218.5,243.5,368.5,396.5],[219.25,243.5,368.5,396.5],[219.25,243.5,368.5,396.5],[219.0,243.5,368.5,396.5],[218.75,243.5,368.5,396.5],[218.5,243.5,368.5,396.5],[218.5,242.5,368.5,396.5],[218.5,242.5,368.5,396.5],[218.5,242.5,368.5,396.5],[218.5,242.5,368.5,396.5],[218.5,242.5,368.5,396.5],[218.5,242.5,367.5,396.5],[218.5,242.5,367.5,395.5],[218.5,242.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,241.5,367.5,395.5],[218.5,241.5,367.5,395.5],[218.5,241.5,367.5,395.5],[217.5,241.5,367.5,394.5],[217.5,241.5,367.5,394.75],[217.5,241.75,367.5,394.75],[217.5,242.0,367.5,395.0],[217.5,242.25,367.5,395.25],[217.5,242.25,367.5,395.25],[217.5,242.5,367.5,394.5],[217.5,242.5,367.5,394.5],[217.5,242.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,241.5,367.5,395.5],[217.5,242.5,367.5,395.5],[217.5,242.5,367.5,394.5],[217.5,242.5,367.5,394.5],[218.5,242.25,367.5,395.5],[218.5,242.25,367.5,395.5],[218.5,242.0,367.5,395.5],[218.5,241.75,367.5,395.5],[218.5,241.75,367.5,395.5],[218.5,242.5,367.5,395.5],[218.5,242.5,367.5,395.5],[218.5,242.5,367.5,396.5],[217.5,242.5,367.5,396.5],[217.5,242.5,368.5,396.5],[218.5,242.5,368.5,396.5],[218.5,242.5,369.5,396.5],[218.5,242.5,369.5,397.5],[218.5,242.5,369.5,397.5],[218.5,243.5,369.5,397.5],[218.5,242.5,369.5,397.5],[218.5,243.5,369.5,397.5],[218.5,243.5,369.5,397.5],[218.5,243.5,370.5,398.5],[218.75,243.5,370.5,398.75],[219.0,243.5,370.5,399.0],[219.25,243.5,370.5,399.25],[219.25,243.5,370.5,399.5],[219.5,243.5,370.5,399.5],[219.5,243.5,371.5,399.5],[219.5,244.5,371.5,400.5],[219.5,244.5,371.5,400.5],[219.5,244.5,372.5,400.5],[219.5,244.5,372.5,401.5],[219.5,244.5,373.5,401.5],[220.5,244.5,373.5,401.5],[220.5,245.5,373.5,402.5],[220.5,245.5,373.5,402.5],[220.5,245.5,374.5,402.5],[220.5,245.5,374.5,402.5],[221.5,245.5,374.5,403.5],[221.5,246.5,374.5,403.5],[221.75,246.5,374.75,403.75],[222.0,246.5,375.0,404.0],[222.25,246.5,375.25,404.25],[222.5,246.5,375.5,404.5],[222.5,247.5,377.5,404.5],[222.5,247.5,377.5,404.5],[222.5,247.5,377.5,405.5],[223.5,247.5,377.5,405.5],[223.5,248.5,377.5,405.5],[223.5,248.5,378.5,406.5],[224.5,249.5,378.5,406.5],[224.5,249.5,379.5,406.5],[224.5,249.5,379.5,407.5],[224.5,249.5,379.5,407.5],[225.5,249.5,379.5,408.5],[225.5,249.5,379.5,408.5],[225.5,250.5,379.5,408.5],[225.5,250.5,380.5,409.5],[225.5,250.5,380.75,409.75],[225.5,250.5,381.0,410.0],[225.5,250.5,381.25,410.25],[225.5,250.5,381.5,410.5],[226.5,251.5,381.5,410.5],[226.5,251.5,382.5,411.5],[226.5,251.5,382.5,411.5],[226.5,252.5,383.5,412.5],[226.5,252.5,383.5,412.5],[227.5,252.5,383.5,412.5],[227.5,252.5,384.5,413.5],[227.5,252.5,384.5,413.5],[227.5,252.5,384.5,413.5],[228.5,253.5,385.5,414.5],[228.5,253.5,385.5,414.5],[228.5,253.5,385.5,414.5],[228.5,253.5,385.5,414.5],[228.5,254.5,386.5,415.5],[228.75,254.5,386.75,415.75],[229.0,254.5,387.0,416.0],[229.25,254.5,387.25,416.25],[229.5,254.5,387.5,416.5],[229.5,254.5,387.5,416.5],[229.5,255.5,387.5,416.5],[229.5,255.5,387.5,417.5],[229.5,255.5,387.5,417.5],[229.5,255.5,388.5,417.5],[229.5,255.5,388.5,417.5]];
begin
 a:=atan2(dx,-dy);if a<0 then a:=a+2*pi();end if;
 s:=a/(pi()/10);degrees:=a*180/pi();i:=floor(degrees)::integer%360;f:=degrees-floor(degrees);
 for j in 1..4 loop bands[j]:=rings[i+1][j]*(1-f)+rings[(i+1)%360+1][j]*f;end loop;
 foreach edge in array array[18.5,45.0,bands[1],bands[2],bands[3],bands[4]] loop
  if abs(r-edge)<=wire then return jsonb_build_object('score',0,'label','BOUNCER','double',false);end if;
 end loop;
 divider_distance:=abs(sin((s-floor(s)-0.5)*pi()/10))*r;
 if r>=45-wire and r<=bands[4]+wire and divider_distance<=wire then
  return jsonb_build_object('score',0,'label','BOUNCER','double',false);
 end if;
 if r>bands[4] then return jsonb_build_object('score',0,'label','MISS','double',false);end if;
 if r<18.5 then return jsonb_build_object('score',50,'label','BULL','double',true);end if;
 if r<45 then return jsonb_build_object('score',25,'label','25','double',false);end if;
 n:=ord[floor(s+0.5)::integer%20+1];
 m:=case when r>bands[3] then 2 when r>bands[1] and r<bands[2] then 3 else 1 end;
 return jsonb_build_object('score',n*m,'label',(case m when 2 then 'D' when 3 then 'T' else '' end)||n,'double',m=2);
end $$;

create or replace function public.sprint_player() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=sprint_private.require_player(); result jsonb;
begin
 select jsonb_build_object('name',p.name,'avatar_url',p.avatar_url) into result from public.players p where p.user_id=u;
 return result;
end $$;

create or replace function public.sprint_start(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=sprint_private.require_player(); g sprint_private.games;
begin
 if p_request_id is null then raise exception 'Missing request ID.'; end if;
 -- Serialize starts for this account, including starts from another tab.
 perform pg_advisory_xact_lock(hashtextextended(u::text,501));
 select * into g from sprint_private.games where user_id=u and start_request=p_request_id;
 if found then return sprint_private.snapshot(g); end if;
 update sprint_private.games set status='abandoned' where user_id=u and status='active';
 -- Bound abandoned-session storage without removing results.
 delete from sprint_private.games where user_id=u and status='abandoned' and started_at<clock_timestamp()-interval '7 days';
 insert into sprint_private.games(user_id,start_request) values(u,p_request_id) returning * into g;
 return sprint_private.snapshot(g);
end $$;

create or replace function public.sprint_throw(p_game_id uuid,p_request_id uuid,p_aim_x double precision,p_aim_y double precision,p_power double precision) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=sprint_private.require_player(); g sprint_private.games; old_response jsonb; hit jsonb; response jsonb;
 x double precision; y double precision; spread double precision; points integer; next_score integer;
 bust boolean; done boolean; now_at timestamptz:=clock_timestamp();
begin
 if p_request_id is null or p_aim_x is null or p_aim_y is null or p_power is null
 or not(p_aim_x between 150 and 1090) or not(p_aim_y between 110 and 1100) or not(p_power between 0 and 1) then
 raise exception 'Invalid throw input.' using errcode='22023'; end if;
 select * into g from sprint_private.games where id=p_game_id and user_id=u for update;
 if not found then raise exception 'Game not found for this player.' using errcode='42501'; end if;
 select s.response into old_response from sprint_private.shots s where s.game_id=g.id and s.request_id=p_request_id;
 if found then return old_response; end if;
 if g.status<>'active' or g.pending_collect then raise exception 'This game is not ready for another dart.'; end if;
 if now_at-g.started_at>interval '24 hours' or g.total_darts>=1000 then raise exception 'This leg has expired. Start a new leg.'; end if;
 if now_at-coalesce(g.last_shot_at,g.started_at)<make_interval(secs=>greatest(0.45,p_power*(0.65/1.2))) then
 raise exception 'Throw arrived before its charge could finish. Try again.'; end if;
 -- Server, not browser, chooses dispersion and calculates every score.
 -- Below 20% on the oscillating gauge, the dart falls short of the scoring surface.
 -- It still consumes a dart: tapping cannot be used for free retries or bull farming.
 if p_power<0.20 then
  x:=p_aim_x+(random()+random()-1)*60;
  y:=1125+random()*40;
 else
  -- Preserve the green timing window; increasingly penalise poor power control.
  spread:=6.5+abs(p_power-0.50)*24+power(greatest(0,abs(p_power-0.50)-0.04),2)*500;
  x:=p_aim_x+(random()+random()-1)*spread;
  y:=p_aim_y+(0.50-p_power)*411*0.78+(random()+random()-1)*spread;
 end if;
 hit:=sprint_private.score_at(x,y); points:=(hit->>'score')::integer;
 next_score:=g.remaining-points;
 bust:=next_score<0 or next_score=1 or (next_score=0 and not (hit->>'double')::boolean);
 done:=next_score=0 and not bust;
 if g.first_shot_at is null then g.first_shot_at:=now_at; end if;
 g.total_darts:=g.total_darts+1; g.darts_in_visit:=g.darts_in_visit+1;
 g.remaining:=case when bust then g.visit_start else next_score end;
 g.visit_score:=case when bust then 0 else g.visit_start-g.remaining end;
 g.pending_collect:=bust or done or g.darts_in_visit=3;
 g.last_shot_at:=now_at;
 if g.pending_collect and not bust then g.highest_visit:=greatest(g.highest_visit,g.visit_score); end if;
 if done then
  g.status:='completed';g.completed_at:=now_at;
  g.elapsed_ms:=floor(extract(epoch from(now_at-g.first_shot_at))*1000)::bigint;
  g.checkout_score:=g.visit_start;
 end if;
 update sprint_private.games set remaining=g.remaining,visit_score=g.visit_score,total_darts=g.total_darts,
 darts_in_visit=g.darts_in_visit,pending_collect=g.pending_collect,last_shot_at=g.last_shot_at,first_shot_at=g.first_shot_at,
 highest_visit=g.highest_visit,status=g.status,completed_at=g.completed_at,elapsed_ms=g.elapsed_ms,checkout_score=g.checkout_score where id=g.id;
 response:=sprint_private.snapshot(g)||jsonb_build_object('hit',hit||jsonb_build_object('x',x,'y',y,'bust',bust));
 insert into sprint_private.shots(game_id,request_id,dart_no,visit_no,x,y,score,label,is_bust,response)
 values(g.id,p_request_id,g.total_darts,g.visit_no,x,y,points,hit->>'label',bust,response);
 return response;
end $$;

create or replace function public.sprint_collect(p_game_id uuid,p_visit_no integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=sprint_private.require_player();g sprint_private.games;
begin
 select * into g from sprint_private.games where id=p_game_id and user_id=u for update;
 if not found then raise exception 'Game not found for this player.' using errcode='42501'; end if;
 if p_visit_no is null or p_visit_no<1 then raise exception 'Invalid visit.'; end if;
 if g.visit_no=p_visit_no+1 then return sprint_private.snapshot(g); end if;
 if g.status<>'active' or not g.pending_collect or g.visit_no<>p_visit_no then raise exception 'Visit is not ready to collect.'; end if;
 update sprint_private.games set visit_no=visit_no+1,visit_start=remaining,visit_score=0,darts_in_visit=0,pending_collect=false where id=g.id returning * into g;
 return sprint_private.snapshot(g);
end $$;

create or replace function public.sprint_leaderboard() returns table(
 rank bigint,player_name text,avatar_url text,darts integer,elapsed_ms bigint,
 three_dart_average numeric,highest_visit integer,checkout_score integer,completed_at timestamptz
)
language sql stable security definer set search_path='' as $$
 with best as (
  select distinct on(g.user_id) g.* from sprint_private.games g
  where g.status='completed' and g.rules_version='spl501-v1'
  order by g.user_id,g.total_darts,g.elapsed_ms,g.completed_at,g.id
 )
 select dense_rank() over(order by b.total_darts,b.elapsed_ms),p.name::text,p.avatar_url::text,
 b.total_darts,b.elapsed_ms,round(1503.0/b.total_darts,2),b.highest_visit,b.checkout_score,b.completed_at
 from best b join public.players p on p.user_id=b.user_id
 order by b.total_darts,b.elapsed_ms,b.completed_at,p.name limit 100;
$$;

revoke all on all functions in schema sprint_private from public,anon,authenticated;
revoke all on function public.sprint_player(),public.sprint_start(uuid),public.sprint_throw(uuid,uuid,double precision,double precision,double precision),public.sprint_collect(uuid,integer),public.sprint_leaderboard() from public,anon,authenticated;
grant execute on function public.sprint_player(),public.sprint_start(uuid),public.sprint_throw(uuid,uuid,double precision,double precision,double precision),public.sprint_collect(uuid,integer) to authenticated;
grant execute on function public.sprint_leaderboard() to anon,authenticated;
notify pgrst,'reload schema';
commit;
