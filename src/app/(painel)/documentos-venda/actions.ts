"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { obrigatorio, texto } from "@/lib/form";

function fim(erro?: string | null) {
  revalidatePath("/documentos-venda");
  redirect(erro ? `/documentos-venda?erro=${encodeURIComponent(erro)}` : "/documentos-venda");
}

async function subirArquivo(fd: FormData): Promise<string | null> {
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  const supabase = await createClient();
  const seguro = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${seguro}`;
  const up = await supabase.storage.from("documentos").upload(path, arquivo, { contentType: arquivo.type || undefined });
  if (up.error) fim(up.error.message);
  return path;
}

export async function criarDocumento(fd: FormData) {
  const sessao = await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const arquivoPath = await subirArquivo(fd);
  const { error } = await supabase.from("documentos_venda").insert({
    nome: obrigatorio(fd, "nome"),
    tipo: texto(fd, "tipo") ?? "outro",
    versao: texto(fd, "versao") ?? "1.0",
    url: texto(fd, "url"),
    arquivo_path: arquivoPath,
    observacoes: texto(fd, "observacoes"),
    atualizado_por: sessao.userId,
  });
  fim(error?.message);
}

export async function atualizarDocumento(fd: FormData) {
  const sessao = await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();

  if (fd.get("acao") === "excluir") {
    const { data: d } = await supabase.from("documentos_venda").select("arquivo_path").eq("id", id).maybeSingle();
    if (d?.arquivo_path) await supabase.storage.from("documentos").remove([d.arquivo_path]);
    const { error } = await supabase.from("documentos_venda").delete().eq("id", id);
    fim(error?.message);
  }

  const novoArquivo = await subirArquivo(fd);
  const { error } = await supabase
    .from("documentos_venda")
    .update({
      nome: obrigatorio(fd, "nome"),
      versao: texto(fd, "versao") ?? "1.0",
      url: texto(fd, "url"),
      observacoes: texto(fd, "observacoes"),
      atualizado_por: sessao.userId,
      ...(novoArquivo ? { arquivo_path: novoArquivo } : {}),
    })
    .eq("id", id);
  fim(error?.message);
}

export async function baixarDocumento(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const path = obrigatorio(fd, "path");
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, 300);
  if (error || !data) fim(error?.message ?? "Arquivo indisponível");
  redirect(data!.signedUrl);
}
