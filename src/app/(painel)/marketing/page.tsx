import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, dataLonga, inputDate, ROTULOS } from "@/lib/formato";
import type { StatusMarketing, MarketingConteudo } from "@/lib/supabase/database.types";
import { Abas, Badge, Button, CartaoKanban, Coluna, PageHeader, Vazio } from "@/components/ui";
import { BotaoMini, Campo, Erro, Grade, Painel } from "@/components/form";
import { atualizarConteudo, criarConteudo, moverConteudo } from "./actions";

const COLUNAS: StatusMarketing[] = ["ideia", "roteiro", "producao", "aprovacao", "agendado", "publicado"];

type Item = MarketingConteudo & { perfis: { nome: string | null } | null };

function FormConteudo({ item, responsaveis }: { item?: Item; responsaveis: { id: string; nome: string | null }[] }) {
  return (
  <form action={item ? atualizarConteudo : criarConteudo} className="space-y-4">
    {item && <input type="hidden" name="id" value={item.id} />}
    <Grade cols={4}>
      <Campo rotulo="Título *" className="sm:col-span-2">
        <input name="titulo" required defaultValue={item?.titulo ?? ""} />
      </Campo>
      <Campo rotulo="Formato">
        <select name="formato" defaultValue={item?.formato ?? "reels"}>
          {(Object.keys(ROTULOS.formato) as (keyof typeof ROTULOS.formato)[]).map((f) => (
            <option key={f} value={f}>{ROTULOS.formato[f]}</option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Etapa">
        <select name="status" defaultValue={item?.status ?? "ideia"}>
          {COLUNAS.map((s) => (
            <option key={s} value={s}>{ROTULOS.statusMarketing[s]}</option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Responsável">
        <select name="responsavel_id" defaultValue={item?.responsavel_id ?? ""}>
          <option value="">—</option>
          {responsaveis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome ?? p.id}</option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Data de publicação">
        <input type="date" name="data_publicacao" defaultValue={inputDate(item?.data_publicacao)} />
      </Campo>
      <Campo rotulo="Link do post" className="sm:col-span-2">
        <input name="link_post" defaultValue={item?.link_post ?? ""} placeholder="https://instagram.com/…" />
      </Campo>
      <Campo rotulo="Roteiro / legenda" className="sm:col-span-4">
        <textarea name="roteiro" rows={5} defaultValue={item?.roteiro ?? ""} />
      </Campo>
    </Grade>
    <div className="flex items-center gap-3">
      {item && <BotaoMini tom="erro" name="acao" value="excluir">Excluir</BotaoMini>}
      <span className="flex-1" />
      <Button type="submit">{item ? "Salvar" : "Criar conteúdo"}</Button>
    </div>
  </form>
  );
}


export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ aba?: string; erro?: string }> }) {
  await exigirPerfil("admin", "equipe");
  const { aba = "quadro", erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: itens }, { data: responsaveis }] = await Promise.all([
    supabase.from("marketing_conteudos").select("*, perfis(nome)").order("ordem").order("data_publicacao", { nullsFirst: false }),
    supabase.from("perfis").select("id,nome").in("perfil", ["admin", "equipe"]).eq("ativo", true),
  ]);
  const lista = (itens ?? []) as Item[];

  const porData = new Map<string, Item[]>();
  for (const i of lista) {
    if (!i.data_publicacao) continue;
    porData.set(i.data_publicacao, [...(porData.get(i.data_publicacao) ?? []), i]);
  }
  const datas = [...porData.keys()].sort();


  return (
    <>
      <PageHeader titulo="Marketing" descricao="Conteúdos de divulgação da mentoria, da ideia à publicação." />
      <Erro mensagem={erro} />
      <Abas
        base="/marketing"
        ativa={aba}
        abas={[
          { id: "quadro", label: "Quadro" },
          { id: "calendario", label: "Calendário" },
        ]}
      />

      {aba === "calendario" ? (
        datas.length ? (
          <div className="space-y-6">
            {datas.map((d) => (
              <div key={d} className="rise">
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">{dataLonga(d)}</h3>
                <ul className="space-y-2">
                  {porData.get(d)!.map((i) => (
                    <li key={i.id} className="glass flex items-center justify-between rounded-[14px] px-4 py-2.5 text-[13.5px]">
                      <span>{i.titulo}</span>
                      <div className="flex gap-2">
                        <Badge>{ROTULOS.formato[i.formato]}</Badge>
                        <Badge tom={i.status === "publicado" ? "ok" : "info"}>{ROTULOS.statusMarketing[i.status]}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <Vazio titulo="Nada agendado" descricao="Conteúdos com data de publicação aparecem aqui por dia." />
        )
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 pb-4 lg:-mx-12 lg:px-12">
          <div className="flex gap-4">
            {COLUNAS.map((status) => {
              const col = lista.filter((i) => i.status === status);
              return (
                <Coluna key={status} titulo={ROTULOS.statusMarketing[status]} total={col.length}>
                  {col.map((i) => (
                    <CartaoKanban key={i.id}>
                      <details className="group">
                        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          <p className="font-medium">{i.titulo}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge>{ROTULOS.formato[i.formato]}</Badge>
                            {i.data_publicacao && <Badge tom="info">{dataCurta(i.data_publicacao)}</Badge>}
                          </div>
                          {i.perfis?.nome && <p className="mt-2 text-xs text-[var(--fg-muted)]">{i.perfis.nome}</p>}
                        </summary>
                        <div className="mt-3 border-t border-[var(--border)] pt-3">
                          <FormConteudo item={i} responsaveis={responsaveis ?? []} />
                        </div>
                      </details>
                      <form action={moverConteudo} className="mt-3 flex items-center gap-1.5">
                        <input type="hidden" name="id" value={i.id} />
                        <select name="status" defaultValue={status} className="!w-auto !py-1 !text-xs">
                          {COLUNAS.map((s) => (
                            <option key={s} value={s}>{ROTULOS.statusMarketing[s]}</option>
                          ))}
                        </select>
                        <BotaoMini>Mover</BotaoMini>
                        {i.link_post && (
                          <a href={i.link_post} target="_blank" rel="noreferrer" className="ml-auto text-xs text-[#ff8a8f] hover:underline">
                            Ver post
                          </a>
                        )}
                      </form>
                    </CartaoKanban>
                  ))}
                </Coluna>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Painel titulo="Novo conteúdo" aberto={!lista.length}>
          <FormConteudo responsaveis={responsaveis ?? []} />
        </Painel>
      </div>
    </>
  );
}
