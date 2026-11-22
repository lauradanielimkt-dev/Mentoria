"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Marca/desmarca uma etapa. A RLS garante que o mentorado só altera o próprio checklist. */
export async function alternarItemOnboarding(formData: FormData) {
  const sessao = await getSessao();
  const id = String(formData.get("id"));
  const concluido = formData.get("concluido") === "1";

  const supabase = await createClient();
  await supabase
    .from("onboarding_itens")
    .update({
      concluido,
      concluido_em: concluido ? new Date().toISOString() : null,
      concluido_por: concluido ? sessao.userId : null,
    })
    .eq("id", id);

  revalidatePath("/onboarding");
}
