import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataCurta, dataLonga, ROTULOS } from "@/lib/formato";
import type { StatusMarketing } from "@/lib/supabase/database.types";
import { Abas, Badge, CartaoKanban, Coluna, PageHeader, Vazio } from "@/components/ui";

const COLUNAS: StatusMarketing[] = ["ideia", "roteiro", "producao", "aprovacao", "agendado", "publicado"];

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await exigirPerfil("admin", "equipe");
  const { aba = "quadro" } = await searchParams;
  const supabase = await createClient();

  const { data: itens } = await supabase
    .from("marketing_conteudos")
    .select("*, perfis(nome)")
    .order("ordem")
    .order("data_publicacao", { nullsFirst: false });

  type Item = NonNullable<typeof itens>[number] & { perfis: { nome: string | null } | null };
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
              <div key={d}>
                <h3 className="mb-2 text-sm font-semibold">{dataLonga(d)}</h3>
                <ul className="space-y-2">
                  {porData.get(d)!.map((i) => (
                    <li key={i.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm">
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
        <div className="-mx-6 overflow-x-auto px-6 pb-4 lg:-mx-10 lg:px-10">
          <div className="flex gap-4">
            {COLUNAS.map((status) => {
              const col = lista.filter((i) => i.status === status);
              return (
                <Coluna key={status} titulo={ROTULOS.statusMarketing[status]} total={col.length}>
                  {col.map((i) => (
                    <CartaoKanban key={i.id}>
                      <p className="font-medium">{i.titulo}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge>{ROTULOS.formato[i.formato]}</Badge>
                        {i.data_publicacao && <Badge tom="info">{dataCurta(i.data_publicacao)}</Badge>}
                      </div>
                      {i.perfis?.nome && <p className="mt-2 text-xs text-[var(--fg-muted)]">{i.perfis.nome}</p>}
                      {i.link_post && (
                        <a href={i.link_post} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-[var(--primary)] hover:underline">
                          Ver post
                        </a>
                      )}
                    </CartaoKanban>
                  ))}
                </Coluna>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
