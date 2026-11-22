import { getSessao, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, ROTULOS } from "@/lib/formato";
import type { Indicador, PosMentoria } from "@/lib/supabase/database.types";
import { Badge, Button, Card, PageHeader, Vazio } from "@/components/ui";
import { BotaoMini, Campo, Check, Erro, Grade, Painel } from "@/components/form";
import { atualizarPosMentoria, responderAvaliacao } from "./actions";

type Linha = PosMentoria & { mentorados: { nome_agencia: string } | null };

export default async function PosMentoriaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sessao = await getSessao();
  const { erro } = await searchParams;
  const supabase = await createClient();

  /* ------------------------------------------------------------ mentorado */
  if (!isStaff(sessao.perfil.perfil)) {
    const { data } = await supabase.from("pos_mentoria").select("*").eq("mentorado_id", sessao.perfil.mentorado_id!).maybeSingle();
    return (
      <>
        <PageHeader titulo="Avaliação final" descricao="Sua opinião sobre a mentoria. Leva menos de 5 minutos." />
        <Erro mensagem={erro} />
        <Card className="max-w-xl">
          {data?.respondido_em ? (
            <p className="text-[13.5px]">Obrigado! Sua avaliação foi registrada.</p>
          ) : (
            <form action={responderAvaliacao} className="space-y-4">
              <Campo rotulo="De 0 a 10, quanto você recomendaria a mentoria?">
                <input id="nps" name="nps" type="number" min={0} max={10} required />
              </Campo>
              <Campo rotulo="Depoimento">
                <textarea name="depoimento_texto" rows={4} />
              </Campo>
              <Campo rotulo="Link de vídeo (opcional)">
                <input name="depoimento_url" type="url" />
              </Campo>
              <Check nome="autoriza_case" rotulo="Autorizo usar meu resultado como case" />
              <Button type="submit">Enviar avaliação</Button>
            </form>
          )}
        </Card>
      </>
    );
  }

  /* ----------------------------------------------------------------- staff */
  const [{ data }, { data: indicadores }] = await Promise.all([
    supabase.from("pos_mentoria").select("*, mentorados(nome_agencia)").order("created_at"),
    supabase.from("indicadores").select("*").in("periodo", ["inicio", "mes_3"]),
  ]);
  const linhas = (data ?? []) as Linha[];
  const ind = (indicadores ?? []) as Indicador[];

  const variacao = (a: number | null | undefined, b: number | null | undefined) => {
    if (a == null || b == null || a === 0) return null;
    return Math.round(((b - a) / a) * 100);
  };

  return (
    <>
      <PageHeader titulo="Pós-mentoria" descricao="Avaliação final, relatório de resultados, continuação e encerramento." />
      <Erro mensagem={erro} />

      {linhas.length ? (
        <div className="space-y-4">
          {linhas.map((p) => {
            const inicio = ind.find((i) => i.mentorado_id === p.mentorado_id && i.periodo === "inicio");
            const fim = ind.find((i) => i.mentorado_id === p.mentorado_id && i.periodo === "mes_3");
            const enc = [p.acessos_revogados, p.grupo_arquivado, p.pasta_arquivada].filter(Boolean).length;
            const dFat = variacao(inicio?.faturamento, fim?.faturamento);
            const dVendas = variacao(inicio?.num_vendas, fim?.num_vendas);
            return (
              <Painel
                key={p.id}
                titulo={`${p.mentorados?.nome_agencia ?? "—"} · NPS ${p.nps ?? "—"} · ${ROTULOS.continuacao[p.status_continuacao]} · encerramento ${enc}/3`}
              >
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <form action={atualizarPosMentoria} className="space-y-4">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="autoriza_case_definido" value="1" />
                    <Grade cols={4}>
                      <Campo rotulo="Continuação">
                        <select name="status_continuacao" defaultValue={p.status_continuacao}>
                          {(Object.keys(ROTULOS.continuacao) as (keyof typeof ROTULOS.continuacao)[]).map((s) => (
                            <option key={s} value={s}>{ROTULOS.continuacao[s]}</option>
                          ))}
                        </select>
                      </Campo>
                      <Campo rotulo="NPS (0–10)"><input name="nps" type="number" min={0} max={10} defaultValue={p.nps ?? ""} /></Campo>
                      <Campo rotulo="Vídeo do depoimento" className="sm:col-span-2"><input name="depoimento_url" defaultValue={p.depoimento_url ?? ""} /></Campo>
                      <Campo rotulo="Depoimento" className="sm:col-span-4"><textarea name="depoimento_texto" rows={3} defaultValue={p.depoimento_texto ?? ""} /></Campo>
                    </Grade>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <Check nome="autoriza_case" rotulo="Autorizou usar como case" marcado={p.autoriza_case ?? false} />
                      <Check nome="acessos_revogados" rotulo="Acessos revogados" marcado={p.acessos_revogados} />
                      <Check nome="grupo_arquivado" rotulo="Grupo arquivado" marcado={p.grupo_arquivado} />
                      <Check nome="pasta_arquivada" rotulo="Pasta arquivada" marcado={p.pasta_arquivada} />
                      <span className="flex-1" />
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>

                  <Card titulo="Resultados · início × mês 3">
                    {inicio || fim ? (
                      <ul className="space-y-2 text-[13px]">
                        <li className="flex justify-between"><span className="text-[var(--fg-muted)]">Faturamento</span><span className="tabular">{brl(inicio?.faturamento)} → {brl(fim?.faturamento)} {dFat != null && <Badge tom={dFat >= 0 ? "ok" : "erro"}>{dFat > 0 ? "+" : ""}{dFat}%</Badge>}</span></li>
                        <li className="flex justify-between"><span className="text-[var(--fg-muted)]">Vendas</span><span className="tabular">{inicio?.num_vendas ?? "—"} → {fim?.num_vendas ?? "—"} {dVendas != null && <Badge tom={dVendas >= 0 ? "ok" : "erro"}>{dVendas > 0 ? "+" : ""}{dVendas}%</Badge>}</span></li>
                        <li className="flex justify-between"><span className="text-[var(--fg-muted)]">Leads</span><span className="tabular">{inicio?.leads ?? "—"} → {fim?.leads ?? "—"}</span></li>
                        <li className="flex justify-between"><span className="text-[var(--fg-muted)]">Conversão</span><span className="tabular">{inicio?.conversao ?? "—"}% → {fim?.conversao ?? "—"}%</span></li>
                        <li className="flex justify-between"><span className="text-[var(--fg-muted)]">Ticket médio</span><span className="tabular">{brl(inicio?.ticket_medio)} → {brl(fim?.ticket_medio)}</span></li>
                        <li className="flex justify-between"><span className="text-[var(--fg-muted)]">Seguidores</span><span className="tabular">{inicio?.seguidores ?? "—"} → {fim?.seguidores ?? "—"}</span></li>
                      </ul>
                    ) : (
                      <p className="text-xs text-[var(--fg-muted)]">Preencha os indicadores de início e do mês 3 na pasta do mentorado.</p>
                    )}
                    <div className="mt-3">
                      <BotaoMini tom="info" type="button">
                        <a href={`/mentorados/${p.mentorado_id}?aba=indicadores`}>Abrir indicadores</a>
                      </BotaoMini>
                    </div>
                  </Card>
                </div>
              </Painel>
            );
          })}
        </div>
      ) : (
        <Vazio titulo="Nenhum mentorado em encerramento" descricao="Cada mentorado ganha um registro aqui quando é criado." />
      )}
    </>
  );
}
