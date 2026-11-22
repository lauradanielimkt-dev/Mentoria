import { Sidebar } from "@/components/Sidebar";
import { getSessao } from "@/lib/auth";
import { menuParaPerfil } from "@/lib/navegacao";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  const blocos = menuParaPerfil(sessao.perfil.perfil);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        blocos={blocos}
        usuario={{
          nome: sessao.perfil.nome ?? sessao.email ?? "Usuário",
          perfil: sessao.perfil.perfil,
        }}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1280px] px-6 py-9 lg:px-12">{children}</div>
      </main>
    </div>
  );
}
