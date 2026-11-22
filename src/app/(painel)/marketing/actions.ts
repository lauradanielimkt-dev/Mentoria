"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { data, obrigatorio, opcao, texto, uuid } from "@/lib/form";
import type { FormatoMarketing, StatusMarketing } from "@/lib/supabase/database.types";

const STATUS: StatusMarketing[] = ["ideia", "roteiro", "producao", "aprovacao", "agendado", "publicado"];
const FORMATOS: FormatoMarketing[] = ["reels", "stories", "carrossel", "anuncio", "pagina"];

function fim(erro?: string | null, aba = "quadro") {
  revalidatePath("/marketing");
  redirect(`/marketing?aba=${aba}${erro ? `&erro=${encodeURIComponent(erro)}` : ""}`);
}

function campos(fd: FormData) {
  return {
    titulo: obrigatorio(fd, "titulo"),
    formato: opcao(fd, "formato", FORMATOS, "reels"),
    responsavel_id: uuid(fd, "responsavel_id"),
    data_publicacao: data(fd, "data_publicacao"),
    roteiro: texto(fd, "roteiro"),
    link_post: texto(fd, "link_post"),
    status: opcao(fd, "status", STATUS, "ideia"),
  };
}

export async function criarConteudo(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_conteudos").insert(campos(fd));
  fim(error?.message);
}

export async function atualizarConteudo(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();
  if (fd.get("acao") === "excluir") {
    const { error } = await supabase.from("marketing_conteudos").delete().eq("id", id);
    fim(error?.message);
  }
  const { error } = await supabase.from("marketing_conteudos").update(campos(fd)).eq("id", id);
  fim(error?.message);
}

export async function moverConteudo(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_conteudos")
    .update({ status: opcao(fd, "status", STATUS) })
    .eq("id", obrigatorio(fd, "id"));
  fim(error?.message);
}
