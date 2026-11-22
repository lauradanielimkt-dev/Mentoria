"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bool, dataHoraSP, numero, obrigatorio, opcao, texto, uuid } from "@/lib/form";
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

function revalidar() {
  revalidatePath("/comercial");
  revalidatePath("/");
  revalidatePath("/mentorados");
  revalidatePath("/onboarding");
}

/** Move um lead de coluna. Em "Perdido" exige motivo; em "Fechado" o banco converte em mentorado. */
export async function moverLead(formData: FormData) {
  await exigirPerfil("admin");
  const id = obrigatorio(formData, "id");
  const status = opcao(formData, "status", STATUS);

  const motivoId = uuid(formData, "motivo_perda_id");
  const motivoTexto = texto(formData, "motivo_perda_texto");
  if (status === "perdido" && !motivoId && !motivoTexto) {
    redirect("/comercial?erro=" + encodeURIComponent("Ao marcar como perdido, informe o motivo."));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      status,
      motivo_perda_id: status === "perdido" ? motivoId : null,
      motivo_perda_texto: status === "perdido" ? motivoTexto : null,
    })
    .eq("id", id);

  revalidar();
  if (error) redirect(`/comercial?erro=${encodeURIComponent(error.message)}`);
  redirect("/comercial");
}

function camposLead(fd: FormData) {
  return {
    nome: obrigatorio(fd, "nome"),
    agencia: texto(fd, "agencia"),
    cidade: texto(fd, "cidade"),
    uf: texto(fd, "uf")?.toUpperCase().slice(0, 2) ?? null,
    origem_id: uuid(fd, "origem_id"),
    faturamento_aprox: numero(fd, "faturamento_aprox"),
    data_call: dataHoraSP(fd, "data_call"),
    proximo_passo: texto(fd, "proximo_passo"),
    observacoes: texto(fd, "observacoes"),
    lista_espera: bool(fd, "lista_espera"),
    responsavel_id: uuid(fd, "responsavel_id"),
  };
}

export async function criarLead(formData: FormData) {
  await exigirPerfil("admin");
  const supabase = await createClient();
  const { data: turma } = await supabase.from("turmas").select("id").eq("ativa", true).limit(1).maybeSingle();

  const { error } = await supabase.from("leads").insert({ ...camposLead(formData), turma_id: turma?.id ?? null });
  if (error) redirect(`/comercial/novo?erro=${encodeURIComponent(error.message)}`);

  revalidar();
  redirect("/comercial");
}

export async function atualizarLead(formData: FormData) {
  await exigirPerfil("admin");
  const id = obrigatorio(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(camposLead(formData)).eq("id", id);
  revalidar();
  if (error) redirect(`/comercial/${id}?erro=${encodeURIComponent(error.message)}`);
  redirect("/comercial");
}

export async function excluirLead(formData: FormData) {
  await exigirPerfil("admin");
  const id = obrigatorio(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  revalidar();
  if (error) redirect(`/comercial/${id}?erro=${encodeURIComponent(error.message)}`);
  redirect("/comercial");
}
