import { getSessao, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROTULOS } from "@/lib/formato";
import { Badge, Button, Card, PageHeader, Vazio } from "@/components/ui";
import { BotaoMini, Campo, Check, Erro, Grade, Painel } from "@/components/form";
import { alternarLiberado, baixarMaterial, criarMaterial, excluirMaterial } from "./actions";

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const sessao = await getSessao();
  const staff = isStaff(sessao.perfil.perfil);
  const { erro } = await searchParams;
  const supabase = await createClient();

  // Para o mentorado, a RLS já filtra: só itens liberados e dentro da semana.
  const [{ data: pilares }, { data: itens }] = await Promise.all([
    supabase.from("pilares_biblioteca").select("*").eq("ativo", true).order("ordem"),
    supabase.from("biblioteca_itens").select("*").order("ordem").order("created_at"),
  ]);

  const grupos = (pilares ?? [])
    .map((p) => ({ pilar: p, itens: (itens ?? []).filter((i) => i.pilar_id === p.id) }))
    .filter((g) => staff || g.itens.length > 0);
  const semPilar = (itens ?? []).filter((i) => !i.pilar_id);
  const todos = [...grupos, ...(semPilar.length ? [{ pilar: { id: "none", nome: "Sem pilar" }, itens: semPilar }] : [])];

  return (
    <>
      <PageHeader
        titulo="Biblioteca da mentoria"
        descricao={
          staff
            ? "Tudo o que é entregue aos mentorados, por pilar. O mentorado só vê o que está liberado."
            : "Materiais liberados para você. Novos conteúdos aparecem conforme o plano avança."
        }
      />
      <Erro mensagem={erro} />

      {todos.length === 0 ? (
        <Vazio titulo="Nenhum material ainda" descricao={staff ? "Cadastre documentos, vídeos, planilhas e links por pilar." : "Em breve a equipe libera os primeiros materiais."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {todos.map((g) => (
            <Card key={g.pilar.id} titulo={g.pilar.nome} acoes={<span className="tabular text-xs text-[var(--fg-muted)]">{g.itens.length}</span>}>
              {g.itens.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {g.itens.map((i) => (
                    <li key={i.id} className="flex items-start justify-between gap-3 py-2.5 text-[13.5px]">
                      <div className="min-w-0">
                        {i.url ? (
                          <a href={i.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                            {i.titulo}
                          </a>
                        ) : i.arquivo_path ? (
                          <form action={baixarMaterial} className="inline">
                            <input type="hidden" name="path" value={i.arquivo_path} />
                            <button type="submit" className="font-medium hover:underline">{i.titulo}</button>
                          </form>
                        ) : (
                          <p className="font-medium">{i.titulo}</p>
                        )}
                        {i.descricao && <p className="text-xs text-[var(--fg-muted)]">{i.descricao}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="flex gap-1.5">
                          <Badge>{ROTULOS.tipoMaterial[i.tipo]}</Badge>
                          {staff && (
                            <Badge tom={i.liberado ? "ok" : "neutro"}>
                              {i.liberado ? (i.liberar_semana ? `Semana ${i.liberar_semana}+` : "Liberado") : "Interno"}
                            </Badge>
                          )}
                        </div>
                        {staff && (
                          <div className="flex gap-1">
                            <form action={alternarLiberado}>
                              <input type="hidden" name="id" value={i.id} />
                              <input type="hidden" name="liberado" value={i.liberado ? "0" : "1"} />
                              <BotaoMini tom={i.liberado ? "neutro" : "ok"}>{i.liberado ? "Recolher" : "Liberar"}</BotaoMini>
                            </form>
                            <form action={excluirMaterial}>
                              <input type="hidden" name="id" value={i.id} />
                              <BotaoMini tom="erro" title="Excluir">×</BotaoMini>
                            </form>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13.5px] text-[var(--fg-muted)]">Nenhum item neste pilar.</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {staff && (
        <div className="mt-6">
          <Painel titulo="Adicionar material" aberto={!itens?.length}>
            <form action={criarMaterial} className="space-y-4" encType="multipart/form-data">
              <Grade cols={4}>
                <Campo rotulo="Título *" className="sm:col-span-2">
                  <input name="titulo" required />
                </Campo>
                <Campo rotulo="Tipo">
                  <select name="tipo" defaultValue="documento">
                    {(Object.keys(ROTULOS.tipoMaterial) as (keyof typeof ROTULOS.tipoMaterial)[]).map((t) => (
                      <option key={t} value={t}>{ROTULOS.tipoMaterial[t]}</option>
                    ))}
                  </select>
                </Campo>
                <Campo rotulo="Pilar">
                  <select name="pilar_id" defaultValue="">
                    <option value="">—</option>
                    {(pilares ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </Campo>
                <Campo rotulo="Descrição" className="sm:col-span-4">
                  <input name="descricao" />
                </Campo>
                <Campo rotulo="Link" className="sm:col-span-2" dica="Para vídeo, Drive, Notion, etc.">
                  <input name="url" placeholder="https://" />
                </Campo>
                <Campo rotulo="Ou arquivo" className="sm:col-span-2">
                  <input type="file" name="arquivo" />
                </Campo>
                <Campo rotulo="Liberar a partir da semana" dica="Opcional (1 a 12)">
                  <input name="liberar_semana" type="number" min={1} max={12} />
                </Campo>
                <div className="flex items-end pb-2 sm:col-span-3">
                  <Check nome="liberado" rotulo="Liberado para os mentorados" />
                </div>
              </Grade>
              <Button type="submit">Adicionar</Button>
            </form>
          </Painel>
        </div>
      )}
    </>
  );
}
