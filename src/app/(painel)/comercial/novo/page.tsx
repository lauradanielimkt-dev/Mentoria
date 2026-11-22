import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { Erro } from "@/components/form";
import { criarLead } from "../actions";
import { FormLead } from "../FormLead";

export default async function NovoLeadPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await exigirPerfil("admin");
  const { erro } = await searchParams;
  const supabase = await createClient();
  const [{ data: origens }, { data: responsaveis }] = await Promise.all([
    supabase.from("origens_lead").select("id,nome").eq("ativo", true).order("ordem"),
    supabase.from("perfis").select("id,nome").in("perfil", ["admin", "equipe"]).eq("ativo", true),
  ]);

  return (
    <>
      <PageHeader titulo="Novo interessado" descricao="Entra na coluna “Novo contato” do pipeline." />
      <Card className="max-w-3xl">
        <Erro mensagem={erro} />
        <FormLead origens={origens ?? []} responsaveis={responsaveis ?? []} action={criarLead} textoBotao="Salvar" />
      </Card>
    </>
  );
}
