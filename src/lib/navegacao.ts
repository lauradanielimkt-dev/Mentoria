import type { PerfilUsuario } from "@/lib/supabase/database.types";

export interface ItemMenu {
  href: string;
  label: string;
  icone: string; // nome do ícone em lucide-react
  perfis: PerfilUsuario[];
}

export interface BlocoMenu {
  titulo: string;
  itens: ItemMenu[];
}

const TODOS: PerfilUsuario[] = ["admin", "equipe", "mentorado"];
const STAFF: PerfilUsuario[] = ["admin", "equipe"];
const ADMIN: PerfilUsuario[] = ["admin"];

/** Menu lateral em quatro blocos, como no painel atual da Marmaris. */
export const MENU: BlocoMenu[] = [
  {
    titulo: "",
    itens: [{ href: "/", label: "Início", icone: "LayoutDashboard", perfis: TODOS }],
  },
  {
    titulo: "Vender",
    itens: [
      { href: "/comercial", label: "Comercial", icone: "KanbanSquare", perfis: STAFF },
      { href: "/documentos-venda", label: "Documentos de venda", icone: "FileText", perfis: STAFF },
      { href: "/financeiro", label: "Financeiro", icone: "Wallet", perfis: ADMIN },
    ],
  },
  {
    titulo: "Entregar",
    itens: [
      { href: "/marketing", label: "Marketing", icone: "Megaphone", perfis: STAFF },
      { href: "/onboarding", label: "Onboarding", icone: "ClipboardCheck", perfis: STAFF },
      { href: "/biblioteca", label: "Biblioteca", icone: "Library", perfis: TODOS },
    ],
  },
  {
    titulo: "Acompanhar",
    itens: [
      { href: "/mentorados", label: "Mentorados", icone: "Users", perfis: STAFF },
      { href: "/minha-mentoria", label: "Minha mentoria", icone: "Compass", perfis: ["mentorado"] },
      { href: "/pos-mentoria", label: "Pós-mentoria", icone: "Flag", perfis: TODOS },
    ],
  },
  {
    titulo: "Gestão",
    itens: [{ href: "/configuracoes", label: "Configurações", icone: "Settings", perfis: ADMIN }],
  },
];

export function menuParaPerfil(perfil: PerfilUsuario): BlocoMenu[] {
  return MENU.map((b) => ({
    ...b,
    itens: b.itens.filter((i) => i.perfis.includes(perfil)),
  })).filter((b) => b.itens.length > 0);
}
