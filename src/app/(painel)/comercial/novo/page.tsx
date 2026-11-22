import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, PageHeader } from "@/components/ui";
import { criarLead } from "../actions";

export default async function NovoLeadPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await exigirPerfil("admin");
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: origens } = await supabase.from("origens_lead").select("*").eq("ativo", true).order("ordem");

  return (
    <>
      <PageHeader titulo="Novo interessado" descricao="Entra na coluna “Novo contato” do pipeline." />
      <Card className="max-w-2xl">
        {erro && <p className="mb-4 rounded-lg bg-[var(--erro)]/10 px-3 py-2 text-sm text-[var(--erro)]">{erro}</p>}
        <form action={criarLead} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nome">Nome *</label>
            <input id="nome" name="nome" required />
          </div>
          <div>
            <label htmlFor="agencia">Agência</label>
            <input id="agencia" name="agencia" />
          </div>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label htmlFor="cidade">Cidade</label>
              <input id="cidade" name="cidade" />
            </div>
            <div>
              <label htmlFor="uf">UF</label>
              <input id="uf" name="uf" maxLength={2} />
            </div>
          </div>
          <div>
            <label htmlFor="origem_id">Origem</label>
            <select id="origem_id" name="origem_id" defaultValue="">
              <option value="">—</option>
              {(origens ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="faturamento_aprox">Faturamento aproximado (R$/mês)</label>
            <input id="faturamento_aprox" name="faturamento_aprox" inputMode="decimal" placeholder="80000" />
          </div>
          <div>
            <label htmlFor="data_call">Data da call</label>
            <input id="data_call" name="data_call" type="datetime-local" />
          </div>
          <div>
            <label htmlFor="proximo_passo">Próximo passo</label>
            <input id="proximo_passo" name="proximo_passo" />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--fg)] sm:col-span-2">
            <input type="checkbox" name="lista_espera" className="!w-auto" /> Lista de espera (próxima turma)
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Salvar</Button>
            <Button href="/comercial" variante="secundario">
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
