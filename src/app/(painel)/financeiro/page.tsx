import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, dataCurta, ROTULOS } from "@/lib/formato";
import type { Financeiro, Parcela } from "@/lib/supabase/database.types";
import { Badge, Button, Card, PageHeader, StatCard, Vazio } from "@/components/ui";
import { BotaoMini, Campo, Check, Erro, Grade } from "@/components/form";
import { atualizarFinanceiro, atualizarParcela } from "./actions";

type Linha = Financeiro & { mentorados: { nome_agencia: string } | null; parcelas: Parcela[] };

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await exigirPerfil("admin");
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: fin } = await supabase.from("financeiro").select("*, mentorados(nome_agencia), parcelas(*)").order("created_at");
  const linhas = (fin ?? []) as Linha[];

  const vendido = linhas.reduce((s, f) => s + Number(f.valor_total), 0);
  const recebido = linhas.flatMap((f) => f.parcelas).filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const aReceber = vendido - recebido;
  const hoje = new Date().toISOString().slice(0, 10);

  const tomParcela = (p: Parcela) => (p.status === "pago" ? "ok" : p.status === "atrasado" || p.vencimento < hoje ? "erro" : "neutro");

  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Pagamentos, parcelas, nota fiscal e contrato por mentorado." />
      <Erro mensagem={erro} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard rotulo="Vendido" valor={brl(vendido)} tom="destaque" delay={1} />
        <StatCard rotulo="Recebido" valor={brl(recebido)} tom="ok" delay={2} />
        <StatCard rotulo="A receber" valor={brl(aReceber)} tom={aReceber > 0 ? "alerta" : "neutro"} delay={3} />
      </div>

      {linhas.length ? (
        <div className="space-y-4">
          {linhas.map((f) => {
            const parcelas = [...f.parcelas].sort((a, b) => a.numero - b.numero);
            const pago = parcelas.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
            return (
              <details key={f.id} className="glass rise group rounded-[var(--radius)]">
                <summary className="flex cursor-pointer select-none flex-wrap items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] font-semibold">{f.mentorados?.nome_agencia ?? "—"}</span>
                  <span className="text-xs text-[var(--fg-muted)]">{f.forma_pagamento === "a_vista" ? "À vista" : `${f.num_parcelas}x no cartão`}</span>
                  <span className="tabular text-[13.5px]">{brl(f.valor_total)}</span>
                  <span className="flex flex-wrap gap-1">
                    {parcelas.map((p) => (
                      <Badge key={p.id} tom={tomParcela(p)}>
                        {p.numero} · {dataCurta(p.vencimento)}
                      </Badge>
                    ))}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {f.nota_fiscal_emitida ? <Badge tom="ok">NF</Badge> : <Badge tom="alerta">NF pendente</Badge>}
                    {f.contrato_assinado ? <Badge tom="ok">Contrato</Badge> : <Badge tom="alerta">Contrato pendente</Badge>}
                    <span className="text-[var(--fg-muted)] transition-transform duration-300 ease-[var(--ease)] group-open:rotate-180">▾</span>
                  </span>
                </summary>

                <div className="grid gap-6 border-t border-[var(--border)] px-5 py-5 lg:grid-cols-[1fr_360px]">
                  <form action={atualizarFinanceiro} className="space-y-4">
                    <input type="hidden" name="id" value={f.id} />
                    <Grade cols={4}>
                      <Campo rotulo="Forma">
                        <select name="forma_pagamento" defaultValue={f.forma_pagamento}>
                          <option value="a_vista">À vista</option>
                          <option value="parcelado">Parcelado no cartão</option>
                        </select>
                      </Campo>
                      <Campo rotulo="Valor total (R$)">
                        <input name="valor_total" inputMode="decimal" defaultValue={f.valor_total} />
                      </Campo>
                      <Campo rotulo="Nº de parcelas (1–10)">
                        <input name="num_parcelas" type="number" min={1} max={10} defaultValue={f.num_parcelas} />
                      </Campo>
                      <Campo rotulo="1º vencimento" dica="Usado ao regerar parcelas">
                        <input name="primeiro_vencimento" type="date" defaultValue={parcelas[0]?.vencimento ?? ""} />
                      </Campo>
                      <Campo rotulo="Valor da continuação (R$)">
                        <input name="valor_continuacao" inputMode="decimal" defaultValue={f.valor_continuacao ?? ""} />
                      </Campo>
                      <Campo rotulo="Observações" className="sm:col-span-3">
                        <input name="observacoes" defaultValue={f.observacoes ?? ""} />
                      </Campo>
                    </Grade>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <Check nome="nota_fiscal_emitida" rotulo="Nota fiscal emitida" marcado={f.nota_fiscal_emitida} />
                      <Check nome="contrato_assinado" rotulo="Contrato assinado" marcado={f.contrato_assinado} />
                      <Check nome="interesse_continuacao" rotulo="Interesse em continuar +3 meses" marcado={f.interesse_continuacao} />
                      <Check nome="regerar_parcelas" rotulo="Regerar parcelas não pagas" />
                      <span className="flex-1" />
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>

                  <Card titulo={`Parcelas · ${brl(pago)} recebidos`}>
                    {parcelas.length ? (
                      <ul className="divide-y divide-[var(--border)] text-[13px]">
                        {parcelas.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                            <span className="tabular">
                              {p.numero}ª · {brl(p.valor)} · {dataCurta(p.vencimento)}
                            </span>
                            <form action={atualizarParcela} className="flex items-center gap-1.5">
                              <input type="hidden" name="id" value={p.id} />
                              <select name="status" defaultValue={p.status} className="!w-auto !py-1 !text-xs">
                                {(["pendente", "pago", "atrasado"] as const).map((s) => (
                                  <option key={s} value={s}>{ROTULOS.statusParcela[s]}</option>
                                ))}
                              </select>
                              <BotaoMini>Ok</BotaoMini>
                            </form>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[var(--fg-muted)]">Sem parcelas. Informe o 1º vencimento e marque “Regerar parcelas”.</p>
                    )}
                  </Card>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <Vazio titulo="Nenhuma venda registrada" descricao="Ao fechar um lead ou cadastrar um mentorado, o registro financeiro é criado aqui." />
      )}

      <Card titulo="Continuação (+3 meses)" className="mt-6">
        {linhas.some((f) => f.interesse_continuacao) ? (
          <ul className="divide-y divide-[var(--border)]">
            {linhas.filter((f) => f.interesse_continuacao).map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-[13.5px]">
                <span>{f.mentorados?.nome_agencia}</span>
                <span className="tabular font-medium">{f.valor_continuacao ? brl(f.valor_continuacao) : "valor a definir"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-[var(--fg-muted)]">Ninguém marcado com interesse em renovar ainda.</p>
        )}
      </Card>
    </>
  );
}
