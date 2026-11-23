import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { origemPublica } from "@/lib/http";

/** Troca o código de um link enviado pelo Supabase (ex.: redefinição de senha) por uma sessão. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = origemPublica(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  return NextResponse.redirect(`${origin}/login?erro=erro`);
}
