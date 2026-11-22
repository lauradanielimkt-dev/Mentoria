import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, dataHora, ROTULOS } from "@/lib/formato";
import type { StatusLead } from "@/lib/supabase/database.types";
import { Abas, Badge, Button, CartaoKanban, Coluna, PageHeader, Tabela, Td, Vazio } from "@/components/ui";
import { moverLead } from "./actions";

const COLUNAS: StatusLead[] = [
  "novo_contato",
  "aplicacao_recebida",
  "call_agendada",
  "proposta_enviada",
  "negociacao",
  "fechado",
  "perdido",
];

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const sessao = await exigirPerfil("admin", "equipe");
  const podeEditar = sessao.perfil.perfil === "admin";
  const { aba = "pipeline" } = await searchParams;
  const supabase = await createClient();

  const [{ data: leads }, { data: origens }, { data: motivos }] = await Promise.all([
    supabase.from("leads").select("*").order("ordem").order("created_at"),
    supabase.from("origens_lead").select("*").eq("ativo", true).order("ordem"),
    supabase.from("motivos_perda").select("*").eq("ativo", true).order("ordem"),
  ]);

  const origemNome = new Map((origens ?? []).map((o) => [o.id, o.nome]));
  const pipeline = (leads ?? []).filter((l) => !l.lista_espera);
  const espera = (leads ?? []).filter((l) => l.lista_espera);

  return (
    <>
      <PageHeader
        titulo="Comercial"
        descricao="Pipeline de interessados na mentoria. Ao fechar, o lead vira mentorado automaticamente."
        acoes={podeEditar ? <Button href="/comercial/novo">Novo interessado</Button> : undefined}
      />

      <Abas
        base="/comercial"
        ativa={aba}
        abas={[
          { id: "pipeline", label: `Pipeline (${pipeline.length})` },
          { id: "espera", label: `Lista de espera (${espera.length})` },
        ]}
      />

      {aba === "espera" ? (
        espera.length ? (
          <Tabela cabecalho={["Nome", "Agência", "Cidade", "Origem", "Faturamento", "Próximo passo"]}>
            {espera.map((l) => (
              <tr key={l.id}>
                <Td className="font-medium">{l.nome}</Td>
                <Td>{l.agencia ?? "—"}</Td>
                <Td>{[l.cidade, l.uf].filter(Boolean).join("/") || "—"}</Td>
                <Td>{l.origem_id ? origemNome.get(l.origem_id) : "—"}</Td>
                <Td>{l.faturamento_aprox ? brl(l.faturamento_aprox) : "—"}</Td>
                <Td>{l.proximo_passo ?? "—"}</Td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <Vazio titulo="Lista de espera vazia" descricao="Interessados para a próxima turma ficam aqui." />
        )
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 pb-4 lg:-mx-10 lg:px-10">
          <div className="flex gap-4">
            {COLUNAS.map((status) => {
              const itens = pipeline.filter((l) => l.status === status);
              return (
                <Coluna key={status} titulo={ROTULOS.statusLead[status]} total={itens.length}>
                  {itens.map((l) => (
                    <CartaoKanban key={l.id}>
                      <p className="font-medium">{l.nome}</p>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {[l.agencia, [l.cidade, l.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.origem_id && <Badge>{origemNome.get(l.origem_id)}</Badge>}
                        {l.faturamento_aprox && <Badge tom="info">{brl(l.faturamento_aprox)}</Badge>}
                      </div>
                      {l.data_call && (
                        <p className="mt-2 text-xs text-[var(--fg-muted)]">Call: {dataHora(l.data_call)}</p>
                      )}
                      {l.proximo_passo && <p className="mt-1 text-xs">→ {l.proximo_passo}</p>}
                      {podeEditar && status !== "fechado" && (
                        <form action={moverLead} className="mt-3 space-y-1.5">
                          <input type="hidden" name="id" value={l.id} />
                          <select name="status" defaultValue={status} className="!py-1 text-xs">
                            {COLUNAS.map((s) => (
                              <option key={s} value={s}>
                                {ROTULOS.statusLead[s]}
                              </option>
                            ))}
                          </select>
                          <select name="motivo_perda_id" className="!py-1 text-xs" defaultValue="">
                            <option value="">Motivo (se perdido)</option>
                            {(motivos ?? []).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nome}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="w-full rounded-md bg-[var(--muted)] py-1 text-xs hover:bg-[var(--border)]">
                            Mover
                          </button>
                        </form>
                      )}
                    </CartaoKanban>
                  ))}
                </Coluna>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
