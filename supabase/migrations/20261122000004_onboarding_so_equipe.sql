-- =============================================================================
-- Onboarding passa a ser interno da Marmaris: o mentorado não vê nem marca
-- mais o próprio checklist. Fica só a policy de admin/equipe (onboarding_staff).
-- =============================================================================

drop policy if exists onboarding_proprio_select on public.onboarding_itens;
drop policy if exists onboarding_proprio_update on public.onboarding_itens;
