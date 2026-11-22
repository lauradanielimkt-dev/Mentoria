import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, dataCurta, ROTULOS } from "@/lib/formato";
import { Badge, Card, PageHeader, StatCard, Tabela, Td, Vazio } from "@/components/ui";

export default async function FinanceiroPage() {
  await exigirPerfil("admin");
  const supabase = await createClient();

  const { data: fin } = await supabase
    .from("financeiro")
    .select("*, mentorados(nome_agencia), parcelas(*)")
    .order("created_at");

  type Linha = NonNullable<typeof fin>[number] & {
    mentorados: { nome_agencia: string } | null;
    parcelas: { id: string; numero: number; valor: number; vencimento: string; status: string }[];
  };
  const linhas = (fin ?? []) as Linha[];

  const vendido = linhas.reduce((s, f) => s + Number(f.valor_total), 0);
  const recebido = linhas.flatMap((f) => f.parcelas).filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const aReceber = vendido - recebido;
  const continuacao = linhas.filter((f) => f.interesse_continuacao);

  const tomParcela = (s: string) => (s === "pago" ? "ok" : s === "atrasado" ? "erro" : "neutro");

  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Pagamentos, parcelas, nota fiscal e contrato por mentorado." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard rotulo="Vendido" valor={brl(vendido)} tom="destaque" />
        <StatCard rotulo="Recebido" valor={brl(recebido)} tom="ok" />
        <StatCard rotulo="A receber" valor={brl(aReceber)} tom={aReceber > 0 ? "alerta" : "neutro"} />
      </div>

      {linhas.length ? (
        <Tabela cabecalho={["Mentorado", "Forma", "Valor", "Parcelas", "NF", "Contrato"]}>
          {linhas.map((f) => (
            <tr key={f.id}>
              <Td className="font-medium">{f.mentorados?.nome_agencia ?? "—"}</Td>
              <Td>{f.forma_pagamento === "a_vista" ? "À vista" : `${f.num_parcelas}x no cartão`}</Td>
              <Td>{brl(f.valor_total)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {f.parcelas
                    .sort((a, b) => a.numero - b.numero)
                    .map((p) => (
                      <Badge key={p.id} tom={tomParcela(p.status)}>
                        {p.numero} · {dataCurta(p.vencimento)}
                      </Badge>
                    ))}
                </div>
              </Td>
              <Td>{f.nota_fiscal_emitida ? <Badge tom="ok">Emitida</Badge> : <Badge tom="alerta">Pendente</Badge>}</Td>
              <Td>{f.contrato_assinado ? <Badge tom="ok">Assinado</Badge> : <Badge tom="alerta">Pendente</Badge>}</Td>
            </tr>
          ))}
        </Tabela>
      ) : (
        <Vazio titulo="Nenhuma venda registrada" descricao="Ao fechar um lead, o registro financeiro é criado aqui." />
      )}

      <Card titulo="Continuação (+3 meses)" className="mt-6">
        {continuacao.length ? (
          <ul className="divide-y divide-[var(--border)]">
            {continuacao.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <span>{f.mentorados?.nome_agencia}</span>
                <span className="font-medium">{f.valor_continuacao ? brl(f.valor_continuacao) : "valor a definir"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">
            Ninguém marcado com interesse em renovar ainda. Status por mentorado: {Object.values(ROTULOS.continuacao).join(", ").toLowerCase()}.
          </p>
        )}
      </Card>
    </>
  );
}
