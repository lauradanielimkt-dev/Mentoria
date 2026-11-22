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

export function Sidebar({
  blocos,
  usuario,
}: {
  blocos: BlocoMenu[];
  usuario: { nome: string; perfil: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] text-[var(--sidebar-fg)]">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] font-bold text-[var(--primary-fg)]">
          M
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Marmaris</p>
          <p className="text-xs opacity-70">Mentoria</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {blocos.map((bloco, i) => (
          <div key={bloco.titulo || i} className="mb-4">
            {bloco.titulo && (
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider opacity-50">
                {bloco.titulo}
              </p>
            )}
            <ul className="space-y-0.5">
              {bloco.itens.map((item) => {
                const Icone = ICONES[item.icone] ?? LayoutDashboard;
                const ativo =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        ativo
                          ? "bg-[var(--sidebar-ativo)] font-medium text-[var(--sidebar-ativo-fg)]"
                          : "opacity-80 hover:bg-[var(--sidebar-hover)] hover:opacity-100"
                      }`}
                    >
                      <Icone className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border)]/40 px-4 py-4">
        <p className="truncate text-sm font-medium">{usuario.nome}</p>
        <p className="text-xs capitalize opacity-60">{usuario.perfil}</p>
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="flex items-center gap-2 text-xs opacity-70 transition hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
