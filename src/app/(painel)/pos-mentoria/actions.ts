"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Mentorado responde a própria avaliação final. A RLS limita a linha dele. */
export async function responderAvaliacao(formData: FormData) {
  const sessao = await exigirPerfil("mentorado");
  const supabase = await createClient();

  const nps = Number(formData.get("nps"));
  const depoimento = String(formData.get("depoimento_texto") ?? "").trim() || null;
  const url = String(formData.get("depoimento_url") ?? "").trim() || null;

  await supabase
    .from("pos_mentoria")
    .update({
      nps: Number.isFinite(nps) ? Math.min(10, Math.max(0, nps)) : null,
      depoimento_texto: depoimento,
      depoimento_url: url,
      autoriza_case: formData.get("autoriza_case") === "on",
      respondido_em: new Date().toISOString(),
    })
    .eq("mentorado_id", sessao.perfil.mentorado_id!);

  revalidatePath("/pos-mentoria");
}
