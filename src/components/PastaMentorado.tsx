import { createClient } from "@/lib/supabase/server";
import { brl, dataCurta, dataHora, pct, ROTULOS } from "@/lib/formato";
import type { Mentorado, Tarefa, StatusTarefa } from "@/lib/supabase/database.types";
import { Abas, Badge, Card, Coluna, CartaoKanban, PageHeader, Progresso, Sinal, Tabela, Td, Vazio } from "@/components/ui";

const ABAS_STAFF = [
  { id: "visao", label: "Visão geral" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "plano", label: "Plano de 3 meses" },
  { id: "reunioes", label: "Reuniões" },
  { id: "tarefas", label: "Tarefas" },
  { id: "indicadores", label: "Indicadores" },
  { id: "acessos", label: "Acessos" },
  { id: "notas", label: "Notas internas" },
  { id: "arquivos", label: "Arquivos" },
];
const ABAS_MENTORADO = ABAS_STAFF.filter((a) => a.id !== "notas");

export async function PastaMentorado({
  mentorado,
  aba = "visao",
  base,
  staff,
}: {
  mentorado: Mentorado;
  aba?: string;
  base: string;
  staff: boolean;
}) {
  const abas = staff ? ABAS_STAFF : ABAS_MENTORADO;
  const ativa = abas.some((a) => a.id === aba) ? aba : "visao";
  const supabase = await createClient();
  const id = mentorado.id;

  const { data: semana } = await supabase.rpc("semana_atual", { p_mentorado_id: id });

  return (
    <>
      <PageHeader
        titulo={mentorado.nome_agencia}
        descricao={[
          mentorado.dono,
          [mentorado.cidade, mentorado.uf].filter(Boolean).join("/"),
          `Semana ${semana ?? 1} de 12`,
          !mentorado.ativo && "Acesso encerrado",
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <Abas abas={abas} ativa={ativa} base={base} />

      {ativa === "visao" && <AbaVisao mentorado={mentorado} />}
      {ativa === "diagnostico" && <AbaDiagnostico id={id} />}
      {ativa === "plano" && <AbaPlano id={id} />}
      {ativa === "reunioes" && <AbaReunioes id={id} />}
      {ativa === "tarefas" && <AbaTarefas id={id} />}
      {ativa === "indicadores" && <AbaIndicadores id={id} />}
      {ativa === "acessos" && <AbaAcessos id={id} />}
      {ativa === "notas" && staff && <AbaNotas id={id} />}
      {ativa === "arquivos" && <AbaArquivos id={id} />}
    </>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaVisao({ mentorado }: { mentorado: Mentorado }) {
  const supabase = await createClient();
  const [{ data: plano }, { data: proximas }] = await Promise.all([
    supabase.from("plano_itens").select("status,titulo,mes,semana").eq("mentorado_id", mentorado.id).order("ordem"),
    supabase.from("tarefas").select("*").eq("mentorado_id", mentorado.id).neq("status", "concluida").order("prazo", { nullsFirst: false }).limit(5),
  ]);
  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.status === "concluido").length ?? 0;
  const progresso = total ? (feitos / total) * 100 : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card titulo="Ficha da agência" className="lg:col-span-1">
        <dl className="space-y-2 text-sm">
          {[
            ["Dono(a)", mentorado.dono],
            ["Cidade", [mentorado.cidade, mentorado.uf].filter(Boolean).join("/")],
            ["Equipe", mentorado.equipe],
            ["Faturamento", mentorado.faturamento_aprox ? brl(mentorado.faturamento_aprox) : null],
            ["Ticket médio", mentorado.ticket_medio ? brl(mentorado.ticket_medio) : null],
            ["Canais", mentorado.canais],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-4">
              <dt className="text-[var(--fg-muted)]">{k}</dt>
              <dd className="text-right">{v || "—"}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card titulo="Progresso do plano" className="lg:col-span-1">
        <p className="mb-2 text-3xl font-semibold">{pct(progresso)}</p>
        <Progresso valor={progresso} />
        <p className="mt-2 text-xs text-[var(--fg-muted)]">{feitos} de {total} entregas concluídas</p>
      </Card>
      <Card titulo="Próximos passos" className="lg:col-span-1">
        {proximas && proximas.length ? (
          <ul className="divide-y divide-[var(--border)] text-sm">
            {proximas.map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span>{t.titulo}</span>
                <Badge>{dataCurta(t.prazo)}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">Nenhuma tarefa aberta.</p>
        )}
      </Card>
    </div>
  );
}

async function AbaDiagnostico({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("diagnosticos").select("*").eq("mentorado_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return <Vazio titulo="Diagnóstico ainda não registrado" descricao="Respostas do formulário de dezembro e notas da reunião de diagnóstico ficam aqui." />;
  const respostas = (data.respostas ?? {}) as Record<string, unknown>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card titulo="Formulário de diagnóstico">
        {Object.keys(respostas).length ? (
          <dl className="space-y-3 text-sm">
            {Object.entries(respostas).map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-[var(--fg-muted)]">{k}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">Sem respostas.</p>
        )}
      </Card>
      <Card titulo={`Reunião de diagnóstico ${data.data_reuniao ? `· ${dataCurta(data.data_reuniao)}` : ""}`}>
        <p className="whitespace-pre-wrap text-sm">{data.notas_reuniao || "Sem notas."}</p>
      </Card>
    </div>
  );
}

async function AbaPlano({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: itens } = await supabase.from("plano_itens").select("*").eq("mentorado_id", id).order("mes").order("semana", { nullsFirst: false }).order("ordem");
  if (!itens?.length) return <Vazio titulo="Plano ainda não gerado" descricao="O plano de 3 meses é criado a partir do modelo em Configurações e ajustado por agência." />;
  const tom = (s: string) => (s === "concluido" ? "ok" : s === "atrasado" ? "erro" : s === "em_andamento" ? "info" : "neutro");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[1, 2, 3].map((mes) => (
        <Card key={mes} titulo={`Mês ${mes}`}>
          <ul className="space-y-2">
            {itens.filter((i) => i.mes === mes).map((i) => (
              <li key={i.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{i.titulo}</p>
                  <Badge tom={tom(i.status)}>{ROTULOS.statusPlano[i.status]}</Badge>
                </div>
                {i.semana && <p className="mt-1 text-xs text-[var(--fg-muted)]">Semana {i.semana}</p>}
                {i.descricao && <p className="mt-1 text-xs">{i.descricao}</p>}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

async function AbaReunioes({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("reunioes").select("*").eq("mentorado_id", id).order("data", { ascending: false });
  if (!data?.length) return <Vazio titulo="Nenhuma reunião registrada" descricao="Cada reunião semanal de 2h entra aqui com pauta, ata, gravação e plano de ação." />;
  return (
    <Tabela cabecalho={["Data", "Pauta", "Decisões", "Plano de ação", "Gravação", "Status"]}>
      {data.map((r) => (
        <tr key={r.id}>
          <Td className="whitespace-nowrap">{dataHora(r.data)}</Td>
          <Td className="max-w-xs truncate">{r.pauta ?? "—"}</Td>
          <Td className="max-w-xs truncate">{r.decisoes ?? "—"}</Td>
          <Td className="max-w-xs truncate">{r.plano_acao ?? "—"}</Td>
          <Td>{r.link_gravacao ? <a className="text-[var(--primary)] hover:underline" href={r.link_gravacao} target="_blank" rel="noreferrer">Ver</a> : "—"}</Td>
          <Td>{r.realizada ? <Badge tom="ok">Realizada</Badge> : <Badge>Agendada</Badge>}</Td>
        </tr>
      ))}
    </Tabela>
  );
}

async function AbaTarefas({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("tarefas").select("*").eq("mentorado_id", id).order("ordem").order("prazo", { nullsFirst: false });
  const colunas: StatusTarefa[] = ["a_fazer", "em_andamento", "concluida"];
  const lista = (data ?? []) as Tarefa[];
  if (!lista.length) return <Vazio titulo="Nenhuma tarefa" descricao="Cada tarefa tem um lado responsável: Mentorado ou Marmaris." />;
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {colunas.map((c) => {
        const col = lista.filter((t) => t.status === c);
        return (
          <Coluna key={c} titulo={ROTULOS.statusTarefa[c]} total={col.length}>
            {col.map((t) => (
              <CartaoKanban key={t.id}>
                <p className="font-medium">{t.titulo}</p>
                <div className="mt-2 flex gap-1.5">
                  <Badge tom={t.lado === "mentorado" ? "info" : "neutro"}>{t.lado === "mentorado" ? "Mentorado" : "Marmaris"}</Badge>
                  {t.prazo && <Badge>{dataCurta(t.prazo)}</Badge>}
                </div>
              </CartaoKanban>
            ))}
          </Coluna>
        );
      })}
    </div>
  );
}

async function AbaIndicadores({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("indicadores").select("*").eq("mentorado_id", id);
  const periodos = ["inicio", "mes_1", "mes_2", "mes_3"] as const;
  const por = new Map((data ?? []).map((i) => [i.periodo, i]));
  const linhas: [string, (i: NonNullable<typeof data>[number]) => string][] = [
    ["Faturamento", (i) => (i.faturamento != null ? brl(i.faturamento) : "—")],
    ["Nº de vendas", (i) => i.num_vendas?.toString() ?? "—"],
    ["Leads", (i) => i.leads?.toString() ?? "—"],
    ["Conversão", (i) => (i.conversao != null ? `${i.conversao}%` : "—")],
    ["Ticket médio", (i) => (i.ticket_medio != null ? brl(i.ticket_medio) : "—")],
    ["% recorrência", (i) => (i.pct_recorrencia != null ? `${i.pct_recorrencia}%` : "—")],
    ["Seguidores", (i) => i.seguidores?.toString() ?? "—"],
  ];
  return (
    <Tabela cabecalho={["Indicador", ...periodos.map((p) => ROTULOS.periodo[p])]}>
      {linhas.map(([nome, fn]) => (
        <tr key={nome}>
          <Td className="font-medium">{nome}</Td>
          {periodos.map((p) => {
            const i = por.get(p);
            return <Td key={p}>{i ? fn(i) : "—"}</Td>;
          })}
        </tr>
      ))}
    </Tabela>
  );
}

async function AbaAcessos({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("acessos").select("*").eq("mentorado_id", id).order("ordem");
  if (!data?.length) return <Vazio titulo="Checklist de acessos vazio" />;
  return (
    <Card className="max-w-xl">
      <ul className="divide-y divide-[var(--border)] text-sm">
        {data.map((a) => (
          <li key={a.id} className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2">
              <Sinal cor={a.liberado ? "verde" : null} /> {a.item}
            </span>
            <span className="text-xs text-[var(--fg-muted)]">{a.liberado ? `Liberado ${dataCurta(a.liberado_em)}` : "Pendente"}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function AbaNotas({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("notas_internas").select("*, perfis(nome)").eq("mentorado_id", id).order("created_at", { ascending: false });
  type Nota = NonNullable<typeof data>[number] & { perfis: { nome: string | null } | null };
  const notas = (data ?? []) as Nota[];
  return (
    <div className="max-w-2xl space-y-3">
      <p className="rounded-lg bg-[var(--alerta)]/10 px-3 py-2 text-xs text-[var(--alerta-fg)]">
        Visível só para admin e equipe. O mentorado nunca vê esta aba.
      </p>
      {notas.length ? (
        notas.map((n) => (
          <Card key={n.id}>
            <div className="mb-2 flex items-center justify-between text-xs text-[var(--fg-muted)]">
              <span>{n.perfis?.nome ?? "—"} · {dataHora(n.created_at)}</span>
              {n.risco && (
                <span className="flex items-center gap-1.5">
                  <Sinal cor={n.risco} /> risco {n.risco}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm">{n.texto}</p>
          </Card>
        ))
      ) : (
        <Vazio titulo="Sem notas internas" />
      )}
    </div>
  );
}

async function AbaArquivos({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("arquivos").select("*").eq("mentorado_id", id).order("created_at", { ascending: false });
  if (!data?.length) return <Vazio titulo="Nenhum arquivo" descricao="Contrato e materiais enviados pela agência ficam aqui." />;
  return (
    <Tabela cabecalho={["Arquivo", "Tipo", "Enviado em"]}>
      {data.map((a) => (
        <tr key={a.id}>
          <Td className="font-medium">{a.nome}</Td>
          <Td>{a.tipo ?? "—"}</Td>
          <Td className="text-[var(--fg-muted)]">{dataCurta(a.created_at)}</Td>
        </tr>
      ))}
    </Tabela>
  );
}
