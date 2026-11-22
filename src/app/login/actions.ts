"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function destinoSeguro(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

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

export async function enviarLinkMagico(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = destinoSeguro(formData.get("next"));
  if (!email) redirect("/login?erro=erro");

  const origem = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Só entra quem já foi cadastrado pelo admin em Configurações
      shouldCreateUser: false,
      emailRedirectTo: `${origem}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) redirect("/login?erro=erro");

  redirect("/login?ok=link_enviado");
}
