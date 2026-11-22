-- =============================================================================
-- Seed: listas fixas, modelos padrão e a Turma 1
-- =============================================================================

insert into public.turmas (nome, data_inicio, data_fim, vagas) values
  ('Turma 1', '2027-01-11', '2027-04-11', 5)
on conflict do nothing;

insert into public.origens_lead (nome, ordem) values
  ('Instagram', 1),
  ('Indicação', 2),
  ('Anúncio', 3),
  ('WhatsApp', 4),
  ('Evento', 5),
  ('Outro', 99)
on conflict (nome) do nothing;

insert into public.motivos_perda (nome, ordem) values
  ('Preço / investimento', 1),
  ('Sem tempo para a mentoria agora', 2),
  ('Não respondeu mais', 3),
  ('Fechou com outra mentoria', 4),
  ('Perfil fora do ideal', 5),
  ('Quer entrar na próxima turma', 6),
  ('Outro', 99)
on conflict (nome) do nothing;

insert into public.pilares_biblioteca (nome, ordem) values
  ('Gestão e processos', 1),
  ('Marketing', 2),
  ('Vendas e pós-venda', 3),
  ('Financeiro', 4),
  ('Fornecedores', 5),
  ('Parceiros', 6),
  ('Internacional e roteiros', 7),
  ('Modelos', 8),
  ('Gravações', 9)
on conflict (nome) do nothing;

-- Modelo padrão de onboarding (checklist de dezembro)
insert into public.modelos (tipo, nome, padrao, itens) values (
  'onboarding',
  'Onboarding padrão',
  true,
  '[
    {"ordem": 1, "titulo": "Contrato assinado"},
    {"ordem": 2, "titulo": "Pagamento confirmado"},
    {"ordem": 3, "titulo": "Mensagem de boas-vindas enviada"},
    {"ordem": 4, "titulo": "Grupo de WhatsApp criado"},
    {"ordem": 5, "titulo": "Formulário de diagnóstico respondido"},
    {"ordem": 6, "titulo": "Reunião de diagnóstico feita"},
    {"ordem": 7, "titulo": "Plano de 3 meses aprovado"},
    {"ordem": 8, "titulo": "Acessos liberados"}
  ]'::jsonb
);

-- Modelo padrão do plano de 3 meses (esqueleto, a preencher pelo Alberto)
insert into public.modelos (tipo, nome, padrao, itens) values (
  'plano_3_meses',
  'Plano de 3 meses padrão',
  true,
  '[
    {"ordem": 1,  "mes": 1, "semana": 1,  "titulo": "Alinhamento do diagnóstico e metas do trimestre"},
    {"ordem": 2,  "mes": 1, "semana": 2,  "titulo": "Processos: mapear a operação atual"},
    {"ordem": 3,  "mes": 1, "semana": 3,  "titulo": "CRM e sistema de gestão: implantação"},
    {"ordem": 4,  "mes": 1, "semana": 4,  "titulo": "Fornecedores: cadastros e condições"},
    {"ordem": 5,  "mes": 2, "semana": 5,  "titulo": "Marketing: posicionamento e canais"},
    {"ordem": 6,  "mes": 2, "semana": 6,  "titulo": "Vendas: roteiro e funil"},
    {"ordem": 7,  "mes": 2, "semana": 7,  "titulo": "Parceiros com desconto"},
    {"ordem": 8,  "mes": 2, "semana": 8,  "titulo": "Treinamento da equipe"},
    {"ordem": 9,  "mes": 3, "semana": 9,  "titulo": "Equipe de roteiros"},
    {"ordem": 10, "mes": 3, "semana": 10, "titulo": "Pós-venda e recorrência"},
    {"ordem": 11, "mes": 3, "semana": 11, "titulo": "Indicadores: revisão de resultados"},
    {"ordem": 12, "mes": 3, "semana": 12, "titulo": "Encerramento e plano de continuação"}
  ]'::jsonb
);

-- Modelo padrão de pauta de reunião semanal
insert into public.modelos (tipo, nome, padrao, itens) values (
  'pauta_reuniao',
  'Pauta semanal padrão',
  true,
  '[
    {"ordem": 1, "titulo": "Resultados da semana (indicadores)"},
    {"ordem": 2, "titulo": "Tarefas da semana anterior: o que foi feito"},
    {"ordem": 3, "titulo": "Bloqueios e dúvidas"},
    {"ordem": 4, "titulo": "Conteúdo da semana (pilar do plano)"},
    {"ordem": 5, "titulo": "Plano de ação para a próxima semana"}
  ]'::jsonb
);

-- Documentos de venda (placeholders, a preencher)
insert into public.documentos_venda (nome, tipo) values
  ('Ficha da oferta', 'ficha_oferta'),
  ('Apresentação / proposta (PDF)', 'proposta'),
  ('Pitch de vendas (roteiro da call)', 'pitch'),
  ('Formulário de aplicação', 'formulario_aplicacao'),
  ('Roteiros de WhatsApp', 'roteiro_whatsapp'),
  ('FAQ e quebra de objeções', 'faq'),
  ('Modelo de contrato', 'contrato'),
  ('Termo de confidencialidade', 'confidencialidade');
