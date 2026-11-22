"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { StatusLead } from "@/lib/supabase/database.types";

const STATUS: StatusLead[] = [
  "novo_contato",
  "aplicacao_recebida",
  "call_agendada",
  "proposta_enviada",
  "negociacao",
  "fechado",
  "perdido",
];

function texto(fd: FormData, k: string) {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}

/** Move um lead de coluna. Em "Perdido" exige motivo; em "Fechado" o banco converte em mentorado. */
export async function moverLead(formData: FormData) {
  await exigirPerfil("admin");
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as StatusLead;
  if (!STATUS.includes(status)) return;

  const motivoId = texto(formData, "motivo_perda_id");
  const motivoTexto = texto(formData, "motivo_perda_texto");
  if (status === "perdido" && !motivoId && !motivoTexto) {
    redirect("/comercial?erro=motivo_obrigatorio");
  }

  const supabase = await createClient();
  await supabase
    .from("leads")
    .update({
      status,
      motivo_perda_id: status === "perdido" ? motivoId : null,
      motivo_perda_texto: status === "perdido" ? motivoTexto : null,
    })
    .eq("id", id);

  revalidatePath("/comercial");
  revalidatePath("/");
  revalidatePath("/mentorados");
}

export async function criarLead(formData: FormData) {
  await exigirPerfil("admin");
  const supabase = await createClient();

  const { data: turma } = await supabase.from("turmas").select("id").eq("ativa", true).limit(1).maybeSingle();
  const fat = texto(formData, "faturamento_aprox");

  const { error } = await supabase.from("leads").insert({
    nome: String(formData.get("nome") ?? "").trim(),
    agencia: texto(formData, "agencia"),
    cidade: texto(formData, "cidade"),
    uf: texto(formData, "uf")?.toUpperCase().slice(0, 2) ?? null,
    origem_id: texto(formData, "origem_id"),
    faturamento_aprox: fat ? Number(fat.replace(/\./g, "").replace(",", ".")) : null,
    data_call: texto(formData, "data_call"),
    proximo_passo: texto(formData, "proximo_passo"),
    lista_espera: formData.get("lista_espera") === "on",
    turma_id: turma?.id ?? null,
  });
  if (error) redirect(`/comercial/novo?erro=${encodeURIComponent(error.message)}`);

  revalidatePath("/comercial");
  redirect("/comercial");
}
