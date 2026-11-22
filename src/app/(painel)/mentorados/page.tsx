import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calcularSaude } from "@/lib/saude";
import { dataCurta, pct } from "@/lib/formato";
import { Badge, PageHeader, Progresso, Sinal, Vazio } from "@/components/ui";

export default async function MentoradosPage() {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();

  const { data: mentorados } = await supabase.from("mentorados").select("*").order("ativo", { ascending: false }).order("nome_agencia");
  const saude = await Promise.all((mentorados ?? []).map((m) => calcularSaude(supabase, m.id)));
  const semanas = await Promise.all(
    (mentorados ?? []).map((m) => supabase.rpc("semana_atual", { p_mentorado_id: m.id }).then((r) => r.data)),
  );

  return (
    <>
      <PageHeader titulo="Mentorados" descricao="Uma pasta por agência: plano, reuniões, tarefas, indicadores e arquivos." />
      {mentorados && mentorados.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mentorados.map((m, idx) => {
            const s = saude[idx];
            return (
              <Link
                key={m.id}
                href={`/mentorados/${m.id}`}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:border-[var(--primary)]/60"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Sinal cor={s.sinal} /> {m.nome_agencia}
                    </h3>
                    <p className="text-xs text-[var(--fg-muted)]">
                      {[m.dono, [m.cidade, m.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {!m.ativo ? <Badge>Encerrado</Badge> : <Badge tom="info">Semana {semanas[idx] ?? 1}/12</Badge>}
                </div>
                <Progresso valor={s.progresso} />
                <div className="mt-2 flex justify-between text-xs text-[var(--fg-muted)]">
                  <span>Plano {pct(s.progresso)}</span>
                  <span>Última reunião {s.ultimaReuniao ? dataCurta(s.ultimaReuniao) : "—"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Vazio titulo="Nenhum mentorado ainda" descricao="Quando um lead é movido para “Fechado” no Comercial, a pasta é criada aqui." />
      )}
    </>
  );
}
