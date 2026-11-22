-- =============================================================================
-- Painel da Mentoria Marmaris — esquema inicial
-- Regra central: o mentorado nunca vê dados de outro mentorado nem a parte
-- comercial/financeira. Garantido aqui via Row Level Security (RLS).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type perfil_usuario as enum ('admin', 'equipe', 'mentorado');

create type status_lead as enum (
  'novo_contato', 'aplicacao_recebida', 'call_agendada',
  'proposta_enviada', 'negociacao', 'fechado', 'perdido'
);

create type forma_pagamento as enum ('a_vista', 'parcelado');
create type status_parcela as enum ('pendente', 'pago', 'atrasado');

create type status_marketing as enum (
  'ideia', 'roteiro', 'producao', 'aprovacao', 'agendado', 'publicado'
);
create type formato_marketing as enum ('reels', 'stories', 'carrossel', 'anuncio', 'pagina');

create type tipo_material as enum ('documento', 'video', 'planilha', 'link', 'arquivo');

create type status_tarefa as enum ('a_fazer', 'em_andamento', 'concluida');
create type lado_tarefa as enum ('mentorado', 'marmaris');

create type status_plano as enum ('pendente', 'em_andamento', 'concluido', 'atrasado');

create type periodo_indicador as enum ('inicio', 'mes_1', 'mes_2', 'mes_3');

create type sinal_saude as enum ('verde', 'amarelo', 'vermelho');

create type status_continuacao as enum ('vai_renovar', 'nao_vai', 'em_negociacao', 'indefinido');

create type tipo_modelo as enum ('onboarding', 'plano_3_meses', 'pauta_reuniao');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Gestão: turmas, perfis, listas fixas, modelos
-- -----------------------------------------------------------------------------
create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_inicio date,
  data_fim date,
  vagas int not null default 5,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.mentorados (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid references public.turmas(id) on delete set null,
  nome_agencia text not null,
  cidade text,
  uf char(2),
  dono text,
  equipe text,
  faturamento_aprox numeric(14,2),
  ticket_medio numeric(14,2),
  canais text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger mentorados_updated_at before update on public.mentorados
  for each row execute function public.set_updated_at();

-- Perfil de cada usuário autenticado (1:1 com auth.users)
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  perfil perfil_usuario not null default 'mentorado',
  -- Mentorado fica vinculado a uma agência. Uma agência pode ter vários logins.
  mentorado_id uuid references public.mentorados(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint perfil_mentorado_coerente check (
    (perfil = 'mentorado' and mentorado_id is not null)
    or (perfil <> 'mentorado')
  )
);

create table public.motivos_perda (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table public.origens_lead (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table public.pilares_biblioteca (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem int not null default 0,
  ativo boolean not null default true
);

-- Modelos: checklist de onboarding, plano de 3 meses, pauta de reunião.
-- itens: jsonb array. Ex.: [{"titulo": "...", "ordem": 1, "mes": 1, "semana": 1}]
create table public.modelos (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_modelo not null,
  nome text not null,
  itens jsonb not null default '[]'::jsonb,
  padrao boolean not null default false,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Vender: leads, documentos de venda, financeiro
-- -----------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid references public.turmas(id) on delete set null,
  nome text not null,
  agencia text,
  cidade text,
  uf char(2),
  origem_id uuid references public.origens_lead(id),
  faturamento_aprox numeric(14,2),
  data_call timestamptz,
  proximo_passo text,
  status status_lead not null default 'novo_contato',
  motivo_perda_id uuid references public.motivos_perda(id),
  motivo_perda_texto text,
  lista_espera boolean not null default false,
  mentorado_id uuid references public.mentorados(id) on delete set null,
  responsavel_id uuid references public.perfis(id) on delete set null,
  ordem int not null default 0,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Ao mover para Perdido, o motivo é obrigatório
  constraint perdido_exige_motivo check (
    status <> 'perdido' or motivo_perda_id is not null or coalesce(motivo_perda_texto, '') <> ''
  )
);
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create table public.documentos_venda (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null, -- ficha da oferta, proposta, pitch, formulário, roteiro whatsapp, faq, contrato
  versao text not null default '1.0',
  url text,
  arquivo_path text, -- caminho no Storage (bucket "documentos")
  observacoes text,
  atualizado_por uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger documentos_venda_updated_at before update on public.documentos_venda
  for each row execute function public.set_updated_at();

create table public.financeiro (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null unique references public.mentorados(id) on delete cascade,
  forma_pagamento forma_pagamento not null default 'a_vista',
  valor_total numeric(14,2) not null default 37000,
  num_parcelas int not null default 1 check (num_parcelas between 1 and 10),
  nota_fiscal_emitida boolean not null default false,
  contrato_assinado boolean not null default false,
  interesse_continuacao boolean not null default false,
  valor_continuacao numeric(14,2),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger financeiro_updated_at before update on public.financeiro
  for each row execute function public.set_updated_at();

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  financeiro_id uuid not null references public.financeiro(id) on delete cascade,
  numero int not null,
  valor numeric(14,2) not null,
  vencimento date not null,
  status status_parcela not null default 'pendente',
  pago_em date,
  unique (financeiro_id, numero)
);

-- -----------------------------------------------------------------------------
-- Entregar: marketing, onboarding, biblioteca
-- -----------------------------------------------------------------------------
create table public.marketing_conteudos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  formato formato_marketing not null default 'reels',
  responsavel_id uuid references public.perfis(id) on delete set null,
  data_publicacao date,
  roteiro text, -- texto rico (HTML/markdown)
  anexos text[] not null default '{}', -- caminhos no Storage (bucket "marketing")
  link_post text,
  status status_marketing not null default 'ideia',
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger marketing_updated_at before update on public.marketing_conteudos
  for each row execute function public.set_updated_at();

create table public.onboarding_itens (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  titulo text not null,
  ordem int not null default 0,
  concluido boolean not null default false,
  concluido_em timestamptz,
  concluido_por uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.biblioteca_itens (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo tipo_material not null default 'documento',
  pilar_id uuid references public.pilares_biblioteca(id) on delete set null,
  url text,
  arquivo_path text, -- bucket "biblioteca"
  liberado boolean not null default false,
  liberar_semana int, -- opcional: libera a partir da semana X da mentoria
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger biblioteca_updated_at before update on public.biblioteca_itens
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Acompanhar: pasta do mentorado
-- -----------------------------------------------------------------------------
create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  respostas jsonb not null default '{}'::jsonb, -- formulário de dezembro
  notas_reuniao text,
  data_reuniao date,
  visivel_mentorado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger diagnosticos_updated_at before update on public.diagnosticos
  for each row execute function public.set_updated_at();

create table public.plano_itens (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  mes int not null check (mes between 1 and 3),
  semana int check (semana between 1 and 12),
  titulo text not null,
  descricao text,
  status status_plano not null default 'pendente',
  visivel_mentorado boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plano_itens_updated_at before update on public.plano_itens
  for each row execute function public.set_updated_at();

create table public.reunioes (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  data timestamptz not null,
  duracao_min int not null default 120,
  pauta text,
  ata text,
  link_gravacao text,
  decisoes text,
  plano_acao text,
  realizada boolean not null default false,
  visivel_mentorado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger reunioes_updated_at before update on public.reunioes
  for each row execute function public.set_updated_at();

-- Tarefas: da agência (mentorado_id preenchido) ou internas da Marmaris (null)
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid references public.mentorados(id) on delete cascade,
  titulo text not null,
  descricao text,
  lado lado_tarefa not null default 'marmaris',
  responsavel_id uuid references public.perfis(id) on delete set null,
  prazo date,
  status status_tarefa not null default 'a_fazer',
  visivel_mentorado boolean not null default true,
  ordem int not null default 0,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tarefas_updated_at before update on public.tarefas
  for each row execute function public.set_updated_at();

create table public.indicadores (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  periodo periodo_indicador not null,
  faturamento numeric(14,2),
  num_vendas int,
  leads int,
  conversao numeric(6,2),
  ticket_medio numeric(14,2),
  pct_recorrencia numeric(6,2),
  seguidores int,
  observacoes text,
  updated_at timestamptz not null default now(),
  unique (mentorado_id, periodo)
);
create trigger indicadores_updated_at before update on public.indicadores
  for each row execute function public.set_updated_at();

-- Checklist do que foi liberado: CRM, sistema de gestão, fornecedores, parceiros...
create table public.acessos (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  item text not null,
  liberado boolean not null default false,
  liberado_em date,
  observacoes text,
  ordem int not null default 0
);

-- Notas do Alberto sobre a agência e avaliação de risco. Nunca visível ao mentorado.
create table public.notas_internas (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  autor_id uuid references public.perfis(id) on delete set null,
  texto text not null,
  risco sinal_saude,
  created_at timestamptz not null default now()
);

create table public.arquivos (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  nome text not null,
  arquivo_path text not null, -- bucket "arquivos-mentorados"
  tipo text,
  visivel_mentorado boolean not null default true,
  enviado_por uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Pós-mentoria
-- -----------------------------------------------------------------------------
create table public.pos_mentoria (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null unique references public.mentorados(id) on delete cascade,
  nps int check (nps between 0 and 10),
  depoimento_texto text,
  depoimento_url text,
  autoriza_case boolean,
  status_continuacao status_continuacao not null default 'indefinido',
  acessos_revogados boolean not null default false,
  grupo_arquivado boolean not null default false,
  pasta_arquivada boolean not null default false,
  respondido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger pos_mentoria_updated_at before update on public.pos_mentoria
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
create index on public.perfis (mentorado_id);
create index on public.leads (status);
create index on public.leads (data_call);
create index on public.parcelas (status, vencimento);
create index on public.marketing_conteudos (status);
create index on public.onboarding_itens (mentorado_id);
create index on public.plano_itens (mentorado_id);
create index on public.reunioes (mentorado_id, data);
create index on public.tarefas (mentorado_id);
create index on public.tarefas (responsavel_id, prazo);
create index on public.indicadores (mentorado_id);
create index on public.acessos (mentorado_id);
create index on public.notas_internas (mentorado_id);
create index on public.arquivos (mentorado_id);

-- -----------------------------------------------------------------------------
-- Funções de contexto do usuário (usadas nas policies)
-- security definer para não entrar em recursão com a RLS de perfis
-- -----------------------------------------------------------------------------
create or replace function public.meu_perfil()
returns perfil_usuario
language sql stable security definer set search_path = public as $$
  select perfil from public.perfis where id = auth.uid() and ativo
$$;

create or replace function public.meu_mentorado_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select mentorado_id from public.perfis where id = auth.uid() and ativo
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.meu_perfil() = 'admin'
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select public.meu_perfil() in ('admin', 'equipe')
$$;

create or replace function public.is_meu_mentorado(p_mentorado_id uuid)
returns boolean language sql stable as $$
  select public.meu_perfil() = 'mentorado' and public.meu_mentorado_id() = p_mentorado_id
$$;

-- -----------------------------------------------------------------------------
-- Criar perfil automaticamente quando um usuário é criado no Auth
-- O perfil/mentorado_id são ajustados depois pelo admin em Configurações.
-- -----------------------------------------------------------------------------
create or replace function public.handle_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, email, nome, perfil, mentorado_id, ativo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'perfil')::perfil_usuario, 'equipe'),
    nullif(new.raw_user_meta_data->>'mentorado_id', '')::uuid,
    true
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- -----------------------------------------------------------------------------
-- Converter lead em mentorado (ao mover para "Fechado")
-- Cria a pasta (mentorado), o checklist de onboarding, acessos e o financeiro.
-- -----------------------------------------------------------------------------
create or replace function public.converter_lead_em_mentorado(p_lead_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_lead public.leads%rowtype;
  v_mentorado_id uuid;
  v_modelo jsonb;
  v_item jsonb;
  v_fin_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'Lead % não encontrado', p_lead_id;
  end if;
  if v_lead.mentorado_id is not null then
    return v_lead.mentorado_id;
  end if;

  insert into public.mentorados (turma_id, nome_agencia, cidade, uf, dono, faturamento_aprox)
  values (v_lead.turma_id, coalesce(v_lead.agencia, v_lead.nome), v_lead.cidade, v_lead.uf, v_lead.nome, v_lead.faturamento_aprox)
  returning id into v_mentorado_id;

  update public.leads set mentorado_id = v_mentorado_id, status = 'fechado' where id = p_lead_id;

  -- Checklist de onboarding a partir do modelo padrão
  select itens into v_modelo from public.modelos
   where tipo = 'onboarding' and padrao order by created_at limit 1;
  if v_modelo is not null then
    for v_item in select * from jsonb_array_elements(v_modelo) loop
      insert into public.onboarding_itens (mentorado_id, titulo, ordem)
      values (v_mentorado_id, v_item->>'titulo', coalesce((v_item->>'ordem')::int, 0));
    end loop;
  end if;

  -- Checklist de acessos padrão
  insert into public.acessos (mentorado_id, item, ordem) values
    (v_mentorado_id, 'CRM', 1),
    (v_mentorado_id, 'Sistema de gestão', 2),
    (v_mentorado_id, 'Cadastro nos fornecedores', 3),
    (v_mentorado_id, 'Parceiros acionados', 4),
    (v_mentorado_id, 'Equipe de roteiros', 5),
    (v_mentorado_id, 'Buscador de fornecedores', 6);

  -- Registro financeiro padrão (ajustado depois pelo admin)
  insert into public.financeiro (mentorado_id) values (v_mentorado_id) returning id into v_fin_id;
  insert into public.parcelas (financeiro_id, numero, valor, vencimento)
  values (v_fin_id, 1, 37000, current_date + 7);

  insert into public.pos_mentoria (mentorado_id) values (v_mentorado_id);

  return v_mentorado_id;
end $$;

-- Dispara a conversão automaticamente quando o status vira "fechado"
create or replace function public.trg_lead_fechado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'fechado' and (old.status is distinct from 'fechado') and new.mentorado_id is null then
    perform public.converter_lead_em_mentorado(new.id);
  end if;
  return new;
end $$;

create trigger leads_fechado after update of status on public.leads
  for each row execute function public.trg_lead_fechado();

-- -----------------------------------------------------------------------------
-- Gerar plano de 3 meses a partir do modelo padrão
-- -----------------------------------------------------------------------------
create or replace function public.gerar_plano_do_modelo(p_mentorado_id uuid, p_modelo_id uuid default null)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_modelo jsonb;
  v_item jsonb;
  v_count int := 0;
begin
  if not public.is_staff() then
    raise exception 'Sem permissão';
  end if;
  if p_modelo_id is not null then
    select itens into v_modelo from public.modelos where id = p_modelo_id;
  else
    select itens into v_modelo from public.modelos
     where tipo = 'plano_3_meses' and padrao order by created_at limit 1;
  end if;
  if v_modelo is null then return 0; end if;
  for v_item in select * from jsonb_array_elements(v_modelo) loop
    insert into public.plano_itens (mentorado_id, mes, semana, titulo, descricao, ordem)
    values (
      p_mentorado_id,
      coalesce((v_item->>'mes')::int, 1),
      (v_item->>'semana')::int,
      v_item->>'titulo',
      v_item->>'descricao',
      coalesce((v_item->>'ordem')::int, 0)
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- -----------------------------------------------------------------------------
-- Desativar acesso de um mentorado (fim da mentoria), sem apagar histórico
-- -----------------------------------------------------------------------------
create or replace function public.desativar_mentorado(p_mentorado_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;
  update public.perfis set ativo = false where mentorado_id = p_mentorado_id;
  update public.mentorados set ativo = false where id = p_mentorado_id;
  update public.pos_mentoria set acessos_revogados = true where mentorado_id = p_mentorado_id;
end $$;

-- -----------------------------------------------------------------------------
-- Semana atual da mentoria para um mentorado (1..12), a partir da turma
-- -----------------------------------------------------------------------------
create or replace function public.semana_atual(p_mentorado_id uuid)
returns int language sql stable as $$
  select greatest(1, least(12,
    floor((current_date - t.data_inicio) / 7)::int + 1))
  from public.mentorados m
  join public.turmas t on t.id = m.turma_id
  where m.id = p_mentorado_id
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.turmas               enable row level security;
alter table public.mentorados           enable row level security;
alter table public.perfis               enable row level security;
alter table public.motivos_perda        enable row level security;
alter table public.origens_lead         enable row level security;
alter table public.pilares_biblioteca   enable row level security;
alter table public.modelos              enable row level security;
alter table public.leads                enable row level security;
alter table public.documentos_venda     enable row level security;
alter table public.financeiro           enable row level security;
alter table public.parcelas             enable row level security;
alter table public.marketing_conteudos  enable row level security;
alter table public.onboarding_itens     enable row level security;
alter table public.biblioteca_itens     enable row level security;
alter table public.diagnosticos         enable row level security;
alter table public.plano_itens          enable row level security;
alter table public.reunioes             enable row level security;
alter table public.tarefas              enable row level security;
alter table public.indicadores          enable row level security;
alter table public.acessos              enable row level security;
alter table public.notas_internas       enable row level security;
alter table public.arquivos             enable row level security;
alter table public.pos_mentoria         enable row level security;

-- Perfis: cada um vê o próprio; staff vê todos; só admin edita
create policy perfis_select on public.perfis for select
  using (id = auth.uid() or public.is_staff());
create policy perfis_admin_all on public.perfis for all
  using (public.is_admin()) with check (public.is_admin());

-- Turmas e listas fixas: staff lê, admin edita. Mentorado lê a própria turma.
create policy turmas_select on public.turmas for select
  using (public.is_staff() or id = (select turma_id from public.mentorados where id = public.meu_mentorado_id()));
create policy turmas_admin on public.turmas for all
  using (public.is_admin()) with check (public.is_admin());

create policy motivos_select on public.motivos_perda for select using (public.is_staff());
create policy motivos_admin on public.motivos_perda for all using (public.is_admin()) with check (public.is_admin());

create policy origens_select on public.origens_lead for select using (public.is_staff());
create policy origens_admin on public.origens_lead for all using (public.is_admin()) with check (public.is_admin());

create policy pilares_select on public.pilares_biblioteca for select using (auth.uid() is not null);
create policy pilares_admin on public.pilares_biblioteca for all using (public.is_admin()) with check (public.is_admin());

create policy modelos_select on public.modelos for select using (public.is_staff());
create policy modelos_admin on public.modelos for all using (public.is_admin()) with check (public.is_admin());

-- Mentorados: staff tudo; mentorado só a própria agência (leitura)
create policy mentorados_staff on public.mentorados for all
  using (public.is_staff()) with check (public.is_staff());
create policy mentorados_proprio on public.mentorados for select
  using (public.is_meu_mentorado(id));

-- Comercial: admin edita, equipe lê. Mentorado sem acesso.
create policy leads_admin on public.leads for all
  using (public.is_admin()) with check (public.is_admin());
create policy leads_equipe_select on public.leads for select
  using (public.is_staff());

-- Documentos de venda: admin e equipe veem e editam
create policy docs_venda_staff on public.documentos_venda for all
  using (public.is_staff()) with check (public.is_staff());

-- Financeiro: só admin
create policy financeiro_admin on public.financeiro for all
  using (public.is_admin()) with check (public.is_admin());
create policy parcelas_admin on public.parcelas for all
  using (public.is_admin()) with check (public.is_admin());

-- Marketing: admin e equipe editam
create policy marketing_staff on public.marketing_conteudos for all
  using (public.is_staff()) with check (public.is_staff());

-- Onboarding: staff tudo; mentorado vê e marca o próprio checklist
create policy onboarding_staff on public.onboarding_itens for all
  using (public.is_staff()) with check (public.is_staff());
create policy onboarding_proprio_select on public.onboarding_itens for select
  using (public.is_meu_mentorado(mentorado_id));
create policy onboarding_proprio_update on public.onboarding_itens for update
  using (public.is_meu_mentorado(mentorado_id))
  with check (public.is_meu_mentorado(mentorado_id));

-- Biblioteca: staff tudo; mentorado só o que está liberado
create policy biblioteca_staff on public.biblioteca_itens for all
  using (public.is_staff()) with check (public.is_staff());
create policy biblioteca_mentorado on public.biblioteca_itens for select
  using (
    public.meu_perfil() = 'mentorado'
    and liberado
    and (liberar_semana is null or liberar_semana <= public.semana_atual(public.meu_mentorado_id()))
  );

-- Pasta do mentorado: staff tudo; mentorado só a própria e só o que é visível
create policy diagnosticos_staff on public.diagnosticos for all
  using (public.is_staff()) with check (public.is_staff());
create policy diagnosticos_proprio on public.diagnosticos for select
  using (public.is_meu_mentorado(mentorado_id) and visivel_mentorado);

create policy plano_staff on public.plano_itens for all
  using (public.is_staff()) with check (public.is_staff());
create policy plano_proprio on public.plano_itens for select
  using (public.is_meu_mentorado(mentorado_id) and visivel_mentorado);

create policy reunioes_staff on public.reunioes for all
  using (public.is_staff()) with check (public.is_staff());
create policy reunioes_proprio on public.reunioes for select
  using (public.is_meu_mentorado(mentorado_id) and visivel_mentorado);

-- Tarefas: staff tudo; mentorado vê as da própria agência e pode concluir as do lado dele
create policy tarefas_staff on public.tarefas for all
  using (public.is_staff()) with check (public.is_staff());
create policy tarefas_proprio_select on public.tarefas for select
  using (public.is_meu_mentorado(mentorado_id) and visivel_mentorado);
create policy tarefas_proprio_update on public.tarefas for update
  using (public.is_meu_mentorado(mentorado_id) and visivel_mentorado and lado = 'mentorado')
  with check (public.is_meu_mentorado(mentorado_id) and lado = 'mentorado');

create policy indicadores_staff on public.indicadores for all
  using (public.is_staff()) with check (public.is_staff());
create policy indicadores_proprio on public.indicadores for select
  using (public.is_meu_mentorado(mentorado_id));

create policy acessos_staff on public.acessos for all
  using (public.is_staff()) with check (public.is_staff());
create policy acessos_proprio on public.acessos for select
  using (public.is_meu_mentorado(mentorado_id));

-- Notas internas: NUNCA para o mentorado
create policy notas_staff on public.notas_internas for all
  using (public.is_staff()) with check (public.is_staff());

create policy arquivos_staff on public.arquivos for all
  using (public.is_staff()) with check (public.is_staff());
create policy arquivos_proprio on public.arquivos for select
  using (public.is_meu_mentorado(mentorado_id) and visivel_mentorado);

-- Pós-mentoria: staff tudo; mentorado só responde a própria avaliação
create policy pos_staff on public.pos_mentoria for all
  using (public.is_staff()) with check (public.is_staff());
create policy pos_proprio_select on public.pos_mentoria for select
  using (public.is_meu_mentorado(mentorado_id));
create policy pos_proprio_update on public.pos_mentoria for update
  using (public.is_meu_mentorado(mentorado_id))
  with check (public.is_meu_mentorado(mentorado_id));

-- =============================================================================
-- STORAGE: buckets privados
-- =============================================================================
insert into storage.buckets (id, name, public) values
  ('documentos', 'documentos', false),
  ('biblioteca', 'biblioteca', false),
  ('marketing', 'marketing', false),
  ('arquivos-mentorados', 'arquivos-mentorados', false)
on conflict (id) do nothing;

-- Staff acessa todos os buckets
create policy storage_staff_all on storage.objects for all
  using (public.is_staff()) with check (public.is_staff());

-- Mentorado lê a biblioteca (quais itens aparecem é controlado por biblioteca_itens)
-- e a pasta da própria agência. Convenção: arquivos-mentorados/<mentorado_id>/<arquivo>
create policy storage_mentorado_biblioteca on storage.objects for select
  using (bucket_id = 'biblioteca' and public.meu_perfil() = 'mentorado');
create policy storage_mentorado_proprio on storage.objects for select
  using (
    bucket_id = 'arquivos-mentorados'
    and public.meu_perfil() = 'mentorado'
    and (storage.foldername(name))[1] = public.meu_mentorado_id()::text
  );
