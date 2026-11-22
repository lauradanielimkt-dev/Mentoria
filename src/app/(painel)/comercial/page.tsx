import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, dataHora, ROTULOS } from "@/lib/formato";
import type { StatusLead } from "@/lib/supabase/database.types";
import { Abas, Badge, Button, CartaoKanban, Coluna, PageHeader, Tabela, Td, Vazio } from "@/components/ui";
import { BotaoMini, Erro } from "@/components/form";
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
  searchParams: Promise<{ aba?: string; erro?: string }>;
}) {
  const sessao = await exigirPerfil("admin", "equipe");
  const podeEditar = sessao.perfil.perfil === "admin";
  const { aba = "pipeline", erro } = await searchParams;
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
      <Erro mensagem={erro} />

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
                <Td className="font-medium">
                  {podeEditar ? <Link href={`/comercial/${l.id}`} className="hover:underline">{l.nome}</Link> : l.nome}
                </Td>
                <Td>{l.agencia ?? "—"}</Td>
                <Td>{[l.cidade, l.uf].filter(Boolean).join("/") || "—"}</Td>
                <Td>{l.origem_id ? origemNome.get(l.origem_id) : "—"}</Td>
                <Td className="tabular">{l.faturamento_aprox ? brl(l.faturamento_aprox) : "—"}</Td>
                <Td>{l.proximo_passo ?? "—"}</Td>
              </tr>
            ))}
          </Tabela>
        ) : (
          <Vazio titulo="Lista de espera vazia" descricao="Interessados para a próxima turma ficam aqui." />
        )
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 pb-4 lg:-mx-12 lg:px-12">
          <div className="flex gap-4">
            {COLUNAS.map((status) => {
              const itens = pipeline.filter((l) => l.status === status);
              return (
                <Coluna key={status} titulo={ROTULOS.statusLead[status]} total={itens.length}>
                  {itens.map((l) => (
                    <CartaoKanban key={l.id}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">
                          {podeEditar ? <Link href={`/comercial/${l.id}`} className="hover:underline">{l.nome}</Link> : l.nome}
                        </p>
                        {l.mentorado_id && (
                          <Link href={`/mentorados/${l.mentorado_id}`} className="text-[11px] text-[#ff8a8f] hover:underline">
                            pasta →
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {[l.agencia, [l.cidade, l.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.origem_id && <Badge>{origemNome.get(l.origem_id)}</Badge>}
                        {l.faturamento_aprox && <Badge tom="info">{brl(l.faturamento_aprox)}</Badge>}
                      </div>
                      {l.data_call && <p className="mt-2 text-xs text-[var(--fg-muted)]">Call: {dataHora(l.data_call)}</p>}
                      {l.proximo_passo && <p className="mt-1 text-xs">→ {l.proximo_passo}</p>}
                      {status === "perdido" && (l.motivo_perda_texto || l.motivo_perda_id) && (
                        <p className="mt-1 text-xs text-[var(--fg-muted)]">
                          Motivo: {l.motivo_perda_texto ?? motivos?.find((m) => m.id === l.motivo_perda_id)?.nome}
                        </p>
                      )}
                      {podeEditar && status !== "fechado" && (
                        <form action={moverLead} className="mt-3 space-y-1.5">
                          <input type="hidden" name="id" value={l.id} />
                          <select name="status" defaultValue={status} className="!py-1 !text-xs">
                            {COLUNAS.map((s) => (
                              <option key={s} value={s}>{ROTULOS.statusLead[s]}</option>
                            ))}
                          </select>
                          <select name="motivo_perda_id" className="!py-1 !text-xs" defaultValue={l.motivo_perda_id ?? ""}>
                            <option value="">Motivo (se perdido)</option>
                            {(motivos ?? []).map((m) => (
                              <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                          </select>
                          <div className="flex justify-end">
                            <BotaoMini>Mover</BotaoMini>
                          </div>
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
