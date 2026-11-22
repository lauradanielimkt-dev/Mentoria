import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PastaMentorado } from "@/components/PastaMentorado";

/** A pasta do próprio mentorado, sem as abas internas. */
export default async function MinhaMentoriaPage({ searchParams }: { searchParams: Promise<{ aba?: string; erro?: string }> }) {
  const sessao = await exigirPerfil("mentorado");
  const { aba, erro } = await searchParams;

  const supabase = await createClient();
  const { data: mentorado } = await supabase.from("mentorados").select("*").eq("id", sessao.perfil.mentorado_id!).maybeSingle();
  if (!mentorado) notFound();

  return <PastaMentorado mentorado={mentorado} aba={aba} base="/minha-mentoria" staff={false} erro={erro} />;
}
