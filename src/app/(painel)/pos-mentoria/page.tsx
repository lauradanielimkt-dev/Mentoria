import { getSessao, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROTULOS } from "@/lib/formato";
import { Badge, Button, Card, PageHeader, Tabela, Td, Vazio } from "@/components/ui";
import { responderAvaliacao } from "./actions";

export default async function PosMentoriaPage() {
  const sessao = await getSessao();
  const supabase = await createClient();

  if (!isStaff(sessao.perfil.perfil)) {
    const { data } = await supabase.from("pos_mentoria").select("*").eq("mentorado_id", sessao.perfil.mentorado_id!).maybeSingle();
    return (
      <>
        <PageHeader titulo="Avaliação final" descricao="Sua opinião sobre a mentoria. Leva menos de 5 minutos." />
        <Card className="max-w-xl">
          {data?.respondido_em ? (
            <p className="text-sm">Obrigado! Sua avaliação foi registrada.</p>
          ) : (
            <form action={responderAvaliacao} className="space-y-4">
              <div>
                <label htmlFor="nps">De 0 a 10, quanto você recomendaria a mentoria?</label>
                <input id="nps" name="nps" type="number" min={0} max={10} required />
              </div>
              <div>
                <label htmlFor="depoimento_texto">Depoimento</label>
                <textarea id="depoimento_texto" name="depoimento_texto" rows={4} />
              </div>
              <div>
                <label htmlFor="depoimento_url">Link de vídeo (opcional)</label>
                <input id="depoimento_url" name="depoimento_url" type="url" />
              </div>
              <label className="flex items-center gap-2 text-sm text-[var(--fg)]">
                <input type="checkbox" name="autoriza_case" className="!w-auto" /> Autorizo usar meu resultado como case
              </label>
              <Button type="submit">Enviar avaliação</Button>
            </form>
          )}
        </Card>
      </>
    );
  }

  const { data } = await supabase.from("pos_mentoria").select("*, mentorados(nome_agencia)").order("created_at");
  type Linha = NonNullable<typeof data>[number] & { mentorados: { nome_agencia: string } | null };
  const linhas = (data ?? []) as Linha[];

  const tomCont = (s: string) => (s === "vai_renovar" ? "ok" : s === "nao_vai" ? "erro" : s === "em_negociacao" ? "alerta" : "neutro");

  return (
    <>
      <PageHeader titulo="Pós-mentoria" descricao="Avaliação final, relatório de resultados, continuação e encerramento." />
      {linhas.length ? (
        <Tabela cabecalho={["Mentorado", "NPS", "Depoimento", "Case", "Continuação", "Encerramento"]}>
          {linhas.map((p) => {
            const enc = [p.acessos_revogados, p.grupo_arquivado, p.pasta_arquivada].filter(Boolean).length;
            return (
              <tr key={p.id}>
                <Td className="font-medium">{p.mentorados?.nome_agencia}</Td>
                <Td>{p.nps ?? "—"}</Td>
                <Td>{p.depoimento_texto ? <Badge tom="ok">Texto</Badge> : p.depoimento_url ? <Badge tom="ok">Vídeo</Badge> : "—"}</Td>
                <Td>{p.autoriza_case == null ? "—" : p.autoriza_case ? <Badge tom="ok">Autorizado</Badge> : <Badge>Não</Badge>}</Td>
                <Td>
                  <Badge tom={tomCont(p.status_continuacao)}>{ROTULOS.continuacao[p.status_continuacao]}</Badge>
                </Td>
                <Td className="text-[var(--fg-muted)]">{enc}/3</Td>
              </tr>
            );
          })}
        </Tabela>
      ) : (
        <Vazio titulo="Nenhum mentorado em encerramento" descricao="Cada mentorado ganha um registro aqui quando é criado." />
      )}
    </>
  );
}
