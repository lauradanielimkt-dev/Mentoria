"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PerfilUsuario } from "@/lib/supabase/database.types";

export async function atualizarPerfil(formData: FormData) {
  await exigirPerfil("admin");
  const id = String(formData.get("id"));
  const perfil = String(formData.get("perfil")) as PerfilUsuario;
  const mentoradoId = String(formData.get("mentorado_id") ?? "") || null;
  const ativo = formData.get("ativo") === "on";

  if (perfil === "mentorado" && !mentoradoId) {
    redirect("/configuracoes?erro=mentorado_sem_agencia");
  }

  const supabase = await createClient();
  await supabase
    .from("perfis")
    .update({ perfil, mentorado_id: perfil === "mentorado" ? mentoradoId : null, ativo })
    .eq("id", id);

  revalidatePath("/configuracoes");
}
