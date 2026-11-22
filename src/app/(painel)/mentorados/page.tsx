import Link from "next/link";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { calcularSaude } from "@/lib/saude";
import { dataCurta, pct } from "@/lib/formato";
import { Badge, Button, PageHeader, Progresso, Sinal, Vazio } from "@/components/ui";
import { Campo, Erro, Grade, Painel } from "@/components/form";
import { criarMentorado } from "./actions";

export default async function MentoradosPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await exigirPerfil("admin", "equipe");
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: mentorados }, { data: turmas }] = await Promise.all([
    supabase.from("mentorados").select("*").order("ativo", { ascending: false }).order("nome_agencia"),
    supabase.from("turmas").select("id,nome,ativa").order("created_at"),
  ]);
  const saude = await Promise.all((mentorados ?? []).map((m) => calcularSaude(supabase, m.id)));
  const semanas = await Promise.all(
    (mentorados ?? []).map((m) => supabase.rpc("semana_atual", { p_mentorado_id: m.id }).then((r) => r.data)),
  );

  return (
    <>
      <PageHeader titulo="Mentorados" descricao="Uma pasta por agência: plano, reuniões, tarefas, indicadores e arquivos." />
      <Erro mensagem={erro} />

      {mentorados && mentorados.length ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mentorados.map((m, idx) => {
            const s = saude[idx];
            return (
              <Link key={m.id} href={`/mentorados/${m.id}`} className={`glass glass-hover rise rise-${Math.min(6, idx + 1)} block rounded-[var(--radius)] p-5`}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold">
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
        <div className="mb-6">
          <Vazio titulo="Nenhum mentorado ainda" descricao="Feche um lead no Comercial, ou cadastre a agência diretamente abaixo." />
        </div>
      )}

      <Painel titulo="Cadastrar agência manualmente" aberto={!mentorados?.length}>
        <form action={criarMentorado} className="space-y-4">
          <Grade cols={4}>
            <Campo rotulo="Agência *" className="sm:col-span-2">
              <input name="nome_agencia" required />
            </Campo>
            <Campo rotulo="Dono(a)">
              <input name="dono" />
            </Campo>
            <Campo rotulo="Turma">
              <select name="turma_id" defaultValue={(turmas ?? []).find((t) => t.ativa)?.id ?? ""}>
                {(turmas ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Cidade">
              <input name="cidade" />
            </Campo>
            <Campo rotulo="UF">
              <input name="uf" maxLength={2} />
            </Campo>
          </Grade>
          <p className="text-xs text-[var(--fg-muted)]">Cria também o checklist de onboarding, os acessos, o financeiro e o registro de pós-mentoria.</p>
          <Button type="submit">Cadastrar</Button>
        </form>
      </Painel>
    </>
  );
}
