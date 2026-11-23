import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Vazio } from "@/components/ui";
import { alternarItemOnboarding } from "./actions";

/** Onboarding é interno da Marmaris: só admin e equipe. Mentorado é redirecionado ao Início. */
export default async function OnboardingPage() {
  await exigirPerfil("admin", "equipe");
  const supabase = await createClient();

  // Tabela mentorados x etapas
  const [{ data: mentorados }, { data: itens }] = await Promise.all([
    supabase.from("mentorados").select("id,nome_agencia").eq("ativo", true).order("nome_agencia"),
    supabase.from("onboarding_itens").select("*").order("ordem"),
  ]);

  const etapas = [...new Map((itens ?? []).map((i) => [i.titulo, i.ordem])).entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([titulo]) => titulo);

  return (
    <>
      <PageHeader titulo="Onboarding" descricao="Checklist de dezembro, um por mentorado. Quem está atrasado aparece de relance." />
      {mentorados && mentorados.length && etapas.length ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs text-[var(--fg-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Mentorado</th>
                {etapas.map((e) => (
                  <th key={e} className="px-2 py-3 text-center font-medium">
                    <span className="block max-w-[7rem] truncate" title={e}>
                      {e}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
              {mentorados.map((m) => {
                const meus = (itens ?? []).filter((i) => i.mentorado_id === m.id);
                const feitos = meus.filter((i) => i.concluido).length;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.nome_agencia}</td>
                    {etapas.map((e) => {
                      const item = meus.find((i) => i.titulo === e);
                      return (
                        <td key={e} className="px-2 py-3 text-center">
                          {item ? (
                            <form action={alternarItemOnboarding} className="inline">
                              <input type="hidden" name="id" value={item.id} />
                              <input type="hidden" name="concluido" value={item.concluido ? "0" : "1"} />
                              <button
                                type="submit"
                                className={`h-6 w-6 rounded-full text-xs ${
                                  item.concluido ? "bg-[var(--ok)] text-white" : "bg-[var(--muted)] text-[var(--fg-muted)]"
                                }`}
                                aria-label={`${e}: ${item.concluido ? "feito" : "pendente"}`}
                              >
                                {item.concluido ? "✓" : "·"}
                              </button>
                            </form>
                          ) : (
                            <span className="text-[var(--fg-muted)]">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-[var(--fg-muted)]">
                      {feitos}/{meus.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio titulo="Sem checklists ainda" descricao="O checklist é criado a partir do modelo quando um lead é fechado no Comercial." />
      )}
    </>
  );
}
