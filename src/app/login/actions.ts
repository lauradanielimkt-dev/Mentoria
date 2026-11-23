"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function destinoSeguro(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** Login por e-mail e senha (único método de entrada do painel). */
export async function entrarComSenha(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const next = destinoSeguro(formData.get("next"));

  if (!email || !senha) redirect("/login?erro=credenciais");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) redirect("/login?erro=credenciais");

  redirect(next);
}
