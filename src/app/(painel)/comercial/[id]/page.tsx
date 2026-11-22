import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROTULOS } from "@/lib/formato";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { BotaoMini, Erro } from "@/components/form";
import { atualizarLead, excluirLead } from "../actions";
import { FormLead } from "../FormLead";

export default async function EditarLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirPerfil("admin");
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: lead }, { data: origens }, { data: responsaveis }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase.from("origens_lead").select("id,nome").eq("ativo", true).order("ordem"),
    supabase.from("perfis").select("id,nome").in("perfil", ["admin", "equipe"]).eq("ativo", true),
  ]);
  if (!lead) notFound();

  return (
    <>
      <PageHeader
        titulo={lead.nome}
        descricao={lead.agencia ?? "Interessado na mentoria"}
        acoes={
          <>
            <Badge tom={lead.status === "fechado" ? "ok" : lead.status === "perdido" ? "erro" : "info"}>{ROTULOS.statusLead[lead.status]}</Badge>
            {lead.mentorado_id && <Button href={`/mentorados/${lead.mentorado_id}`} variante="secundario">Abrir pasta do mentorado</Button>}
          </>
        }
      />
      <Card className="max-w-3xl">
        <Erro mensagem={erro} />
        <FormLead lead={lead} origens={origens ?? []} responsaveis={responsaveis ?? []} action={atualizarLead} textoBotao="Salvar alterações" />
        {!lead.mentorado_id && (
          <form action={excluirLead} className="mt-6 border-t border-[var(--border)] pt-4">
            <input type="hidden" name="id" value={lead.id} />
            <BotaoMini tom="erro">Excluir interessado</BotaoMini>
          </form>
        )}
      </Card>
    </>
  );
}
