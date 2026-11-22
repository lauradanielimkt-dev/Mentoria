"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil, getSessao, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bool, data, dataHoraSP, inteiro, linhasParaJson, numero, obrigatorio, opcao, texto, uuid } from "@/lib/form";
import type { LadoTarefa, PeriodoIndicador, SinalSaude, StatusPlano, StatusTarefa } from "@/lib/supabase/database.types";

/* Helpers ------------------------------------------------------------------ */

function voltar(fd: FormData, aba: string, erro?: string) {
  const base = texto(fd, "voltar") ?? "/mentorados";
  const sep = base.includes("?") ? "&" : "?";
  const qs = `${sep}aba=${aba}${erro ? `&erro=${encodeURIComponent(erro)}` : ""}`;
  revalidatePath(base.split("?")[0]);
  revalidatePath("/");
  revalidatePath("/mentorados");
  redirect(`${base}${qs}`);
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : "Erro inesperado";
}

/* Ficha ---------------------------------------------------------------------- */

export async function atualizarMentorado(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "mentorado_id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("mentorados")
    .update({
      nome_agencia: obrigatorio(fd, "nome_agencia"),
      dono: texto(fd, "dono"),
      cidade: texto(fd, "cidade"),
      uf: texto(fd, "uf")?.toUpperCase().slice(0, 2) ?? null,
      equipe: texto(fd, "equipe"),
      faturamento_aprox: numero(fd, "faturamento_aprox"),
      ticket_medio: numero(fd, "ticket_medio"),
      canais: texto(fd, "canais"),
      turma_id: uuid(fd, "turma_id"),
    })
    .eq("id", id);
  voltar(fd, "visao", error?.message);
}

export async function criarMentorado(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { data: turma } = await supabase.from("turmas").select("id").eq("ativa", true).limit(1).maybeSingle();
  const { data: novo, error } = await supabase
    .from("mentorados")
    .insert({
      nome_agencia: obrigatorio(fd, "nome_agencia"),
      dono: texto(fd, "dono"),
      cidade: texto(fd, "cidade"),
      uf: texto(fd, "uf")?.toUpperCase().slice(0, 2) ?? null,
      turma_id: uuid(fd, "turma_id") ?? turma?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !novo) redirect(`/mentorados?erro=${encodeURIComponent(error?.message ?? "erro")}`);

  // Mesmos registros auxiliares de quando um lead é fechado
  await Promise.all([
    supabase.from("financeiro").insert({ mentorado_id: novo.id }),
    supabase.from("pos_mentoria").insert({ mentorado_id: novo.id }),
    supabase.from("acessos").insert(
      ["CRM", "Sistema de gestão", "Cadastro nos fornecedores", "Parceiros acionados", "Equipe de roteiros", "Buscador de fornecedores"].map(
        (item, i) => ({ mentorado_id: novo.id, item, ordem: i + 1 }),
      ),
    ),
  ]);
  const { data: modelo } = await supabase.from("modelos").select("itens").eq("tipo", "onboarding").eq("padrao", true).limit(1).maybeSingle();
  const itens = (modelo?.itens as { titulo: string; ordem?: number }[] | null) ?? [];
  if (itens.length) {
    await supabase.from("onboarding_itens").insert(itens.map((i, idx) => ({ mentorado_id: novo.id, titulo: i.titulo, ordem: i.ordem ?? idx + 1 })));
  }

  revalidatePath("/mentorados");
  revalidatePath("/onboarding");
  redirect(`/mentorados/${novo.id}`);
}

export async function desativarMentorado(fd: FormData) {
  await exigirPerfil("admin");
  const id = obrigatorio(fd, "mentorado_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("desativar_mentorado", { p_mentorado_id: id });
  voltar(fd, "visao", error?.message);
}

export async function reativarMentorado(fd: FormData) {
  await exigirPerfil("admin");
  const id = obrigatorio(fd, "mentorado_id");
  const supabase = await createClient();
  await supabase.from("mentorados").update({ ativo: true }).eq("id", id);
  await supabase.from("perfis").update({ ativo: true }).eq("mentorado_id", id);
  voltar(fd, "visao");
}

/* Diagnóstico ------------------------------------------------------------------ */

export async function salvarDiagnostico(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const mentoradoId = obrigatorio(fd, "mentorado_id");
  const id = uuid(fd, "id");
  const supabase = await createClient();
  const valores = {
    mentorado_id: mentoradoId,
    respostas: linhasParaJson(texto(fd, "respostas")),
    notas_reuniao: texto(fd, "notas_reuniao"),
    data_reuniao: data(fd, "data_reuniao"),
    visivel_mentorado: bool(fd, "visivel_mentorado"),
  };
  const { error } = id
    ? await supabase.from("diagnosticos").update(valores).eq("id", id)
    : await supabase.from("diagnosticos").insert(valores);
  voltar(fd, "diagnostico", error?.message);
}

/* Plano -------------------------------------------------------------------- */

export async function gerarPlano(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const mentoradoId = obrigatorio(fd, "mentorado_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("gerar_plano_do_modelo", { p_mentorado_id: mentoradoId, p_modelo_id: uuid(fd, "modelo_id") });
  voltar(fd, "plano", error?.message);
}

export async function criarPlanoItem(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase.from("plano_itens").insert({
    mentorado_id: obrigatorio(fd, "mentorado_id"),
    mes: Math.min(3, Math.max(1, inteiro(fd, "mes") ?? 1)),
    semana: inteiro(fd, "semana"),
    titulo: obrigatorio(fd, "titulo"),
    descricao: texto(fd, "descricao"),
    visivel_mentorado: bool(fd, "visivel_mentorado"),
    ordem: inteiro(fd, "ordem") ?? 0,
  });
  voltar(fd, "plano", error?.message);
}

const STATUS_PLANO: StatusPlano[] = ["pendente", "em_andamento", "concluido", "atrasado"];

export async function atualizarPlanoItem(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();
  if (fd.get("acao") === "excluir") {
    const { error } = await supabase.from("plano_itens").delete().eq("id", id);
    voltar(fd, "plano", error?.message);
  }
  const { error } = await supabase
    .from("plano_itens")
    .update({ status: opcao(fd, "status", STATUS_PLANO, "pendente") })
    .eq("id", id);
  voltar(fd, "plano", error?.message);
}

/* Reuniões ------------------------------------------------------------------ */

export async function criarReuniao(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase.from("reunioes").insert({
    mentorado_id: obrigatorio(fd, "mentorado_id"),
    data: dataHoraSP(fd, "data") ?? obrigatorio(fd, "data"),
    duracao_min: inteiro(fd, "duracao_min") ?? 120,
    pauta: texto(fd, "pauta"),
    link_gravacao: texto(fd, "link_gravacao"),
    visivel_mentorado: bool(fd, "visivel_mentorado"),
  });
  voltar(fd, "reunioes", error?.message);
}

export async function atualizarReuniao(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();
  if (fd.get("acao") === "excluir") {
    const { error } = await supabase.from("reunioes").delete().eq("id", id);
    voltar(fd, "reunioes", error?.message);
  }
  const { error } = await supabase
    .from("reunioes")
    .update({
      data: dataHoraSP(fd, "data") ?? obrigatorio(fd, "data"),
      duracao_min: inteiro(fd, "duracao_min") ?? 120,
      pauta: texto(fd, "pauta"),
      ata: texto(fd, "ata"),
      decisoes: texto(fd, "decisoes"),
      plano_acao: texto(fd, "plano_acao"),
      link_gravacao: texto(fd, "link_gravacao"),
      realizada: bool(fd, "realizada"),
      visivel_mentorado: bool(fd, "visivel_mentorado"),
    })
    .eq("id", id);
  voltar(fd, "reunioes", error?.message);
}

/* Tarefas ---------------------------------------------------------------------- */

const LADOS: LadoTarefa[] = ["mentorado", "marmaris"];
const STATUS_TAREFA: StatusTarefa[] = ["a_fazer", "em_andamento", "concluida"];

export async function criarTarefa(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").insert({
    mentorado_id: uuid(fd, "mentorado_id"),
    titulo: obrigatorio(fd, "titulo"),
    descricao: texto(fd, "descricao"),
    lado: opcao(fd, "lado", LADOS, "marmaris"),
    responsavel_id: uuid(fd, "responsavel_id"),
    prazo: data(fd, "prazo"),
    visivel_mentorado: bool(fd, "visivel_mentorado"),
  });
  voltar(fd, "tarefas", error?.message);
}

/** Staff muda qualquer tarefa; mentorado só conclui/reabre as do lado dele (RLS). */
export async function atualizarTarefa(fd: FormData) {
  const sessao = await getSessao();
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();

  if (fd.get("acao") === "excluir") {
    if (!isStaff(sessao.perfil.perfil)) redirect("/");
    const { error } = await supabase.from("tarefas").delete().eq("id", id);
    voltar(fd, "tarefas", error?.message);
  }

  const status = opcao(fd, "status", STATUS_TAREFA, "a_fazer");
  const { error } = await supabase
    .from("tarefas")
    .update({ status, concluida_em: status === "concluida" ? new Date().toISOString() : null })
    .eq("id", id);
  voltar(fd, "tarefas", error?.message);
}

/* Indicadores ----------------------------------------------------------------- */

const PERIODOS: PeriodoIndicador[] = ["inicio", "mes_1", "mes_2", "mes_3"];

export async function salvarIndicador(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase.from("indicadores").upsert(
    {
      mentorado_id: obrigatorio(fd, "mentorado_id"),
      periodo: opcao(fd, "periodo", PERIODOS),
      faturamento: numero(fd, "faturamento"),
      num_vendas: inteiro(fd, "num_vendas"),
      leads: inteiro(fd, "leads"),
      conversao: numero(fd, "conversao"),
      ticket_medio: numero(fd, "ticket_medio"),
      pct_recorrencia: numero(fd, "pct_recorrencia"),
      seguidores: inteiro(fd, "seguidores"),
      observacoes: texto(fd, "observacoes"),
    },
    { onConflict: "mentorado_id,periodo" },
  );
  voltar(fd, "indicadores", error?.message);
}

/* Acessos --------------------------------------------------------------------- */

export async function alternarAcesso(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "id");
  const liberado = fd.get("liberado") === "1";
  const supabase = await createClient();
  const { error } = await supabase
    .from("acessos")
    .update({ liberado, liberado_em: liberado ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", id);
  voltar(fd, "acessos", error?.message);
}

export async function criarAcesso(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase.from("acessos").insert({
    mentorado_id: obrigatorio(fd, "mentorado_id"),
    item: obrigatorio(fd, "item"),
    ordem: inteiro(fd, "ordem") ?? 99,
  });
  voltar(fd, "acessos", error?.message);
}

/* Notas internas ---------------------------------------------------------------- */

const RISCOS: SinalSaude[] = ["verde", "amarelo", "vermelho"];

export async function criarNota(fd: FormData) {
  const sessao = await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const risco = texto(fd, "risco");
  const { error } = await supabase.from("notas_internas").insert({
    mentorado_id: obrigatorio(fd, "mentorado_id"),
    autor_id: sessao.userId,
    texto: obrigatorio(fd, "texto"),
    risco: risco && (RISCOS as string[]).includes(risco) ? (risco as SinalSaude) : null,
  });
  voltar(fd, "notas", error?.message);
}

export async function excluirNota(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { error } = await supabase.from("notas_internas").delete().eq("id", obrigatorio(fd, "id"));
  voltar(fd, "notas", error?.message);
}

/* Arquivos (upload para o Storage) --------------------------------------------- */

export async function enviarArquivo(fd: FormData) {
  const sessao = await exigirPerfil("admin", "equipe");
  const mentoradoId = obrigatorio(fd, "mentorado_id");
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) voltar(fd, "arquivos", "Selecione um arquivo");
  const f = arquivo as File;

  const supabase = await createClient();
  const seguro = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${mentoradoId}/${Date.now()}-${seguro}`;
  const up = await supabase.storage.from("arquivos-mentorados").upload(path, f, { contentType: f.type || undefined });
  if (up.error) voltar(fd, "arquivos", up.error.message);

  const { error } = await supabase.from("arquivos").insert({
    mentorado_id: mentoradoId,
    nome: texto(fd, "nome") ?? f.name,
    arquivo_path: path,
    tipo: f.type || null,
    visivel_mentorado: bool(fd, "visivel_mentorado"),
    enviado_por: sessao.userId,
  });
  voltar(fd, "arquivos", error?.message);
}

export async function excluirArquivo(fd: FormData) {
  await exigirPerfil("admin", "equipe");
  const id = obrigatorio(fd, "id");
  const supabase = await createClient();
  const { data: a } = await supabase.from("arquivos").select("arquivo_path").eq("id", id).maybeSingle();
  if (a?.arquivo_path) await supabase.storage.from("arquivos-mentorados").remove([a.arquivo_path]);
  const { error } = await supabase.from("arquivos").delete().eq("id", id);
  voltar(fd, "arquivos", error?.message);
}

/** Link assinado de curta duração para baixar um arquivo (staff ou o próprio mentorado, via RLS do Storage). */
export async function baixarArquivo(fd: FormData) {
  await getSessao();
  const path = obrigatorio(fd, "path");
  const supabase = await createClient();
  const { data: s, error } = await supabase.storage.from("arquivos-mentorados").createSignedUrl(path, 300);
  if (error || !s) voltar(fd, "arquivos", error?.message ?? msg(error));
  redirect(s!.signedUrl);
}
