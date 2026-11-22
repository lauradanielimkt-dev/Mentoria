import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, ROTULOS } from "@/lib/formato";
import { Abas, Badge, Card, PageHeader, Tabela, Td, Vazio } from "@/components/ui";
import { atualizarPerfil } from "./actions";

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await exigirPerfil("admin");
  const { aba = "usuarios" } = await searchParams;
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

      {aba === "usuarios" && (
        <>
          <p className="mb-4 text-sm text-[var(--fg-muted)]">
            Novos usuários são criados em Authentication no Supabase (ou por convite). Aqui você define o perfil e, para mentorados, a agência.
          </p>
          {perfis && perfis.length ? (
            <Tabela cabecalho={["Nome", "E-mail", "Perfil", "Agência", "Ativo", ""]}>
              {perfis.map((p) => (
                <tr key={p.id}>
                  <Td className="font-medium">{p.nome ?? "—"}</Td>
                  <Td>{p.email ?? "—"}</Td>
                  <Td colSpan={3}>
                    <form action={atualizarPerfil} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="perfil" defaultValue={p.perfil} className="!w-auto !py-1 text-xs">
                        {(["admin", "equipe", "mentorado"] as const).map((x) => (
                          <option key={x} value={x}>{ROTULOS.perfil[x]}</option>
                        ))}
                      </select>
                      <select name="mentorado_id" defaultValue={p.mentorado_id ?? ""} className="!w-auto !py-1 text-xs">
                        <option value="">Sem agência</option>
                        {(mentorados ?? []).map((m) => (
                          <option key={m.id} value={m.id}>{m.nome_agencia}</option>
                        ))}
                      </select>
                      <label className="!mb-0 flex items-center gap-1 text-xs">
                        <input type="checkbox" name="ativo" defaultChecked={p.ativo} className="!w-auto" /> ativo
                      </label>
                      <button type="submit" className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs hover:bg-[var(--border)]">Salvar</button>
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

      {aba === "turmas" && (
        <Tabela cabecalho={["Turma", "Início", "Fim", "Vagas", "Status"]}>
          {(turmas ?? []).map((t) => (
            <tr key={t.id}>
              <Td className="font-medium">{t.nome}</Td>
              <Td>{dataCurta(t.data_inicio)}</Td>
              <Td>{dataCurta(t.data_fim)}</Td>
              <Td>{t.vagas}</Td>
              <Td>{t.ativa ? <Badge tom="ok">Ativa</Badge> : <Badge>Encerrada</Badge>}</Td>
            </tr>
          ))}
        </Tabela>
      )}

      {aba === "modelos" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {(modelos ?? []).map((m) => {
            const itens = (m.itens as { titulo: string; ordem?: number; mes?: number; semana?: number }[]) ?? [];
            return (
              <Card key={m.id} titulo={m.nome} acoes={m.padrao ? <Badge tom="info">Padrão</Badge> : undefined}>
                <p className="mb-2 text-xs text-[var(--fg-muted)]">
                  {m.tipo === "onboarding" ? "Checklist de onboarding" : m.tipo === "plano_3_meses" ? "Plano de 3 meses" : "Pauta de reunião"}
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {itens.map((i, idx) => (
                    <li key={idx}>
                      {i.titulo}
                      {i.mes && <span className="text-xs text-[var(--fg-muted)]"> · mês {i.mes}{i.semana ? `, sem. ${i.semana}` : ""}</span>}
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })}
        </div>
      )}

      {aba === "listas" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Motivos de perda", motivos],
            ["Origens de lead", origens],
            ["Pilares da biblioteca", pilares],
          ].map(([titulo, lista]) => (
            <Card key={titulo as string} titulo={titulo as string}>
              <ul className="space-y-1 text-sm">
                {((lista ?? []) as { id: string; nome: string; ativo: boolean }[]).map((l) => (
                  <li key={l.id} className={l.ativo ? "" : "text-[var(--fg-muted)] line-through"}>{l.nome}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
