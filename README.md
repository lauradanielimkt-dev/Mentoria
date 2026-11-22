# Painel da Mentoria Marmaris

Sistema de gestão da Mentoria Marmaris: um lugar único onde o Alberto vende, entrega e acompanha a mentoria de 5 agências de turismo. O briefing completo está em [docs/briefing-painel-mentoria.pdf](docs/briefing-painel-mentoria.pdf).

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack)
- **Tailwind CSS 4** com tokens de cor em `src/app/globals.css` (trocar pelas cores da Marmaris)
- **Supabase**: Postgres + Auth + Storage. Toda a regra de acesso vive no banco via Row Level Security
- **TypeScript**

## Rodando localmente

1. Crie um projeto no [Supabase](https://supabase.com) e copie a URL e a anon key.
2. No SQL Editor do Supabase, rode nesta ordem:
   - `supabase/migrations/20261122000000_schema_inicial.sql` (tabelas, funções, RLS, buckets)
   - `supabase/migrations/20261122000001_grants.sql` (permissões do papel `authenticated`; sem isto o login cai em "sem acesso")
   - `supabase/seed.sql` (listas fixas, modelos padrão, Turma 1, documentos de venda)
3. Em **Authentication > Users**, crie o primeiro usuário (Alberto). O trigger cria o perfil como `equipe`; promova para admin no SQL Editor:
   ```sql
   update public.perfis set perfil = 'admin' where email = 'email@do.alberto';
   ```
4. Copie `.env.example` para `.env.local` e preencha.
5. Instale e rode:
   ```bash
   npm install
   npm run dev
   ```

Se preferir a CLI do Supabase: `supabase db push` aplica a migration e `supabase db reset` aplica migration + seed num banco local.

## Estrutura

```
src/
  app/
    (painel)/            # rotas autenticadas, com menu lateral
      page.tsx           # Início (versão staff e versão mentorado)
      comercial/         # kanban de leads + lista de espera
      documentos-venda/
      financeiro/        # só admin
      marketing/         # quadro + calendário
      onboarding/        # tabela mentorados x etapas; mentorado marca o próprio
      biblioteca/        # por pilar; mentorado só vê o liberado
      mentorados/        # cards + pasta por agência ([id], com abas)
      minha-mentoria/    # a pasta do próprio mentorado
      pos-mentoria/      # tabela staff; formulário de avaliação p/ mentorado
      configuracoes/     # usuários, turmas, modelos, listas fixas
    login/               # e-mail+senha ou link mágico
    auth/                # callback do link mágico e signout
  components/
    Sidebar.tsx          # menu em 4 blocos: Vender, Entregar, Acompanhar, Gestão
    PastaMentorado.tsx   # abas da pasta do mentorado (reusado por staff e mentorado)
    ui.tsx               # Card, Badge, Tabela, Kanban, etc.
  lib/
    auth.ts              # getSessao(), exigirPerfil()
    navegacao.ts         # itens de menu por perfil
    saude.ts             # sinal verde/amarelo/vermelho por mentorado
    supabase/            # clientes browser/server/proxy + tipos do banco
  proxy.ts               # renova sessão e protege rotas (ex-middleware)
supabase/
  migrations/            # esquema inicial
  seed.sql
```

## Perfis e permissões

| Módulo              | Admin  | Equipe        | Mentorado                          |
| ------------------- | ------ | ------------- | ---------------------------------- |
| Início              | tudo   | sem valores   | versão própria                     |
| Comercial           | editar | ver           | sem acesso                         |
| Documentos de venda | editar | editar        | sem acesso                         |
| Financeiro          | editar | sem acesso    | sem acesso                         |
| Marketing           | editar | editar        | sem acesso                         |
| Onboarding          | editar | editar        | só o próprio checklist (marca)     |
| Biblioteca          | editar | editar        | só itens liberados                 |
| Pasta do mentorado  | tudo   | tudo          | só a própria, sem notas internas   |
| Pós-mentoria        | editar | editar        | só o formulário de avaliação dele  |
| Configurações       | editar | sem acesso    | sem acesso                         |

Tudo isso é garantido pelas policies em `supabase/migrations/…schema_inicial.sql`. O menu só esconde o que o banco já bloqueia.

**Nota:** a tabela do briefing ficou com colunas desalinhadas no PDF. As linhas de Comercial (equipe só vê) e Marketing (equipe edita) foram interpretadas a partir da descrição "Quem usa". Ajustar as policies `leads_*` e `marketing_staff` se a intenção for outra.

## O que o banco faz sozinho

- **Novo usuário no Auth** → cria a linha em `perfis` (trigger). Perfil e agência são ajustados em Configurações.
- **Lead movido para "Fechado"** → cria o mentorado, o checklist de onboarding (do modelo padrão), o checklist de acessos, o registro financeiro e o registro de pós-mentoria (`converter_lead_em_mentorado`).
- **Lead movido para "Perdido"** → exige motivo (constraint).
- **Biblioteca** → o mentorado só vê itens `liberado = true` e, se houver `liberar_semana`, só a partir daquela semana da turma (`semana_atual`).
- **Encerramento** → `desativar_mentorado(id)` desliga os logins da agência sem apagar histórico.
- **Plano de 3 meses** → `gerar_plano_do_modelo(mentorado_id)` cria os itens a partir do modelo padrão.

## Próximos passos

- Formulários de criação/edição nas telas (reuniões, tarefas, plano, biblioteca, marketing, indicadores, notas)
- Arrastar e soltar nos kanbans (Comercial, Marketing, Tarefas)
- Upload para o Storage (documentos de venda, biblioteca, arquivos do mentorado)
- Convite de usuários pelo painel (hoje é pelo Supabase Auth)
- Relatório de resultados (indicadores início x fim) em Pós-mentoria
- Aplicar a identidade visual da Marmaris nos tokens de `globals.css`
- Regenerar os tipos do banco: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts`
