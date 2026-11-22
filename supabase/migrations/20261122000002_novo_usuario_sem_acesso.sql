-- =============================================================================
-- Usuário novo sem perfil definido nasce DESATIVADO.
-- Só entra quem foi criado pelo painel (metadata com perfil e, para
-- mentorado, a agência) ou quem o admin ativar em Configurações.
-- Fecha a janela em que um usuário recém-criado no Supabase aparecia como
-- "equipe" antes de o admin ajustar o perfil.
-- =============================================================================

create or replace function public.handle_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_perfil perfil_usuario;
  v_mentorado uuid;
begin
  v_perfil := nullif(new.raw_user_meta_data->>'perfil', '')::perfil_usuario;
  v_mentorado := nullif(new.raw_user_meta_data->>'mentorado_id', '')::uuid;

  -- mentorado sem agência não é válido: cai para desativado
  if v_perfil = 'mentorado' and v_mentorado is null then
    v_perfil := null;
  end if;

  insert into public.perfis (id, email, nome, perfil, mentorado_id, ativo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(v_perfil, 'equipe'),
    case when v_perfil = 'mentorado' then v_mentorado else null end,
    v_perfil is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;
