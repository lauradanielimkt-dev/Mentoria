"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  FileText,
  Wallet,
  Megaphone,
  ClipboardCheck,
  Library,
  Users,
  Compass,
  Flag,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import type { BlocoMenu } from "@/lib/navegacao";
import { Logo } from "@/components/Logo";

const ICONES: Record<string, LucideIcon> = {
  LayoutDashboard,
  KanbanSquare,
  FileText,
  Wallet,
  Megaphone,
  ClipboardCheck,
  Library,
  Users,
  Compass,
  Flag,
  Settings,
};

const ROTULO_PERFIL: Record<string, string> = { admin: "Admin", equipe: "Equipe", mentorado: "Mentorado" };

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function Sidebar({
  blocos,
  usuario,
}: {
  blocos: BlocoMenu[];
  usuario: { nome: string; perfil: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[264px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] text-[var(--sidebar-fg)] backdrop-blur-2xl">
      {/* Marca */}
      <div className="px-6 pb-4 pt-7">
        <Logo className="h-9 w-auto" />
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--fg-muted)]">
          Mentoria
        </p>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
        {blocos.map((bloco, i) => (
          <div key={bloco.titulo || i} className="mb-5">
            {bloco.titulo && (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                {bloco.titulo}
              </p>
            )}
            <ul className="space-y-0.5">
              {bloco.itens.map((item) => {
                const Icone = ICONES[item.icone] ?? LayoutDashboard;
                const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] transition-all duration-200 ease-[var(--ease-io)] ${
                        ativo
                          ? "bg-[var(--sidebar-ativo)] font-medium text-[var(--sidebar-ativo-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "text-[var(--fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--fg)]"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--primary)] transition-all duration-300 ease-[var(--ease)] ${
                          ativo ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                        }`}
                      />
                      <Icone
                        className={`h-[17px] w-[17px] transition-transform duration-300 ease-[var(--ease)] ${
                          ativo ? "text-[var(--primary)]" : "group-hover:-translate-y-px"
                        }`}
                        strokeWidth={ativo ? 2.2 : 1.8}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Usuário */}
      <div className="m-3 rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-3">
        <div className="flex items-center gap-3">
          <div className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(224,38,46,0.7)]">
            {iniciais(usuario.nome) || "M"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-[var(--fg)]">{usuario.nome}</p>
            <p className="text-[11px] text-[var(--fg-muted)]">{ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Sair"
              className="rounded-full p-2 text-[var(--fg-muted)] transition-colors duration-150 hover:bg-[var(--muted)] hover:text-[var(--fg)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
