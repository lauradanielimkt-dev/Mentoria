"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bool, inteiro, obrigatorio, opcao, texto, uuid } from "@/lib/form";
import type { TipoMaterial } from "@/lib/supabase/database.types";

const TIPOS: TipoMaterial[] = ["documento", "video", "planilha", "link", "arquivo"];

function fim(erro?: string | null) {
  revalidatePath("/biblioteca");
  redirect(erro ? `/biblioteca?erro=${encodeURIComponent(erro)}` : "/biblioteca");
}

export async function criarMaterial(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();

  let arquivoPath: string | null = null;
  const arquivo = fd.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    const seguro = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
    arquivoPath = `${Date.now()}-${seguro}`;
    const up = await supabase.storage.from("biblioteca").upload(arquivoPath, arquivo, { contentType: arquivo.type || undefined });
    if (up.error) fim(up.error.message);
  }

  const { error } = await supabase.from("biblioteca_itens").insert({
    titulo: obrigatorio(fd, "titulo"),
    descricao: texto(fd, "descricao"),
    tipo: opcao(fd, "tipo", TIPOS, "documento"),
    pilar_id: uuid(fd, "pilar_id"),
    url: texto(fd, "url"),
    arquivo_path: arquivoPath,
    liberado: bool(fd, "liberado"),
    liberar_semana: inteiro(fd, "liberar_semana"),
    ordem: inteiro(fd, "ordem") ?? 0,
  });
  fim(error?.message);
}

export async function alternarLiberado(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase
    .from("biblioteca_itens")
    .update({ liberado: fd.get("liberado") === "1" })
    .eq("id", obrigatorio(fd, "id"));
  fim(error?.message);
}

export async function excluirMaterial(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();
  const { data: item } = await supabase.from("biblioteca_itens").select("arquivo_path").eq("id", id).maybeSingle();
  if (item?.arquivo_path) await supabase.storage.from("biblioteca").remove([item.arquivo_path]);
  const { error } = await supabase.from("biblioteca_itens").delete().eq("id", id);
  fim(error?.message);
}

/** Link assinado para um arquivo da biblioteca (a RLS do Storage já limita quem acessa). */
export async function baixarMaterial(fd: FormData) {
  const path = obrigatorio(fd, "path");
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("biblioteca").createSignedUrl(path, 300);
  if (error || !data) fim(error?.message ?? "Arquivo indisponível");
  redirect(data!.signedUrl);
}
