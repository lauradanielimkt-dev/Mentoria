import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataLonga } from "@/lib/formato";
import { Badge, PageHeader, Tabela, Td, Vazio } from "@/components/ui";

const TIPOS: Record<string, string> = {
  ficha_oferta: "Ficha da oferta",
  proposta: "Proposta",
  pitch: "Pitch",
  formulario_aplicacao: "Formulário",
  roteiro_whatsapp: "WhatsApp",
  faq: "FAQ",
  contrato: "Contrato",
  confidencialidade: "Confidencialidade",
};

export default async function DocumentosVendaPage() {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documentos_venda").select("*").order("created_at");

  return (
    <>
      <PageHeader
        titulo="Documentos de venda"
        descricao="Materiais usados para vender a mentoria. A Ficha da oferta é a fonte da verdade."
      />
      {docs && docs.length ? (
        <Tabela cabecalho={["Documento", "Tipo", "Versão", "Link / arquivo", "Atualizado em"]}>
          {docs.map((d) => (
            <tr key={d.id}>
              <Td className="font-medium">{d.nome}</Td>
              <Td>
                <Badge>{TIPOS[d.tipo] ?? d.tipo}</Badge>
              </Td>
              <Td>v{d.versao}</Td>
              <Td>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline">
                    Abrir link
                  </a>
                ) : d.arquivo_path ? (
                  <span className="text-[var(--fg-muted)]">Arquivo no Storage</span>
                ) : (
                  <span className="text-[var(--fg-muted)]">Ainda não anexado</span>
                )}
              </Td>
              <Td className="text-[var(--fg-muted)]">{dataLonga(d.updated_at)}</Td>
            </tr>
          ))}
        </Tabela>
      ) : (
        <Vazio titulo="Nenhum documento" descricao="Rode o seed do banco para criar a lista padrão." />
      )}
    </>
  );
}
