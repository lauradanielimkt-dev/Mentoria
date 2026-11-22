"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bool, data, inteiro, obrigatorio, opcao, texto, uuid } from "@/lib/form";
import type { PerfilUsuario, TipoModelo } from "@/lib/supabase/database.types";

function fim(aba: string, erro?: string | null) {
  revalidatePath("/configuracoes");
  redirect(`/configuracoes?aba=${aba}${erro ? `&erro=${encodeURIComponent(erro)}` : ""}`);
}

/* Usuários ------------------------------------------------------------------ */

export async function atualizarPerfil(fd: FormData) {
  await exigirPerfil("admin");
  const id = obrigatorio(fd, "id");
  const perfil = opcao<PerfilUsuario>(fd, "perfil", ["admin", "equipe", "mentorado"]);
  const mentoradoId = uuid(fd, "mentorado_id");
  if (perfil === "mentorado" && !mentoradoId) fim("usuarios", "Um mentorado precisa estar vinculado a uma agência.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("perfis")
    .update({ perfil, nome: texto(fd, "nome"), mentorado_id: perfil === "mentorado" ? mentoradoId : null, ativo: bool(fd, "ativo") })
    .eq("id", id);
  fim("usuarios", error?.message);
}

/* Turmas ---------------------------------------------------------------------- */

export async function salvarTurma(fd: FormData) {
  await exigirPerfil("admin");
  const supabase = await createClient();
  const valores = {
    nome: obrigatorio(fd, "nome"),
    data_inicio: data(fd, "data_inicio"),
    data_fim: data(fd, "data_fim"),
    vagas: inteiro(fd, "vagas") ?? 5,
    ativa: bool(fd, "ativa"),
  };
  const id = uuid(fd, "id");
  const { error } = id ? await supabase.from("turmas").update(valores).eq("id", id) : await supabase.from("turmas").insert(valores);
  fim("turmas", error?.message);
}

/* Modelos --------------------------------------------------------------------- */

const TIPOS_MODELO: TipoModelo[] = ["onboarding", "plano_3_meses", "pauta_reuniao"];

/**
 * Itens vêm como texto, um por linha:
 *   onboarding / pauta:  "Título"
 *   plano:               "mes;semana;Título;descrição opcional"  (ex.: 1;2;Mapear processos)
 */
type ItemModelo = { [k: string]: string | number | null };

function parseItens(tipo: TipoModelo, txt: string | null): ItemModelo[] {
  const linhas = (txt ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return linhas.map((l, i): ItemModelo => {
    if (tipo !== "plano_3_meses") return { ordem: i + 1, titulo: l.replace(/^\d+[.)]\s*/, "") };
    const [mes, semana, titulo, descricao] = l.split(";").map((s) => s?.trim());
    const temPrefixo = /^\d+$/.test(mes ?? "");
    return temPrefixo
      ? { ordem: i + 1, mes: Number(mes), semana: semana ? Number(semana) : null, titulo: titulo ?? "", descricao: descricao ?? null }
      : { ordem: i + 1, mes: 1, semana: null, titulo: l, descricao: null };
  });
}

export async function salvarModelo(fd: FormData) {
  await exigirPerfil("admin");
  const supabase = await createClient();
  const tipo = opcao(fd, "tipo", TIPOS_MODELO);
  const id = uuid(fd, "id");

  if (fd.get("acao") === "excluir" && id) {
    const { error } = await supabase.from("modelos").delete().eq("id", id);
    fim("modelos", error?.message);
  }

  const padrao = bool(fd, "padrao");
  if (padrao) {
    // Só um padrão por tipo
    await supabase.from("modelos").update({ padrao: false }).eq("tipo", tipo);
  }
  const valores = { tipo, nome: obrigatorio(fd, "nome"), padrao, itens: parseItens(tipo, texto(fd, "itens")) };
  const { error } = id ? await supabase.from("modelos").update(valores).eq("id", id) : await supabase.from("modelos").insert(valores);
  fim("modelos", error?.message);
}

/* Listas fixas ------------------------------------------------------------------ */

const LISTAS = ["motivos_perda", "origens_lead", "pilares_biblioteca"] as const;
type Lista = (typeof LISTAS)[number];

export async function salvarItemLista(fd: FormData) {
  await exigirPerfil("admin");
  const lista = opcao<Lista>(fd, "lista", LISTAS);
  const supabase = await createClient();
  const id = uuid(fd, "id");

  if (id && fd.get("acao") === "alternar") {
    const { data: atual } = await supabase.from(lista).select("ativo").eq("id", id).maybeSingle();
    const { error } = await supabase.from(lista).update({ ativo: !(atual?.ativo ?? true) }).eq("id", id);
    fim("listas", error?.message);
  }

  const { count } = await supabase.from(lista).select("*", { count: "exact", head: true });
  const { error } = await supabase.from(lista).insert({ nome: obrigatorio(fd, "nome"), ordem: (count ?? 0) + 1 });
  fim("listas", error?.message);
}
