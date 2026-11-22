import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SinalSaude } from "@/lib/supabase/database.types";

export interface Saude {
  mentoradoId: string;
  nome: string;
  progresso: number; // 0..100
  ultimaReuniao: string | null;
  sinal: SinalSaude;
}

/**
 * Sinal de saúde de um mentorado.
 * Prioridade: risco marcado na última nota interna. Sem nota, usa o tempo
 * desde a última reunião (verde até 10 dias, amarelo até 21, vermelho depois).
 */
export async function calcularSaude(
  supabase: SupabaseClient<Database>,
  mentoradoId: string,
): Promise<Saude> {
  const [{ data: m }, { data: plano }, { data: reuniao }, { data: nota }] = await Promise.all([
    supabase.from("mentorados").select("nome_agencia").eq("id", mentoradoId).maybeSingle(),
    supabase.from("plano_itens").select("status").eq("mentorado_id", mentoradoId),
    supabase
      .from("reunioes")
      .select("data")
      .eq("mentorado_id", mentoradoId)
      .eq("realizada", true)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notas_internas")
      .select("risco")
      .eq("mentorado_id", mentoradoId)
      .not("risco", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.status === "concluido").length ?? 0;
  const progresso = total ? (feitos / total) * 100 : 0;

  let sinal: SinalSaude = "verde";
  if (nota?.risco) {
    sinal = nota.risco;
  } else if (reuniao?.data) {
    const dias = (Date.now() - new Date(reuniao.data).getTime()) / 86_400_000;
    sinal = dias > 21 ? "vermelho" : dias > 10 ? "amarelo" : "verde";
  } else {
    sinal = "amarelo";
  }

  return {
    mentoradoId,
    nome: m?.nome_agencia ?? "Mentorado",
    progresso,
    ultimaReuniao: reuniao?.data ?? null,
    sinal,
  };
}
