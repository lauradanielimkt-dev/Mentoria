"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { obrigatorio, texto } from "@/lib/form";

/* Logins do mentorado: criar, redefinir senha, ativar/desativar.
   Usa a chave secreta do Supabase, só no servidor. */

function voltar(fd: FormData, msg?: { erro?: string; ok?: string }) {
  const base = texto(fd, "voltar") ?? "/mentorados";
  const qs = new URLSearchParams({ aba: "visao" });
  if (msg?.erro) qs.set("erro", msg.erro);
  if (msg?.ok) qs.set("ok", msg.ok);
  revalidatePath(base);
  revalidatePath("/configuracoes");
  redirect(`${base}?${qs.toString()}`);
}

function emailValido(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Cria o usuário no Auth já vinculado à agência (o trigger do banco cria o perfil). */
export async function criarLoginMentorado(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const mentoradoId = obrigatorio(fd, "mentorado_id");
  const nome = obrigatorio(fd, "nome");
  const email = obrigatorio(fd, "email").toLowerCase();
  const senha = obrigatorio(fd, "senha");

  if (!emailValido(email)) voltar(fd, { erro: "E-mail inválido." });
  if (senha.length < 6) voltar(fd, { erro: "A senha precisa ter pelo menos 6 caracteres." });

  // Garante que a agência existe e está visível para quem está logado
  const supabase = await createClient();
  const { data: agencia } = await supabase.from("mentorados").select("id,nome_agencia").eq("id", mentoradoId).maybeSingle();
  if (!agencia) voltar(fd, { erro: "Agência não encontrada." });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, perfil: "mentorado", mentorado_id: mentoradoId },
  });
  if (error) {
    const msg = /already|registered|exists/i.test(error.message)
      ? "Já existe um usuário com este e-mail. Use outro e-mail ou redefina a senha dele em Configurações."
      : error.message;
    voltar(fd, { erro: msg });
  }

  voltar(fd, { ok: `Acesso criado para ${email}. Passe o e-mail e a senha ao mentorado.` });
}

/** Redefine a senha de um login da agência. */
export async function redefinirSenhaMentorado(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const userId = obrigatorio(fd, "user_id");
  const mentoradoId = obrigatorio(fd, "mentorado_id");
  const senha = obrigatorio(fd, "senha");
  if (senha.length < 6) voltar(fd, { erro: "A senha precisa ter pelo menos 6 caracteres." });

  // Só logins desta agência (evita redefinir senha de admin/equipe por aqui)
  const supabase = await createClient();
  const { data: perfil } = await supabase.from("perfis").select("id,email").eq("id", userId).eq("mentorado_id", mentoradoId).maybeSingle();
  if (!perfil) voltar(fd, { erro: "Login não pertence a esta agência." });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
  if (error) voltar(fd, { erro: error.message });

  voltar(fd, { ok: `Senha de ${perfil!.email} redefinida.` });
}

/** Ativa ou desativa um login da agência (bloqueia a entrada sem apagar nada). */
export async function alternarLoginMentorado(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const userId = obrigatorio(fd, "user_id");
  const mentoradoId = obrigatorio(fd, "mentorado_id");
  const ativar = fd.get("ativo") === "1";

  const supabase = await createClient();
  const { data: perfil } = await supabase.from("perfis").select("id").eq("id", userId).eq("mentorado_id", mentoradoId).maybeSingle();
  if (!perfil) voltar(fd, { erro: "Login não pertence a esta agência." });

  const { error } = await supabase.from("perfis").update({ ativo: ativar }).eq("id", userId);
  if (error) voltar(fd, { erro: error.message });

  // Também bloqueia/desbloqueia no Auth para derrubar sessões abertas
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(userId, { ban_duration: ativar ? "none" : "876000h" });

  voltar(fd, { ok: ativar ? "Login reativado." : "Login desativado." });
}
