import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PastaMentorado } from "@/components/PastaMentorado";

export default async function PastaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  await exigirPerfil("admin", "equipe");
  const { id } = await params;
  const { aba } = await searchParams;

  const supabase = await createClient();
  const { data: mentorado } = await supabase.from("mentorados").select("*").eq("id", id).maybeSingle();
  if (!mentorado) notFound();

  return <PastaMentorado mentorado={mentorado} aba={aba} base={`/mentorados/${id}`} staff />;
}
