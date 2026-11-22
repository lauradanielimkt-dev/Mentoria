import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dataLonga } from "@/lib/formato";
import { Badge, Button, PageHeader, Vazio } from "@/components/ui";
import { BotaoMini, Campo, Erro, Grade, Painel } from "@/components/form";
import { atualizarDocumento, baixarDocumento, criarDocumento } from "./actions";

const TIPOS: Record<string, string> = {
  ficha_oferta: "Ficha da oferta",
  proposta: "Proposta",
  pitch: "Pitch",
  formulario_aplicacao: "Formulário",
  roteiro_whatsapp: "WhatsApp",
  faq: "FAQ",
  contrato: "Contrato",
  confidencialidade: "Confidencialidade",
  outro: "Outro",
};

export default async function DocumentosVendaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await exigirPerfil("admin", "equipe");
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documentos_venda").select("*, perfis(nome)").order("created_at");
  type Doc = NonNullable<typeof docs>[number] & { perfis: { nome: string | null } | null };
  const lista = (docs ?? []) as Doc[];

  return (
    <>
      <PageHeader titulo="Documentos de venda" descricao="Materiais usados para vender a mentoria. A Ficha da oferta é a fonte da verdade." />
      <Erro mensagem={erro} />

      {lista.length ? (
        <div className="space-y-3">
          {lista.map((d, idx) => (
            <details key={d.id} className={`glass rise rise-${Math.min(6, idx + 1)} group rounded-[var(--radius)]`}>
              <summary className="flex cursor-pointer select-none flex-wrap items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="text-[14px] font-medium">{d.nome}</span>
                <Badge>{TIPOS[d.tipo] ?? d.tipo}</Badge>
                <span className="text-xs text-[var(--fg-muted)]">v{d.versao}</span>
                <span className="ml-auto flex items-center gap-3 text-xs text-[var(--fg-muted)]">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-[#ff8a8f] hover:underline">Abrir link</a>
                  ) : d.arquivo_path ? (
                    <form action={baixarDocumento}>
                      <input type="hidden" name="path" value={d.arquivo_path} />
                      <BotaoMini tom="info">Baixar</BotaoMini>
                    </form>
                  ) : (
                    <Badge tom="alerta">Sem anexo</Badge>
                  )}
                  <span>{dataLonga(d.updated_at)}</span>
                  <span className="transition-transform duration-300 ease-[var(--ease)] group-open:rotate-180">▾</span>
                </span>
              </summary>
              <div className="border-t border-[var(--border)] px-5 py-5">
                <form action={atualizarDocumento} className="space-y-4" encType="multipart/form-data">
                  <input type="hidden" name="id" value={d.id} />
                  <Grade cols={4}>
                    <Campo rotulo="Nome" className="sm:col-span-2">
                      <input name="nome" defaultValue={d.nome} required />
                    </Campo>
                    <Campo rotulo="Versão">
                      <input name="versao" defaultValue={d.versao} />
                    </Campo>
                    <Campo rotulo="Substituir arquivo">
                      <input type="file" name="arquivo" />
                    </Campo>
                    <Campo rotulo="Link" className="sm:col-span-2">
                      <input name="url" defaultValue={d.url ?? ""} placeholder="https://" />
                    </Campo>
                    <Campo rotulo="Observações" className="sm:col-span-2">
                      <input name="observacoes" defaultValue={d.observacoes ?? ""} />
                    </Campo>
                  </Grade>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--fg-muted)]">{d.perfis?.nome ? `Última edição: ${d.perfis.nome}` : ""}</span>
                    <span className="flex-1" />
                    <BotaoMini tom="erro" name="acao" value="excluir">Excluir</BotaoMini>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <Vazio titulo="Nenhum documento" descricao="Cadastre a ficha da oferta, a proposta, o pitch e os demais materiais." />
      )}

      <div className="mt-6">
        <Painel titulo="Novo documento">
          <form action={criarDocumento} className="space-y-4" encType="multipart/form-data">
            <Grade cols={4}>
              <Campo rotulo="Nome *" className="sm:col-span-2">
                <input name="nome" required />
              </Campo>
              <Campo rotulo="Tipo">
                <select name="tipo" defaultValue="outro">
                  {Object.entries(TIPOS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Versão">
                <input name="versao" defaultValue="1.0" />
              </Campo>
              <Campo rotulo="Link" className="sm:col-span-2">
                <input name="url" placeholder="https://" />
              </Campo>
              <Campo rotulo="Ou arquivo" className="sm:col-span-2">
                <input type="file" name="arquivo" />
              </Campo>
              <Campo rotulo="Observações" className="sm:col-span-4">
                <input name="observacoes" />
              </Campo>
            </Grade>
            <Button type="submit">Adicionar</Button>
          </form>
        </Painel>
      </div>
    </>
  );
}
