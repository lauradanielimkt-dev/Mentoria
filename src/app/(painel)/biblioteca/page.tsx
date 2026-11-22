import { getSessao, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROTULOS } from "@/lib/formato";
import { Badge, Card, PageHeader, Vazio } from "@/components/ui";

export default async function BibliotecaPage() {
  const sessao = await getSessao();
  const staff = isStaff(sessao.perfil.perfil);
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

      {grupos.length === 0 && semPilar.length === 0 ? (
        <Vazio titulo="Nenhum material ainda" descricao={staff ? "Cadastre documentos, vídeos, planilhas e links por pilar." : "Em breve a equipe libera os primeiros materiais."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...grupos, ...(semPilar.length ? [{ pilar: { id: "none", nome: "Sem pilar" }, itens: semPilar }] : [])].map((g) => (
            <Card key={g.pilar.id} titulo={g.pilar.nome} acoes={<span className="text-xs text-[var(--fg-muted)]">{g.itens.length}</span>}>
              {g.itens.length ? (
                <ul className="divide-y divide-[var(--border)]">
                  {g.itens.map((i) => (
                    <li key={i.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                      <div>
                        {i.url ? (
                          <a href={i.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                            {i.titulo}
                          </a>
                        ) : (
                          <p className="font-medium">{i.titulo}</p>
                        )}
                        {i.descricao && <p className="text-xs text-[var(--fg-muted)]">{i.descricao}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge>{ROTULOS.tipoMaterial[i.tipo]}</Badge>
                        {staff && (
                          <Badge tom={i.liberado ? "ok" : "neutro"}>
                            {i.liberado ? (i.liberar_semana ? `Semana ${i.liberar_semana}+` : "Liberado") : "Interno"}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--fg-muted)]">Nenhum item neste pilar.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
