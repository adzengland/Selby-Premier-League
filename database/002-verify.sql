-- Run as postgres after the migration. This does not create test scores.
select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='sprint_private' and c.relkind='r';

select
 has_function_privilege('anon','public.sprint_start(uuid)','EXECUTE') as anon_can_start_should_be_false,
 has_function_privilege('authenticated','public.sprint_start(uuid)','EXECUTE') as signed_in_can_start_should_be_true,
 has_function_privilege('anon','public.sprint_leaderboard()','EXECUTE') as public_can_read_board_should_be_true,
 has_schema_privilege('authenticated','sprint_private','USAGE') as direct_table_access_should_be_false;

select * from public.sprint_leaderboard();
