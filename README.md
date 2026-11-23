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
   - `supabase/migrations/20261122000002_novo_usuario_sem_acesso.sql` (usuário novo sem perfil nasce desativado)
   - `supabase/migrations/20261122000003_grants_service_role.sql` (permissões da chave secreta)
   - `supabase/migrations/20261122000004_onboarding_so_equipe.sql` (onboarding deixa de ser visível ao mentorado)
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
      onboarding/        # tabela mentorados x etapas (só admin e equipe)
      biblioteca/        # por pilar; mentorado só vê o liberado
      mentorados/        # cards + pasta por agência ([id], com abas)
      minha-mentoria/    # a pasta do próprio mentorado
      pos-mentoria/      # tabela staff; formulário de avaliação p/ mentorado
      configuracoes/     # usuários, turmas, modelos, listas fixas
    login/               # e-mail e senha (globo 3D de fundo)
    auth/                # signout e callback de links do Supabase
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
| Onboarding          | editar | editar        | sem acesso                         |
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

## Publicação

Endereço de produção: **https://metodo.marmarisviagens.com.br** (Railway, projeto `sincere-prosperity`, serviço `Mentoria`). Endereço técnico: `mentoria-production-44189288.up.railway.app`.

1. O serviço no Railway aponta para o repositório `lauradanielimkt-dev/Mentoria`, branch `feat/estrutura-inicial`. Como o GitHub App do Railway não está instalado, o deploy automático a cada push fica desligado. Para publicar uma versão nova: serviço Mentoria > Settings > Source > **Check for updates** > **Update** (puxa o último commit da branch e faz o deploy). Alternativa definitiva: instalar o app em Settings > Source > Configure GitHub App.
2. Variáveis de ambiente do serviço (já configuradas):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://metodo.marmarisviagens.com.br`
   - `SUPABASE_SERVICE_ROLE_KEY` (chave secreta; só no servidor, usada para criar logins de mentorados)
3. Domínio `metodo.marmarisviagens.com.br` adicionado em Settings > Networking (porta 8080). No DNS de `marmarisviagens.com.br` (registro.br) são necessários dois registros:
   - **CNAME** `metodo` → `2af82khh.up.railway.app`
   - **TXT** `_railway-verify.metodo` → `railway-verify=5b3b71871f4c862856cc628911b8bf46392a4bb3ca03df39e60c114e6718a6d5`
4. No Supabase, em **Authentication > URL Configuration** (já feito): Site URL `https://metodo.marmarisviagens.com.br` e Redirect URLs com `https://metodo.marmarisviagens.com.br/auth/callback` e `http://localhost:3000/auth/callback`.

## Identidade visual

Tema escuro com vidro, vermelho da marca (`--primary`), pêssego como acento (`--accent`) e fonte Outfit. Todos os tokens ficam em `src/app/globals.css`; o logo oficial está em `public/logo-marmaris.svg` e é tingido por máscara no componente `Logo`. Animações respeitam `prefers-reduced-motion`.

## Edição nas telas

Todas as telas têm formulários (sem JavaScript no cliente: `<details>` + Server Actions):

- **Comercial**: novo interessado, editar (`/comercial/[id]`), mover de coluna, excluir
- **Documentos de venda**: criar, editar versão/link, substituir arquivo (bucket `documentos`), excluir
- **Financeiro**: forma, valor, parcelas (regeração das não pagas), NF, contrato, continuação, status por parcela
- **Marketing**: criar, editar, mover de etapa, excluir
- **Biblioteca**: criar (link ou arquivo no bucket `biblioteca`), liberar/recolher, excluir
- **Mentorados**: cadastro manual, ficha, diagnóstico, plano (gerar do modelo + itens), reuniões, tarefas, indicadores por período, acessos, notas internas com risco, arquivos (bucket `arquivos-mentorados`), encerrar/reativar acesso
- **Pós-mentoria**: continuação, checklist de encerramento, NPS/depoimento; relatório início × mês 3 vem dos indicadores
- **Configurações**: nome/perfil/agência dos usuários, turmas, modelos (um item por linha), listas fixas

Uploads passam por Server Actions; o limite padrão do Next é 1 MB por requisição. Para arquivos maiores, ajuste `serverActions.bodySizeLimit` em `next.config.ts`.

## Próximos passos

- Arrastar e soltar nos kanbans (Comercial, Marketing, Tarefas)
- Convite de usuários pelo painel (hoje é pelo Supabase Auth)
- Versão responsiva do menu lateral para celular
- Regenerar os tipos do banco: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts`
