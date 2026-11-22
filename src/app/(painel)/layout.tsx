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
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
