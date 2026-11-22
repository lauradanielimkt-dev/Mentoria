import { createClient } from "@/lib/supabase/server";
import { brl, dataCurta, dataHora, inputDate, inputDateTime, pct, ROTULOS } from "@/lib/formato";
import type { Mentorado, Tarefa, StatusTarefa, Reuniao, Indicador, PeriodoIndicador } from "@/lib/supabase/database.types";
import { Abas, Badge, Button, Card, Coluna, CartaoKanban, PageHeader, Progresso, Sinal, Tabela, Td, Vazio } from "@/components/ui";
import { BotaoMini, Campo, Check, Erro, Grade, Ok, Painel } from "@/components/form";
import { alternarLoginMentorado, criarLoginMentorado, redefinirSenhaMentorado } from "@/app/(painel)/mentorados/acessos-actions";
import {
  alternarAcesso,
  atualizarMentorado,
  atualizarPlanoItem,
  atualizarReuniao,
  atualizarTarefa,
  baixarArquivo,
  criarAcesso,
  criarNota,
  criarPlanoItem,
  criarReuniao,
  criarTarefa,
  desativarMentorado,
  enviarArquivo,
  excluirArquivo,
  excluirNota,
  gerarPlano,
  reativarMentorado,
  salvarDiagnostico,
  salvarIndicador,
} from "@/app/(painel)/mentorados/actions";

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

interface Ctx {
  id: string;
  base: string;
  staff: boolean;
  admin: boolean;
}

export async function PastaMentorado({
  mentorado,
  aba = "visao",
  base,
  staff,
  admin = false,
  erro,
  ok,
}: {
  mentorado: Mentorado;
  aba?: string;
  base: string;
  staff: boolean;
  admin?: boolean;
  erro?: string;
  ok?: string;
}) {
  const abas = staff ? ABAS_STAFF : ABAS_MENTORADO;
  const ativa = abas.some((a) => a.id === aba) ? aba : "visao";
  const supabase = await createClient();
  const ctx: Ctx = { id: mentorado.id, base, staff, admin };

  const { data: semana } = await supabase.rpc("semana_atual", { p_mentorado_id: mentorado.id });

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
        acoes={
          staff && admin ? (
            <form action={mentorado.ativo ? desativarMentorado : reativarMentorado}>
              <input type="hidden" name="mentorado_id" value={mentorado.id} />
              <input type="hidden" name="voltar" value={base} />
              <Button type="submit" variante={mentorado.ativo ? "secundario" : "primario"}>
                {mentorado.ativo ? "Encerrar acesso" : "Reativar acesso"}
              </Button>
            </form>
          ) : undefined
        }
      />
      <Abas abas={abas} ativa={ativa} base={base} />
      <Erro mensagem={erro} />
      <Ok mensagem={ok} />

      {ativa === "visao" && <AbaVisao mentorado={mentorado} ctx={ctx} />}
      {ativa === "diagnostico" && <AbaDiagnostico ctx={ctx} />}
      {ativa === "plano" && <AbaPlano ctx={ctx} />}
      {ativa === "reunioes" && <AbaReunioes ctx={ctx} />}
      {ativa === "tarefas" && <AbaTarefas ctx={ctx} />}
      {ativa === "indicadores" && <AbaIndicadores ctx={ctx} />}
      {ativa === "acessos" && <AbaAcessos ctx={ctx} />}
      {ativa === "notas" && staff && <AbaNotas ctx={ctx} />}
      {ativa === "arquivos" && <AbaArquivos ctx={ctx} />}
    </>
  );
}

function Ocultos({ ctx }: { ctx: Ctx }) {
  return (
    <>
      <input type="hidden" name="mentorado_id" value={ctx.id} />
      <input type="hidden" name="voltar" value={ctx.base} />
    </>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaVisao({ mentorado, ctx }: { mentorado: Mentorado; ctx: Ctx }) {
  const supabase = await createClient();
  const [{ data: plano }, { data: proximas }, { data: turmas }, { data: logins }] = await Promise.all([
    supabase.from("plano_itens").select("status").eq("mentorado_id", mentorado.id),
    supabase.from("tarefas").select("*").eq("mentorado_id", mentorado.id).neq("status", "concluida").order("prazo", { nullsFirst: false }).limit(5),
    ctx.staff ? supabase.from("turmas").select("id,nome").order("created_at") : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    ctx.staff
      ? supabase.from("perfis").select("id,nome,email,ativo").eq("mentorado_id", mentorado.id).order("created_at")
      : Promise.resolve({ data: [] as { id: string; nome: string | null; email: string | null; ativo: boolean }[] }),
  ]);
  const total = plano?.length ?? 0;
  const feitos = plano?.filter((p) => p.status === "concluido").length ?? 0;
  const progresso = total ? (feitos / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card titulo="Ficha da agência" className="lg:col-span-1">
          <dl className="space-y-2.5 text-[13.5px]">
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
          <p className="tabular text-[40px] font-semibold leading-none tracking-tight">{pct(progresso)}</p>
          <div className="mt-4">
            <Progresso valor={progresso} />
          </div>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            {feitos} de {total} entregas concluídas
          </p>
        </Card>
        <Card titulo="Próximos passos" className="lg:col-span-1">
          {proximas && proximas.length ? (
            <ul className="divide-y divide-[var(--border)] text-[13.5px]">
              {proximas.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-2">
                  <span>{t.titulo}</span>
                  <Badge>{dataCurta(t.prazo)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-[var(--fg-muted)]">Nenhuma tarefa aberta.</p>
          )}
        </Card>
      </div>

      {ctx.staff && (
        <Card titulo="Acessos ao painel" acoes={<Badge tom={logins?.length ? "ok" : "alerta"}>{logins?.length ? `${logins.length} login(s)` : "Sem login"}</Badge>}>
          {logins && logins.length > 0 && (
            <ul className="mb-5 divide-y divide-[var(--border)] text-[13.5px]">
              {logins.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <Sinal cor={l.ativo ? "verde" : "vermelho"} />
                    <span className="font-medium">{l.nome ?? "—"}</span>
                    <span className="text-[var(--fg-muted)]">{l.email}</span>
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <details className="group relative">
                      <summary className="cursor-pointer list-none rounded-full bg-white/[0.07] px-2.5 py-1 text-[11.5px] font-medium hover:bg-white/[0.12] [&::-webkit-details-marker]:hidden">Redefinir senha</summary>
                      <form action={redefinirSenhaMentorado} className="mt-2 flex items-center gap-1.5">
                        <input type="hidden" name="user_id" value={l.id} />
                        <Ocultos ctx={ctx} />
                        <input name="senha" type="text" minLength={6} required placeholder="Nova senha" className="!w-44 !py-1 !text-xs" autoComplete="off" />
                        <BotaoMini tom="info">Salvar</BotaoMini>
                      </form>
                    </details>
                    <form action={alternarLoginMentorado}>
                      <input type="hidden" name="user_id" value={l.id} />
                      <input type="hidden" name="ativo" value={l.ativo ? "0" : "1"} />
                      <Ocultos ctx={ctx} />
                      <BotaoMini tom={l.ativo ? "erro" : "ok"}>{l.ativo ? "Desativar" : "Reativar"}</BotaoMini>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={criarLoginMentorado} className="space-y-4" autoComplete="off">
            <Ocultos ctx={ctx} />
            <Grade cols={3}>
              <Campo rotulo="Nome *">
                <input name="nome" required defaultValue={logins?.length ? "" : mentorado.dono ?? ""} placeholder="Quem vai usar o login" />
              </Campo>
              <Campo rotulo="E-mail *">
                <input name="email" type="email" required placeholder="dono@agencia.com.br" autoComplete="off" />
              </Campo>
              <Campo rotulo="Senha inicial *" dica="Mínimo 6 caracteres. Passe ao mentorado por WhatsApp.">
                <input name="senha" type="text" minLength={6} required autoComplete="new-password" />
              </Campo>
            </Grade>
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--fg-muted)]">O login nasce vinculado a esta agência e já pode entrar em metodo.marmarisviagens.com.br.</p>
              <span className="flex-1" />
              <Button type="submit">Criar login</Button>
            </div>
          </form>
        </Card>
      )}

      {ctx.staff && (
        <Painel titulo="Editar ficha da agência">
          <form action={atualizarMentorado} className="space-y-4">
            <Ocultos ctx={ctx} />
            <Grade cols={3}>
              <Campo rotulo="Agência *" className="sm:col-span-2">
                <input name="nome_agencia" defaultValue={mentorado.nome_agencia} required />
              </Campo>
              <Campo rotulo="Turma">
                <select name="turma_id" defaultValue={mentorado.turma_id ?? ""}>
                  <option value="">—</option>
                  {(turmas ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Dono(a)">
                <input name="dono" defaultValue={mentorado.dono ?? ""} />
              </Campo>
              <Campo rotulo="Cidade">
                <input name="cidade" defaultValue={mentorado.cidade ?? ""} />
              </Campo>
              <Campo rotulo="UF">
                <input name="uf" maxLength={2} defaultValue={mentorado.uf ?? ""} />
              </Campo>
              <Campo rotulo="Faturamento mensal (R$)">
                <input name="faturamento_aprox" inputMode="decimal" defaultValue={mentorado.faturamento_aprox ?? ""} />
              </Campo>
              <Campo rotulo="Ticket médio (R$)">
                <input name="ticket_medio" inputMode="decimal" defaultValue={mentorado.ticket_medio ?? ""} />
              </Campo>
              <Campo rotulo="Equipe">
                <input name="equipe" defaultValue={mentorado.equipe ?? ""} placeholder="ex.: 3 pessoas, 1 vendedora" />
              </Campo>
              <Campo rotulo="Canais" className="sm:col-span-3">
                <input name="canais" defaultValue={mentorado.canais ?? ""} placeholder="Instagram, WhatsApp, indicação…" />
              </Campo>
            </Grade>
            <Button type="submit">Salvar ficha</Button>
          </form>
        </Painel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaDiagnostico({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const { data } = await supabase.from("diagnosticos").select("*").eq("mentorado_id", ctx.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const respostas = ((data?.respostas as Record<string, unknown> | null) ?? {});
  const linhas = Object.entries(respostas).map(([k, v]) => `${k}: ${v ?? ""}`).join("\n");

  return (
    <div className="space-y-6">
      {data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo="Formulário de diagnóstico">
            {Object.keys(respostas).length ? (
              <dl className="space-y-3 text-[13.5px]">
                {Object.entries(respostas).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-[var(--fg-muted)]">{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-[13.5px] text-[var(--fg-muted)]">Sem respostas.</p>
            )}
          </Card>
          <Card titulo={`Reunião de diagnóstico${data.data_reuniao ? ` · ${dataCurta(data.data_reuniao)}` : ""}`}>
            <p className="whitespace-pre-wrap text-[13.5px]">{data.notas_reuniao || "Sem notas."}</p>
          </Card>
        </div>
      ) : (
        <Vazio titulo="Diagnóstico ainda não registrado" descricao="Respostas do formulário de dezembro e notas da reunião de diagnóstico ficam aqui." />
      )}

      {ctx.staff && (
        <Painel titulo={data ? "Editar diagnóstico" : "Registrar diagnóstico"} aberto={!data}>
          <form action={salvarDiagnostico} className="space-y-4">
            <Ocultos ctx={ctx} />
            {data && <input type="hidden" name="id" value={data.id} />}
            <Grade cols={2}>
              <Campo rotulo="Data da reunião de diagnóstico">
                <input type="date" name="data_reuniao" defaultValue={inputDate(data?.data_reuniao)} />
              </Campo>
              <div className="flex items-end pb-2">
                <Check nome="visivel_mentorado" rotulo="Visível para o mentorado" marcado={data?.visivel_mentorado ?? true} />
              </div>
            </Grade>
            <Campo rotulo="Respostas do formulário" dica="Uma por linha, no formato Pergunta: resposta">
              <textarea name="respostas" rows={8} defaultValue={linhas} placeholder={"Faturamento atual: 80 mil\nMaior dificuldade: captar clientes"} />
            </Campo>
            <Campo rotulo="Notas da reunião">
              <textarea name="notas_reuniao" rows={6} defaultValue={data?.notas_reuniao ?? ""} />
            </Campo>
            <Button type="submit">Salvar diagnóstico</Button>
          </form>
        </Painel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaPlano({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const [{ data: itens }, { data: modelos }] = await Promise.all([
    supabase.from("plano_itens").select("*").eq("mentorado_id", ctx.id).order("mes").order("semana", { nullsFirst: false }).order("ordem"),
    ctx.staff ? supabase.from("modelos").select("id,nome,padrao").eq("tipo", "plano_3_meses") : Promise.resolve({ data: [] as { id: string; nome: string; padrao: boolean }[] }),
  ]);
  const tom = (s: string) => (s === "concluido" ? "ok" : s === "atrasado" ? "erro" : s === "em_andamento" ? "info" : "neutro");
  const lista = itens ?? [];

  return (
    <div className="space-y-6">
      {lista.length ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((mes) => (
            <Card key={mes} titulo={`Mês ${mes}`}>
              <ul className="space-y-2.5">
                {lista.filter((i) => i.mes === mes).map((i) => (
                  <li key={i.id} className="rounded-[14px] border border-[var(--border)] bg-white/[0.02] p-3 text-[13.5px]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{i.titulo}</p>
                      <Badge tom={tom(i.status)}>{ROTULOS.statusPlano[i.status]}</Badge>
                    </div>
                    {i.semana && <p className="mt-1 text-xs text-[var(--fg-muted)]">Semana {i.semana}</p>}
                    {i.descricao && <p className="mt-1 text-xs text-[var(--fg-muted)]">{i.descricao}</p>}
                    {ctx.staff && (
                      <form action={atualizarPlanoItem} className="mt-3 flex items-center gap-1.5">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="voltar" value={ctx.base} />
                        <select name="status" defaultValue={i.status} className="!w-auto !py-1 !text-xs">
                          {(["pendente", "em_andamento", "concluido", "atrasado"] as const).map((s) => (
                            <option key={s} value={s}>{ROTULOS.statusPlano[s]}</option>
                          ))}
                        </select>
                        <BotaoMini>Salvar</BotaoMini>
                        <BotaoMini tom="erro" name="acao" value="excluir" title="Excluir">×</BotaoMini>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <Vazio
          titulo="Plano ainda não gerado"
          descricao="Gere a partir do modelo padrão e ajuste por agência, ou adicione as entregas uma a uma."
          acao={
            ctx.staff ? (
              <form action={gerarPlano} className="flex items-center gap-2">
                <Ocultos ctx={ctx} />
                <select name="modelo_id" className="!w-auto" defaultValue="">
                  <option value="">Modelo padrão</option>
                  {(modelos ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                <Button type="submit">Gerar plano</Button>
              </form>
            ) : undefined
          }
        />
      )}

      {ctx.staff && (
        <Painel titulo="Adicionar entrega ao plano">
          <form action={criarPlanoItem} className="space-y-4">
            <Ocultos ctx={ctx} />
            <Grade cols={4}>
              <Campo rotulo="Título *" className="sm:col-span-2">
                <input name="titulo" required />
              </Campo>
              <Campo rotulo="Mês">
                <select name="mes" defaultValue="1">
                  <option value="1">Mês 1</option>
                  <option value="2">Mês 2</option>
                  <option value="3">Mês 3</option>
                </select>
              </Campo>
              <Campo rotulo="Semana (1–12)">
                <input name="semana" type="number" min={1} max={12} />
              </Campo>
              <Campo rotulo="Descrição" className="sm:col-span-3">
                <input name="descricao" />
              </Campo>
              <div className="flex items-end pb-2">
                <Check nome="visivel_mentorado" rotulo="Visível para o mentorado" marcado />
              </div>
            </Grade>
            <Button type="submit">Adicionar</Button>
          </form>
        </Painel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaReunioes({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const [{ data }, { data: pauta }] = await Promise.all([
    supabase.from("reunioes").select("*").eq("mentorado_id", ctx.id).order("data", { ascending: false }),
    ctx.staff ? supabase.from("modelos").select("itens").eq("tipo", "pauta_reuniao").eq("padrao", true).limit(1).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const pautaPadrao = ((pauta?.itens as { titulo: string }[] | null) ?? []).map((i) => `- ${i.titulo}`).join("\n");
  const lista = (data ?? []) as Reuniao[];

  return (
    <div className="space-y-6">
      {lista.length ? (
        <div className="space-y-3">
          {lista.map((r) => (
            <details key={r.id} className="glass rise group rounded-[var(--radius)]">
              <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <span className="tabular text-[13.5px] font-medium">{dataHora(r.data)}</span>
                  <span className="text-xs text-[var(--fg-muted)]">{r.duracao_min} min</span>
                  {r.realizada ? <Badge tom="ok">Realizada</Badge> : <Badge>Agendada</Badge>}
                  {!r.visivel_mentorado && <Badge tom="alerta">Interna</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                  {r.link_gravacao && (
                    <a href={r.link_gravacao} target="_blank" rel="noreferrer" className="text-[#ff8a8f] hover:underline">
                      Gravação
                    </a>
                  )}
                  <span className="transition-transform duration-300 ease-[var(--ease)] group-open:rotate-180">▾</span>
                </div>
              </summary>
              <div className="border-t border-[var(--border)] px-5 py-5">
                {ctx.staff ? (
                  <form action={atualizarReuniao} className="space-y-4">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="voltar" value={ctx.base} />
                    <Grade cols={4}>
                      <Campo rotulo="Data e hora">
                        <input type="datetime-local" name="data" defaultValue={inputDateTime(r.data)} required />
                      </Campo>
                      <Campo rotulo="Duração (min)">
                        <input type="number" name="duracao_min" defaultValue={r.duracao_min} />
                      </Campo>
                      <Campo rotulo="Link da gravação" className="sm:col-span-2">
                        <input name="link_gravacao" defaultValue={r.link_gravacao ?? ""} />
                      </Campo>
                      <Campo rotulo="Pauta" className="sm:col-span-2">
                        <textarea name="pauta" rows={5} defaultValue={r.pauta ?? ""} />
                      </Campo>
                      <Campo rotulo="Ata" className="sm:col-span-2">
                        <textarea name="ata" rows={5} defaultValue={r.ata ?? ""} />
                      </Campo>
                      <Campo rotulo="Decisões" className="sm:col-span-2">
                        <textarea name="decisoes" rows={3} defaultValue={r.decisoes ?? ""} />
                      </Campo>
                      <Campo rotulo="Plano de ação" className="sm:col-span-2">
                        <textarea name="plano_acao" rows={3} defaultValue={r.plano_acao ?? ""} />
                      </Campo>
                    </Grade>
                    <div className="flex flex-wrap items-center gap-4">
                      <Check nome="realizada" rotulo="Reunião realizada" marcado={r.realizada} />
                      <Check nome="visivel_mentorado" rotulo="Visível para o mentorado" marcado={r.visivel_mentorado} />
                      <span className="flex-1" />
                      <BotaoMini tom="erro" name="acao" value="excluir">Excluir</BotaoMini>
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>
                ) : (
                  <dl className="grid gap-4 text-[13.5px] sm:grid-cols-2">
                    {[
                      ["Pauta", r.pauta],
                      ["Ata", r.ata],
                      ["Decisões", r.decisoes],
                      ["Plano de ação", r.plano_acao],
                    ].map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="mb-1 text-xs uppercase tracking-wide text-[var(--fg-muted)]">{k}</dt>
                        <dd className="whitespace-pre-wrap">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <Vazio titulo="Nenhuma reunião registrada" descricao="Cada reunião semanal de 2h entra aqui com pauta, ata, gravação e plano de ação." />
      )}

      {ctx.staff && (
        <Painel titulo="Agendar reunião" aberto={!lista.length}>
          <form action={criarReuniao} className="space-y-4">
            <Ocultos ctx={ctx} />
            <Grade cols={4}>
              <Campo rotulo="Data e hora *">
                <input type="datetime-local" name="data" required />
              </Campo>
              <Campo rotulo="Duração (min)">
                <input type="number" name="duracao_min" defaultValue={120} />
              </Campo>
              <Campo rotulo="Link da reunião / gravação" className="sm:col-span-2">
                <input name="link_gravacao" placeholder="https://meet.google.com/…" />
              </Campo>
              <Campo rotulo="Pauta" className="sm:col-span-4" dica="Pré-preenchida com o modelo de pauta padrão">
                <textarea name="pauta" rows={5} defaultValue={pautaPadrao} />
              </Campo>
            </Grade>
            <div className="flex items-center gap-4">
              <Check nome="visivel_mentorado" rotulo="Visível para o mentorado" marcado />
              <span className="flex-1" />
              <Button type="submit">Agendar</Button>
            </div>
          </form>
        </Painel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaTarefas({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const [{ data }, { data: staffPerfis }] = await Promise.all([
    supabase.from("tarefas").select("*").eq("mentorado_id", ctx.id).order("ordem").order("prazo", { nullsFirst: false }),
    ctx.staff ? supabase.from("perfis").select("id,nome").in("perfil", ["admin", "equipe"]).eq("ativo", true) : Promise.resolve({ data: [] as { id: string; nome: string | null }[] }),
  ]);
  const colunas: StatusTarefa[] = ["a_fazer", "em_andamento", "concluida"];
  const lista = (data ?? []) as Tarefa[];
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {lista.length ? (
        <div className="-mx-6 overflow-x-auto px-6 pb-2 lg:-mx-12 lg:px-12">
          <div className="flex gap-4">
            {colunas.map((c) => {
              const col = lista.filter((t) => t.status === c);
              return (
                <Coluna key={c} titulo={ROTULOS.statusTarefa[c]} total={col.length}>
                  {col.map((t) => {
                    const podeMudar = ctx.staff || t.lado === "mentorado";
                    const atrasada = t.prazo && t.prazo < hoje && t.status !== "concluida";
                    return (
                      <CartaoKanban key={t.id}>
                        <p className="font-medium">{t.titulo}</p>
                        {t.descricao && <p className="mt-1 text-xs text-[var(--fg-muted)]">{t.descricao}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tom={t.lado === "mentorado" ? "info" : "neutro"}>{t.lado === "mentorado" ? "Mentorado" : "Marmaris"}</Badge>
                          {t.prazo && <Badge tom={atrasada ? "erro" : "neutro"}>{dataCurta(t.prazo)}</Badge>}
                          {!t.visivel_mentorado && <Badge tom="alerta">Interna</Badge>}
                        </div>
                        {podeMudar && (
                          <form action={atualizarTarefa} className="mt-3 flex items-center gap-1.5">
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="voltar" value={ctx.base} />
                            <select name="status" defaultValue={t.status} className="!w-auto !py-1 !text-xs">
                              {colunas.map((s) => (
                                <option key={s} value={s}>{ROTULOS.statusTarefa[s]}</option>
                              ))}
                            </select>
                            <BotaoMini>Mover</BotaoMini>
                            {ctx.staff && <BotaoMini tom="erro" name="acao" value="excluir" title="Excluir">×</BotaoMini>}
                          </form>
                        )}
                      </CartaoKanban>
                    );
                  })}
                </Coluna>
              );
            })}
          </div>
        </div>
      ) : (
        <Vazio titulo="Nenhuma tarefa" descricao="Cada tarefa tem um lado responsável: Mentorado ou Marmaris." />
      )}

      {ctx.staff && (
        <Painel titulo="Nova tarefa" aberto={!lista.length}>
          <form action={criarTarefa} className="space-y-4">
            <Ocultos ctx={ctx} />
            <Grade cols={4}>
              <Campo rotulo="Título *" className="sm:col-span-2">
                <input name="titulo" required />
              </Campo>
              <Campo rotulo="Lado responsável">
                <select name="lado" defaultValue="mentorado">
                  <option value="mentorado">Mentorado</option>
                  <option value="marmaris">Marmaris</option>
                </select>
              </Campo>
              <Campo rotulo="Prazo">
                <input type="date" name="prazo" />
              </Campo>
              <Campo rotulo="Descrição" className="sm:col-span-2">
                <input name="descricao" />
              </Campo>
              <Campo rotulo="Responsável na Marmaris">
                <select name="responsavel_id" defaultValue="">
                  <option value="">—</option>
                  {(staffPerfis ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.nome ?? p.id}</option>
                  ))}
                </select>
              </Campo>
              <div className="flex items-end pb-2">
                <Check nome="visivel_mentorado" rotulo="Visível para o mentorado" marcado />
              </div>
            </Grade>
            <Button type="submit">Criar tarefa</Button>
          </form>
        </Painel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaIndicadores({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const { data } = await supabase.from("indicadores").select("*").eq("mentorado_id", ctx.id);
  const periodos: PeriodoIndicador[] = ["inicio", "mes_1", "mes_2", "mes_3"];
  const por = new Map((data ?? []).map((i) => [i.periodo, i as Indicador]));
  const linhas: [string, (i: Indicador) => string][] = [
    ["Faturamento", (i) => (i.faturamento != null ? brl(i.faturamento) : "—")],
    ["Nº de vendas", (i) => i.num_vendas?.toString() ?? "—"],
    ["Leads", (i) => i.leads?.toString() ?? "—"],
    ["Conversão", (i) => (i.conversao != null ? `${i.conversao}%` : "—")],
    ["Ticket médio", (i) => (i.ticket_medio != null ? brl(i.ticket_medio) : "—")],
    ["% recorrência", (i) => (i.pct_recorrencia != null ? `${i.pct_recorrencia}%` : "—")],
    ["Seguidores", (i) => i.seguidores?.toString() ?? "—"],
  ];

  return (
    <div className="space-y-6">
      <Tabela cabecalho={["Indicador", ...periodos.map((p) => ROTULOS.periodo[p])]}>
        {linhas.map(([nome, fn]) => (
          <tr key={nome}>
            <Td className="font-medium">{nome}</Td>
            {periodos.map((p) => {
              const i = por.get(p);
              return (
                <Td key={p} className="tabular">
                  {i ? fn(i) : "—"}
                </Td>
              );
            })}
          </tr>
        ))}
      </Tabela>

      {ctx.staff && (
        <div className="grid gap-4 lg:grid-cols-2">
          {periodos.map((p) => {
            const i = por.get(p);
            return (
              <Painel key={p} titulo={`${i ? "Editar" : "Preencher"} · ${ROTULOS.periodo[p]}`}>
                <form action={salvarIndicador} className="space-y-4">
                  <Ocultos ctx={ctx} />
                  <input type="hidden" name="periodo" value={p} />
                  <Grade cols={4}>
                    <Campo rotulo="Faturamento (R$)"><input name="faturamento" inputMode="decimal" defaultValue={i?.faturamento ?? ""} /></Campo>
                    <Campo rotulo="Nº de vendas"><input name="num_vendas" type="number" defaultValue={i?.num_vendas ?? ""} /></Campo>
                    <Campo rotulo="Leads"><input name="leads" type="number" defaultValue={i?.leads ?? ""} /></Campo>
                    <Campo rotulo="Conversão (%)"><input name="conversao" inputMode="decimal" defaultValue={i?.conversao ?? ""} /></Campo>
                    <Campo rotulo="Ticket médio (R$)"><input name="ticket_medio" inputMode="decimal" defaultValue={i?.ticket_medio ?? ""} /></Campo>
                    <Campo rotulo="Recorrência (%)"><input name="pct_recorrencia" inputMode="decimal" defaultValue={i?.pct_recorrencia ?? ""} /></Campo>
                    <Campo rotulo="Seguidores"><input name="seguidores" type="number" defaultValue={i?.seguidores ?? ""} /></Campo>
                    <Campo rotulo="Observações"><input name="observacoes" defaultValue={i?.observacoes ?? ""} /></Campo>
                  </Grade>
                  <Button type="submit">Salvar</Button>
                </form>
              </Painel>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaAcessos({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const { data } = await supabase.from("acessos").select("*").eq("mentorado_id", ctx.id).order("ordem");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card titulo="Checklist de acessos">
        {data?.length ? (
          <ul className="divide-y divide-[var(--border)] text-[13.5px]">
            {data.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2.5">
                  <Sinal cor={a.liberado ? "verde" : null} /> {a.item}
                </span>
                <span className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                  {a.liberado ? `Liberado ${dataCurta(a.liberado_em)}` : "Pendente"}
                  {ctx.staff && (
                    <form action={alternarAcesso}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="voltar" value={ctx.base} />
                      <input type="hidden" name="liberado" value={a.liberado ? "0" : "1"} />
                      <BotaoMini tom={a.liberado ? "neutro" : "ok"}>{a.liberado ? "Desfazer" : "Liberar"}</BotaoMini>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-[var(--fg-muted)]">Nenhum item.</p>
        )}
      </Card>
      {ctx.staff && (
        <Painel titulo="Adicionar item ao checklist">
          <form action={criarAcesso} className="flex flex-wrap items-end gap-3">
            <Ocultos ctx={ctx} />
            <Campo rotulo="Item" className="min-w-[220px] flex-1">
              <input name="item" required placeholder="ex.: Acesso ao grupo de parceiros" />
            </Campo>
            <Button type="submit">Adicionar</Button>
          </form>
        </Painel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaNotas({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const { data } = await supabase.from("notas_internas").select("*, perfis(nome)").eq("mentorado_id", ctx.id).order("created_at", { ascending: false });
  type Nota = NonNullable<typeof data>[number] & { perfis: { nome: string | null } | null };
  const notas = (data ?? []) as Nota[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <p className="rounded-[12px] bg-[var(--alerta)]/10 px-3.5 py-2.5 text-xs text-[var(--alerta-fg)] ring-1 ring-inset ring-[var(--alerta)]/25">
          Visível só para admin e equipe. O mentorado nunca vê esta aba.
        </p>
        {notas.length ? (
          notas.map((n) => (
            <Card key={n.id}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[var(--fg-muted)]">
                <span>{n.perfis?.nome ?? "—"} · {dataHora(n.created_at)}</span>
                <span className="flex items-center gap-3">
                  {n.risco && (
                    <span className="flex items-center gap-1.5">
                      <Sinal cor={n.risco} /> risco {n.risco}
                    </span>
                  )}
                  <form action={excluirNota}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="voltar" value={ctx.base} />
                    <BotaoMini tom="erro" title="Excluir">×</BotaoMini>
                  </form>
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[13.5px]">{n.texto}</p>
            </Card>
          ))
        ) : (
          <Vazio titulo="Sem notas internas" />
        )}
      </div>
      <Painel titulo="Nova nota" aberto>
        <form action={criarNota} className="space-y-4">
          <Ocultos ctx={ctx} />
          <Campo rotulo="Nota *">
            <textarea name="texto" rows={6} required />
          </Campo>
          <Campo rotulo="Avaliação de risco" dica="Define o sinal de saúde do mentorado no Início">
            <select name="risco" defaultValue="">
              <option value="">Não alterar</option>
              <option value="verde">Verde · no caminho</option>
              <option value="amarelo">Amarelo · atenção</option>
              <option value="vermelho">Vermelho · risco</option>
            </select>
          </Campo>
          <Button type="submit">Salvar nota</Button>
        </form>
      </Painel>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

async function AbaArquivos({ ctx }: { ctx: Ctx }) {
  const supabase = await createClient();
  const { data } = await supabase.from("arquivos").select("*").eq("mentorado_id", ctx.id).order("created_at", { ascending: false });
  const lista = data ?? [];

  return (
    <div className="space-y-6">
      {lista.length ? (
        <Tabela cabecalho={["Arquivo", "Tipo", "Enviado em", ""]}>
          {lista.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">
                {a.nome}
                {!a.visivel_mentorado && <span className="ml-2"><Badge tom="alerta">Interno</Badge></span>}
              </Td>
              <Td className="text-[var(--fg-muted)]">{a.tipo ?? "—"}</Td>
              <Td className="text-[var(--fg-muted)]">{dataCurta(a.created_at)}</Td>
              <Td>
                <div className="flex justify-end gap-1.5">
                  <form action={baixarArquivo}>
                    <input type="hidden" name="path" value={a.arquivo_path} />
                    <input type="hidden" name="voltar" value={ctx.base} />
                    <BotaoMini tom="info">Baixar</BotaoMini>
                  </form>
                  {ctx.staff && (
                    <form action={excluirArquivo}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="voltar" value={ctx.base} />
                      <BotaoMini tom="erro" title="Excluir">×</BotaoMini>
                    </form>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Tabela>
      ) : (
        <Vazio titulo="Nenhum arquivo" descricao="Contrato e materiais enviados pela agência ficam aqui." />
      )}

      {ctx.staff && (
        <Painel titulo="Enviar arquivo" aberto={!lista.length}>
          <form action={enviarArquivo} className="space-y-4" encType="multipart/form-data">
            <Ocultos ctx={ctx} />
            <Grade cols={3}>
              <Campo rotulo="Arquivo *">
                <input type="file" name="arquivo" required />
              </Campo>
              <Campo rotulo="Nome de exibição">
                <input name="nome" placeholder="Opcional" />
              </Campo>
              <div className="flex items-end pb-2">
                <Check nome="visivel_mentorado" rotulo="Visível para o mentorado" marcado />
              </div>
            </Grade>
            <Button type="submit">Enviar</Button>
          </form>
        </Painel>
      )}
    </div>
  );
}
