"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bool, inteiro, obrigatorio, opcao, texto } from "@/lib/form";
import type { StatusContinuacao } from "@/lib/supabase/database.types";

function fim(erro?: string | null) {
  revalidatePath("/pos-mentoria");
  redirect(erro ? `/pos-mentoria?erro=${encodeURIComponent(erro)}` : "/pos-mentoria");
}

/** Mentorado responde a própria avaliação final. A RLS limita a linha dele. */
export async function responderAvaliacao(formData: FormData) {
  const sessao = await exigirPerfil("mentorado");
  const supabase = await createClient();
  const nps = inteiro(formData, "nps");
  const { error } = await supabase
    .from("pos_mentoria")
    .update({
      nps: nps == null ? null : Math.min(10, Math.max(0, nps)),
      depoimento_texto: texto(formData, "depoimento_texto"),
      depoimento_url: texto(formData, "depoimento_url"),
      autoriza_case: bool(formData, "autoriza_case"),
      respondido_em: new Date().toISOString(),
    })
    .eq("mentorado_id", sessao.perfil.mentorado_id!);
  fim(error?.message);
}

/** Staff atualiza continuação e checklist de encerramento. */
export async function atualizarPosMentoria(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_mentoria")
    .update({
      status_continuacao: opcao<StatusContinuacao>(fd, "status_continuacao", ["vai_renovar", "nao_vai", "em_negociacao", "indefinido"], "indefinido"),
      acessos_revogados: bool(fd, "acessos_revogados"),
      grupo_arquivado: bool(fd, "grupo_arquivado"),
      pasta_arquivada: bool(fd, "pasta_arquivada"),
      nps: inteiro(fd, "nps"),
      depoimento_texto: texto(fd, "depoimento_texto"),
      depoimento_url: texto(fd, "depoimento_url"),
      autoriza_case: fd.has("autoriza_case_definido") ? bool(fd, "autoriza_case") : undefined,
    })
    .eq("id", obrigatorio(fd, "id"));
  fim(error?.message);
}
