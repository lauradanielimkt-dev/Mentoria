import Link from "next/link";
import { getSessao, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, dataCurta, dataHora, pct } from "@/lib/formato";
import { Badge, Card, PageHeader, Progresso, Sinal, StatCard, Vazio } from "@/components/ui";
import { calcularSaude } from "@/lib/saude";

export default async function InicioPage() {
  const sessao = await getSessao();
  return isStaff(sessao.perfil.perfil) ? (
    <InicioStaff admin={sessao.perfil.perfil === "admin"} userId={sessao.userId} />
  ) : (
    <InicioMentorado mentoradoId={sessao.perfil.mentorado_id!} />
  );
}

/* ----------------------------------------------------------------------------
 * Versão do Alberto / equipe
 * -------------------------------------------------------------------------- */
async function InicioStaff({ admin, userId }: { admin: boolean; userId: string }) {
  const supabase = await createClient();
  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 7);

  const [
    { data: turma },
    { count: vagasPreenchidas },
    { data: parcelas },
    { data: reunioes },
    { data: calls },
    { data: pendencias },
    { count: atrasadas },
    { data: mentorados },
  ] = await Promise.all([
    supabase.from("turmas").select("*").eq("ativa", true).order("created_at").limit(1).maybeSingle(),
    supabase.from("mentorados").select("*", { count: "exact", head: true }).eq("ativo", true),
    admin ? supabase.from("parcelas").select("valor,status") : Promise.resolve({ data: null }),
    supabase
      .from("reunioes")
      .select("id,data,mentorado_id,mentorados(nome_agencia)")
      .gte("data", inicioSemana.toISOString())
      .lt("data", fimSemana.toISOString())
      .order("data"),
    supabase
      .from("leads")
      .select("id,nome,agencia,data_call")
      .gte("data_call", inicioSemana.toISOString())
      .lt("data_call", fimSemana.toISOString())
      .order("data_call"),
    supabase
      .from("tarefas")
      .select("id,titulo,prazo,status,mentorado_id,mentorados(nome_agencia)")
      .eq("responsavel_id", userId)
      .neq("status", "concluida")
      .order("prazo", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("tarefas")
      .select("*", { count: "exact", head: true })
      .neq("status", "concluida")
      .lt("prazo", hoje.toISOString().slice(0, 10)),
    supabase.from("mentorados").select("id,nome_agencia").eq("ativo", true).order("nome_agencia"),
  ]);

  const recebido = (parcelas ?? []).filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const aReceber = (parcelas ?? []).filter((p) => p.status !== "pago").reduce((s, p) => s + Number(p.valor), 0);

  const saude = await Promise.all((mentorados ?? []).map((m) => calcularSaude(supabase, m.id)));

  type Evento = { id: string; data: string; titulo: string; tipo: "reuniao" | "call"; href: string };
  const agenda: Evento[] = [
    ...(reunioes ?? []).map((r) => ({
      id: r.id,
      data: r.data,
      titulo: `Reunião · ${(r.mentorados as { nome_agencia: string } | null)?.nome_agencia ?? "Mentorado"}`,
      tipo: "reuniao" as const,
      href: `/mentorados/${r.mentorado_id}?aba=reunioes`,
    })),
    ...(calls ?? []).map((c) => ({
      id: c.id,
      data: c.data_call!,
      titulo: `Call · ${c.nome}${c.agencia ? ` (${c.agencia})` : ""}`,
      tipo: "call" as const,
      href: `/comercial`,
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <>
      <PageHeader titulo="Início" descricao={turma ? turma.nome : undefined} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard rotulo="Vagas preenchidas" valor={`${vagasPreenchidas ?? 0}/${turma?.vagas ?? 5}`} tom="destaque" delay={1} />
        {admin ? (
          <>
            <StatCard rotulo="Receita recebida" valor={brl(recebido)} tom="ok" delay={2} />
            <StatCard rotulo="A receber" valor={brl(aReceber)} delay={3} />
          </>
        ) : (
          <StatCard rotulo="Reuniões na semana" valor={reunioes?.length ?? 0} delay={2} />
        )}
        <StatCard
          rotulo="Tarefas atrasadas"
          valor={atrasadas ?? 0}
          tom={(atrasadas ?? 0) > 0 ? "erro" : "neutro"}
          delay={4}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card titulo="Minhas pendências" className="lg:col-span-1">
          {pendencias && pendencias.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {pendencias.map((t) => {
                const atrasada = t.prazo && t.prazo < hoje.toISOString().slice(0, 10);
                return (
                  <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm">{t.titulo}</p>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {(t.mentorados as { nome_agencia: string } | null)?.nome_agencia ?? "Interno"}
                      </p>
                    </div>
                    <Badge tom={atrasada ? "erro" : "neutro"}>{dataCurta(t.prazo)}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vazio titulo="Nada pendente" descricao="Tarefas atribuídas a você aparecem aqui, ordenadas por prazo." />
          )}
        </Card>

        <Card titulo="Agenda da semana" className="lg:col-span-1">
          {agenda.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {agenda.map((e) => (
                <li key={e.id} className="py-2.5">
                  <Link href={e.href} className="flex items-start justify-between gap-3 hover:underline">
                    <span className="text-sm">{e.titulo}</span>
                    <span className="shrink-0 text-xs text-[var(--fg-muted)]">{dataHora(e.data)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio titulo="Semana livre" descricao="Reuniões com mentorados e calls com interessados aparecem aqui." />
          )}
        </Card>

        <Card titulo="Saúde dos mentorados" className="lg:col-span-1">
          {saude.length > 0 ? (
            <ul className="space-y-4">
              {saude.map((s) => (
                <li key={s.mentoradoId}>
                  <Link href={`/mentorados/${s.mentoradoId}`} className="group block">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium group-hover:underline">
                        <Sinal cor={s.sinal} /> {s.nome}
                      </span>
                      <span className="text-xs text-[var(--fg-muted)]">{pct(s.progresso)}</span>
                    </div>
                    <Progresso valor={s.progresso} />
                    <p className="mt-1 text-xs text-[var(--fg-muted)]">
                      Última reunião: {s.ultimaReuniao ? dataCurta(s.ultimaReuniao) : "nenhuma"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio titulo="Nenhum mentorado ainda" descricao="Ao fechar um lead no Comercial, a pasta dele aparece aqui." />
          )}
        </Card>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------------------
 * Versão do mentorado: próxima reunião, tarefas, progresso
 * -------------------------------------------------------------------------- */
async function InicioMentorado({ mentoradoId }: { mentoradoId: string }) {
  const supabase = await createClient();
  const agora = new Date().toISOString();

  const [{ data: mentorado }, { data: proxima }, { data: tarefas }, { data: plano }, { data: semana }] =
    await Promise.all([
      supabase.from("mentorados").select("*").eq("id", mentoradoId).maybeSingle(),
      supabase.from("reunioes").select("*").eq("mentorado_id", mentoradoId).gte("data", agora).order("data").limit(1).maybeSingle(),
      supabase.from("tarefas").select("*").eq("mentorado_id", mentoradoId).eq("lado", "mentorado").neq("status", "concluida").order("prazo", { nullsFirst: false }),
      supabase.from("plano_itens").select("status").eq("mentorado_id", mentoradoId),
      supabase.rpc("semana_atual", { p_mentorado_id: mentoradoId }),
    ]);

  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.status === "concluido").length ?? 0;
  const progresso = total ? (feitos / total) * 100 : 0;

  return (
    <>
      <PageHeader
        titulo={`Olá, ${mentorado?.nome_agencia ?? "mentorado"}`}
        descricao={semana ? `Semana ${semana} de 12 da mentoria` : "Sua mentoria"}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard rotulo="Próxima reunião" valor={proxima ? dataHora(proxima.data) : "A agendar"} tom="destaque" />
        <StatCard rotulo="Tarefas abertas" valor={tarefas?.length ?? 0} />
        <StatCard rotulo="Progresso do plano" valor={pct(progresso)} detalhe={`${feitos} de ${total} entregas`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card titulo="Suas tarefas">
          {tarefas && tarefas.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {tarefas.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{t.titulo}</span>
                  <Badge>{dataCurta(t.prazo)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio titulo="Tudo em dia" descricao="Suas tarefas da mentoria aparecem aqui." />
          )}
        </Card>
        <Card titulo="Atalhos">
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:underline" href="/minha-mentoria?aba=plano">Ver o plano de 3 meses</Link></li>
            <li><Link className="hover:underline" href="/minha-mentoria?aba=reunioes">Reuniões e gravações</Link></li>
            <li><Link className="hover:underline" href="/biblioteca">Biblioteca de materiais</Link></li>
            <li><Link className="hover:underline" href="/onboarding">Checklist de onboarding</Link></li>
          </ul>
        </Card>
      </div>
    </>
  );
}
