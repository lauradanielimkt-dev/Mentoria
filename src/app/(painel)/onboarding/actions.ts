"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Marca/desmarca uma etapa do onboarding. Só admin e equipe. */
export async function alternarItemOnboarding(formData: FormData) {
  const sessao = await exigirPerfil("admin", "equipe");
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
