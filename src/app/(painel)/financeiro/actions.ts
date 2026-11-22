"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bool, data, inteiro, numero, obrigatorio, opcao, texto } from "@/lib/form";
import type { FormaPagamento, StatusParcela } from "@/lib/supabase/database.types";

function fim(erro?: string | null) {
  revalidatePath("/financeiro");
  revalidatePath("/");
  redirect(erro ? `/financeiro?erro=${encodeURIComponent(erro)}` : "/financeiro");
}

/** Soma meses a uma data "YYYY-MM-DD" mantendo o dia quando possível. */
function somarMeses(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, ultimo));
  return dt.toISOString().slice(0, 10);
}

/**
 * Atualiza o registro financeiro. Se forma, valor, nº de parcelas ou primeiro
 * vencimento mudarem, as parcelas ainda não pagas são regeneradas.
 */
export async function atualizarFinanceiro(fd: FormData) {
  await exigirPerfil("admin");
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();

  const forma = opcao<FormaPagamento>(fd, "forma_pagamento", ["a_vista", "parcelado"], "a_vista");
  const valor = numero(fd, "valor_total") ?? 37000;
  const n = forma === "a_vista" ? 1 : Math.min(10, Math.max(1, inteiro(fd, "num_parcelas") ?? 1));
  const primeiro = data(fd, "primeiro_vencimento");
  const regerar = bool(fd, "regerar_parcelas");

  const { error } = await supabase
    .from("financeiro")
    .update({
      forma_pagamento: forma,
      valor_total: valor,
      num_parcelas: n,
      nota_fiscal_emitida: bool(fd, "nota_fiscal_emitida"),
      contrato_assinado: bool(fd, "contrato_assinado"),
      interesse_continuacao: bool(fd, "interesse_continuacao"),
      valor_continuacao: numero(fd, "valor_continuacao"),
      observacoes: texto(fd, "observacoes"),
    })
    .eq("id", id);
  if (error) fim(error.message);

  if (regerar && primeiro) {
    // Mantém as pagas; recria as demais
    await supabase.from("parcelas").delete().eq("financeiro_id", id).neq("status", "pago");
    const { data: pagas } = await supabase.from("parcelas").select("numero,valor").eq("financeiro_id", id);
    const jaPago = (pagas ?? []).reduce((s, p) => s + Number(p.valor), 0);
    const numerosUsados = new Set((pagas ?? []).map((p) => p.numero));
    const restante = Math.max(0, valor - jaPago);
    const faltam = Math.max(0, n - numerosUsados.size);
    if (faltam > 0) {
      const base = Math.floor((restante / faltam) * 100) / 100;
      const novas: { financeiro_id: string; numero: number; valor: number; vencimento: string }[] = [];
      let numero = 1;
      let i = 0;
      while (novas.length < faltam) {
        if (!numerosUsados.has(numero)) {
          const ultima = novas.length === faltam - 1;
          const v = ultima ? Math.round((restante - base * (faltam - 1)) * 100) / 100 : base;
          novas.push({ financeiro_id: id, numero, valor: v, vencimento: somarMeses(primeiro, i) });
          i++;
        }
        numero++;
      }
      const ins = await supabase.from("parcelas").insert(novas);
      if (ins.error) fim(ins.error.message);
    }
  }
  fim();
}

export async function atualizarParcela(fd: FormData) {
  await exigirPerfil("admin");
  const supabase = await createClient();
  const status = opcao<StatusParcela>(fd, "status", ["pendente", "pago", "atrasado"]);
  const { error } = await supabase
    .from("parcelas")
    .update({ status, pago_em: status === "pago" ? (data(fd, "pago_em") ?? new Date().toISOString().slice(0, 10)) : null })
    .eq("id", obrigatorio(fd, "id"));
  fim(error?.message);
}
