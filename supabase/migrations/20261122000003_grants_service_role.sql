-- =============================================================================
-- Permissões para o papel service_role (chave secreta, usada só no servidor
-- para criar logins de mentorados e tarefas administrativas). O service_role
-- ignora a RLS, mas ainda precisa dos GRANTs de tabela.
-- =============================================================================

grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
