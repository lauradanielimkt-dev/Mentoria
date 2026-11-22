-- =============================================================================
-- Permissões de schema para os papéis do Supabase.
-- Sem isto o papel "authenticated" recebe "permission denied for table" antes
-- mesmo de a RLS ser avaliada. A RLS continua limitando as linhas.
-- =============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Tabelas e funções criadas no futuro herdam as mesmas permissões
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;

-- O papel anon (visitante sem login) só precisa chamar o Auth; nada no schema public.
