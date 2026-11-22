import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil, PerfilUsuario } from "@/lib/supabase/database.types";

export interface Sessao {
  userId: string;
  email: string | null;
  perfil: Perfil;
}

/**
 * Lê o usuário logado e o perfil dele. Redireciona para /login se não houver sessão
 * ou se o perfil estiver desativado.
 */
export async function getSessao(): Promise<Sessao> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || !perfil.ativo) redirect("/login?erro=sem_acesso");

  return { userId: user.id, email: user.email ?? null, perfil };
}

/** Garante que o usuário tem um dos perfis. Caso contrário, redireciona para o início. */
export async function exigirPerfil(...permitidos: PerfilUsuario[]): Promise<Sessao> {
  const sessao = await getSessao();
  if (!permitidos.includes(sessao.perfil.perfil)) redirect("/");
  return sessao;
}

export const isStaff = (p: PerfilUsuario) => p === "admin" || p === "equipe";
