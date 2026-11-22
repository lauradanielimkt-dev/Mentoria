import type { Lead } from "@/lib/supabase/database.types";
import { inputDateTime } from "@/lib/formato";
import { Button } from "@/components/ui";
import { Campo, Check, Grade } from "@/components/form";

/** Formulário compartilhado por "Novo interessado" e "Editar interessado". */
export function FormLead({
  lead,
  origens,
  responsaveis,
  action,
  textoBotao,
}: {
  lead?: Lead | null;
  origens: { id: string; nome: string }[];
  responsaveis: { id: string; nome: string | null }[];
  action: (fd: FormData) => Promise<void>;
  textoBotao: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {lead && <input type="hidden" name="id" value={lead.id} />}
      <Grade cols={4}>
        <Campo rotulo="Nome *" className="sm:col-span-2">
          <input name="nome" required defaultValue={lead?.nome ?? ""} />
        </Campo>
        <Campo rotulo="Agência" className="sm:col-span-2">
          <input name="agencia" defaultValue={lead?.agencia ?? ""} />
        </Campo>
        <Campo rotulo="Cidade">
          <input name="cidade" defaultValue={lead?.cidade ?? ""} />
        </Campo>
        <Campo rotulo="UF">
          <input name="uf" maxLength={2} defaultValue={lead?.uf ?? ""} />
        </Campo>
        <Campo rotulo="Origem">
          <select name="origem_id" defaultValue={lead?.origem_id ?? ""}>
            <option value="">—</option>
            {origens.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Faturamento (R$/mês)">
          <input name="faturamento_aprox" inputMode="decimal" placeholder="80000" defaultValue={lead?.faturamento_aprox ?? ""} />
        </Campo>
        <Campo rotulo="Data da call">
          <input name="data_call" type="datetime-local" defaultValue={inputDateTime(lead?.data_call)} />
        </Campo>
        <Campo rotulo="Responsável">
          <select name="responsavel_id" defaultValue={lead?.responsavel_id ?? ""}>
            <option value="">—</option>
            {responsaveis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome ?? p.id}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Próximo passo" className="sm:col-span-2">
          <input name="proximo_passo" defaultValue={lead?.proximo_passo ?? ""} />
        </Campo>
        <Campo rotulo="Observações" className="sm:col-span-4">
          <textarea name="observacoes" rows={3} defaultValue={lead?.observacoes ?? ""} />
        </Campo>
      </Grade>
      <div className="flex flex-wrap items-center gap-4">
        <Check nome="lista_espera" rotulo="Lista de espera (próxima turma)" marcado={lead?.lista_espera ?? false} />
        <span className="flex-1" />
        <Button href="/comercial" variante="secundario">Cancelar</Button>
        <Button type="submit">{textoBotao}</Button>
      </div>
    </form>
  );
}
