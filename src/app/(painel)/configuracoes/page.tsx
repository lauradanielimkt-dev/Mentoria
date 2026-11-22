import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, inputDate, ROTULOS } from "@/lib/formato";
import type { Modelo, TipoModelo } from "@/lib/supabase/database.types";
import { Abas, Badge, Button, Card, PageHeader, Tabela, Td, Vazio } from "@/components/ui";
import { BotaoMini, Campo, Check, Erro, Grade, Painel } from "@/components/form";
import { atualizarPerfil, salvarItemLista, salvarModelo, salvarTurma } from "./actions";

const TIPO_MODELO: Record<TipoModelo, string> = {
  onboarding: "Checklist de onboarding",
  plano_3_meses: "Plano de 3 meses",
  pauta_reuniao: "Pauta de reunião",
};

type ItemModelo = { titulo: string; ordem?: number; mes?: number; semana?: number | null; descricao?: string | null };

function itensParaTexto(m: Modelo) {
  const itens = (m.itens as ItemModelo[] | null) ?? [];
  if (m.tipo === "plano_3_meses") {
    return itens.map((i) => [i.mes ?? 1, i.semana ?? "", i.titulo, i.descricao ?? ""].join(";").replace(/;+$/, "")).join("\n");
  }
  return itens.map((i) => i.titulo).join("\n");
}

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ aba?: string; erro?: string }> }) {
  await exigirPerfil("admin");
  const { aba = "usuarios", erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: perfis }, { data: mentorados }, { data: turmas }, { data: modelos }, { data: motivos }, { data: origens }, { data: pilares }] =
    await Promise.all([
      supabase.from("perfis").select("*").order("created_at"),
      supabase.from("mentorados").select("id,nome_agencia").order("nome_agencia"),
      supabase.from("turmas").select("*").order("created_at"),
      supabase.from("modelos").select("*").order("tipo").order("created_at"),
      supabase.from("motivos_perda").select("*").order("ordem"),
      supabase.from("origens_lead").select("*").order("ordem"),
      supabase.from("pilares_biblioteca").select("*").order("ordem"),
    ]);

  return (
    <>
      <PageHeader titulo="Configurações" descricao="Usuários e perfis, turmas, modelos e listas fixas." />
      <Abas
        base="/configuracoes"
        ativa={aba}
        abas={[
          { id: "usuarios", label: "Usuários" },
          { id: "turmas", label: "Turmas" },
          { id: "modelos", label: "Modelos" },
          { id: "listas", label: "Listas fixas" },
        ]}
      />
      <Erro mensagem={erro} />

      {/* ---------------------------------------------------------- usuários */}
      {aba === "usuarios" && (
        <>
          <p className="rise mb-4 text-[13.5px] text-[var(--fg-muted)]">
            Novos usuários são criados em Authentication no Supabase. Aqui você define nome, perfil e, para mentorados, a agência.
          </p>
          {perfis && perfis.length ? (
            <Tabela cabecalho={["Usuário", "Perfil", "Agência", "Ativo", ""]}>
              {perfis.map((p) => (
                <tr key={p.id}>
                  <Td colSpan={5}>
                    <form action={atualizarPerfil} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="id" value={p.id} />
                      <div className="min-w-[220px]">
                        <input name="nome" defaultValue={p.nome ?? ""} placeholder="Nome" className="!py-1.5" />
                        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">{p.email}</p>
                      </div>
                      <select name="perfil" defaultValue={p.perfil} className="!w-auto !py-1.5">
                        {(["admin", "equipe", "mentorado"] as const).map((x) => (
                          <option key={x} value={x}>{ROTULOS.perfil[x]}</option>
                        ))}
                      </select>
                      <select name="mentorado_id" defaultValue={p.mentorado_id ?? ""} className="!w-auto !py-1.5">
                        <option value="">Sem agência</option>
                        {(mentorados ?? []).map((m) => (
                          <option key={m.id} value={m.id}>{m.nome_agencia}</option>
                        ))}
                      </select>
                      <Check nome="ativo" rotulo="Ativo" marcado={p.ativo} />
                      <span className="flex-1" />
                      <BotaoMini>Salvar</BotaoMini>
                    </form>
                  </Td>
                </tr>
              ))}
            </Tabela>
          ) : (
            <Vazio titulo="Nenhum usuário" />
          )}
        </>
      )}

      {/* ------------------------------------------------------------ turmas */}
      {aba === "turmas" && (
        <div className="space-y-4">
          {(turmas ?? []).map((t) => (
            <Painel key={t.id} titulo={`${t.nome} · ${t.ativa ? "ativa" : "encerrada"} · ${dataCurta(t.data_inicio)} a ${dataCurta(t.data_fim)}`}>
              <form action={salvarTurma} className="space-y-4">
                <input type="hidden" name="id" value={t.id} />
                <Grade cols={4}>
                  <Campo rotulo="Nome"><input name="nome" defaultValue={t.nome} required /></Campo>
                  <Campo rotulo="Início"><input type="date" name="data_inicio" defaultValue={inputDate(t.data_inicio)} /></Campo>
                  <Campo rotulo="Fim"><input type="date" name="data_fim" defaultValue={inputDate(t.data_fim)} /></Campo>
                  <Campo rotulo="Vagas"><input type="number" name="vagas" defaultValue={t.vagas} /></Campo>
                </Grade>
                <div className="flex items-center gap-4">
                  <Check nome="ativa" rotulo="Turma ativa" marcado={t.ativa} />
                  <span className="flex-1" />
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </Painel>
          ))}
          <Painel titulo="Nova turma">
            <form action={salvarTurma} className="space-y-4">
              <Grade cols={4}>
                <Campo rotulo="Nome *"><input name="nome" required placeholder="Turma 2" /></Campo>
                <Campo rotulo="Início"><input type="date" name="data_inicio" /></Campo>
                <Campo rotulo="Fim"><input type="date" name="data_fim" /></Campo>
                <Campo rotulo="Vagas"><input type="number" name="vagas" defaultValue={5} /></Campo>
              </Grade>
              <div className="flex items-center gap-4">
                <Check nome="ativa" rotulo="Turma ativa" />
                <span className="flex-1" />
                <Button type="submit">Criar turma</Button>
              </div>
            </form>
          </Painel>
        </div>
      )}

      {/* ----------------------------------------------------------- modelos */}
      {aba === "modelos" && (
        <div className="space-y-4">
          <p className="rise text-[13.5px] text-[var(--fg-muted)]">
            Um item por linha. No plano de 3 meses use <code className="rounded bg-white/[0.07] px-1">mês;semana;título;descrição</code> (ex.: <code className="rounded bg-white/[0.07] px-1">1;2;Mapear processos</code>).
          </p>
          {(modelos ?? []).map((m) => (
            <Painel key={m.id} titulo={`${m.nome} · ${TIPO_MODELO[m.tipo]}${m.padrao ? " · padrão" : ""}`}>
              <form action={salvarModelo} className="space-y-4">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="tipo" value={m.tipo} />
                <Grade cols={3}>
                  <Campo rotulo="Nome" className="sm:col-span-2"><input name="nome" defaultValue={m.nome} required /></Campo>
                  <div className="flex items-end pb-2"><Check nome="padrao" rotulo="Modelo padrão deste tipo" marcado={m.padrao} /></div>
                </Grade>
                <Campo rotulo="Itens"><textarea name="itens" rows={10} defaultValue={itensParaTexto(m)} /></Campo>
                <div className="flex items-center gap-3">
                  <BotaoMini tom="erro" name="acao" value="excluir">Excluir</BotaoMini>
                  <span className="flex-1" />
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </Painel>
          ))}
          <Painel titulo="Novo modelo">
            <form action={salvarModelo} className="space-y-4">
              <Grade cols={3}>
                <Campo rotulo="Nome *"><input name="nome" required /></Campo>
                <Campo rotulo="Tipo">
                  <select name="tipo" defaultValue="onboarding">
                    {(Object.keys(TIPO_MODELO) as TipoModelo[]).map((t) => (
                      <option key={t} value={t}>{TIPO_MODELO[t]}</option>
                    ))}
                  </select>
                </Campo>
                <div className="flex items-end pb-2"><Check nome="padrao" rotulo="Modelo padrão deste tipo" /></div>
              </Grade>
              <Campo rotulo="Itens"><textarea name="itens" rows={8} /></Campo>
              <Button type="submit">Criar modelo</Button>
            </form>
          </Painel>
        </div>
      )}

      {/* ------------------------------------------------------------ listas */}
      {aba === "listas" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              ["motivos_perda", "Motivos de perda", motivos],
              ["origens_lead", "Origens de lead", origens],
              ["pilares_biblioteca", "Pilares da biblioteca", pilares],
            ] as const
          ).map(([lista, titulo, itens]) => (
            <Card key={lista} titulo={titulo}>
              <ul className="mb-4 divide-y divide-[var(--border)] text-[13.5px]">
                {(itens ?? []).map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                    <span className={l.ativo ? "" : "text-[var(--fg-faint)] line-through"}>{l.nome}</span>
                    <form action={salvarItemLista}>
                      <input type="hidden" name="lista" value={lista} />
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="acao" value="alternar" />
                      <BotaoMini tom={l.ativo ? "neutro" : "ok"}>{l.ativo ? "Desativar" : "Ativar"}</BotaoMini>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={salvarItemLista} className="flex gap-2">
                <input type="hidden" name="lista" value={lista} />
                <input name="nome" required placeholder="Novo item" className="!py-1.5" />
                <BotaoMini tom="info">Adicionar</BotaoMini>
              </form>
            </Card>
          ))}
          {!turmas?.length && <Badge>—</Badge>}
        </div>
      )}
    </>
  );
}
