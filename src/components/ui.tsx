import type { ReactNode } from "react";
import Link from "next/link";

/* Componentes básicos do painel. Cores vêm das variáveis em globals.css. */

export function PageHeader({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-[var(--fg-muted)]">{descricao}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  titulo,
  acoes,
}: {
  children: ReactNode;
  className?: string;
  titulo?: string;
  acoes?: ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm ${className}`}
    >
      {(titulo || acoes) && (
        <header className="mb-4 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-sm font-semibold text-[var(--fg)]">{titulo}</h2>}
          {acoes}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
  tom?: "neutro" | "ok" | "alerta" | "erro" | "destaque";
}) {
  const borda = {
    neutro: "border-[var(--border)]",
    ok: "border-[var(--ok)]/40",
    alerta: "border-[var(--alerta)]/50",
    erro: "border-[var(--erro)]/50",
    destaque: "border-[var(--primary)]/50",
  }[tom];
  return (
    <div className={`rounded-xl border bg-[var(--card)] p-5 shadow-sm ${borda}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--fg-muted)]">{rotulo}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--fg)]">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-[var(--fg-muted)]">{detalhe}</p>}
    </div>
  );
}

type TomBadge = "neutro" | "ok" | "alerta" | "erro" | "info";

export function Badge({ children, tom = "neutro" }: { children: ReactNode; tom?: TomBadge }) {
  const cls = {
    neutro: "bg-[var(--muted)] text-[var(--fg-muted)]",
    ok: "bg-[var(--ok)]/15 text-[var(--ok)]",
    alerta: "bg-[var(--alerta)]/15 text-[var(--alerta-fg)]",
    erro: "bg-[var(--erro)]/15 text-[var(--erro)]",
    info: "bg-[var(--primary)]/15 text-[var(--primary)]",
  }[tom];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function Sinal({ cor }: { cor: "verde" | "amarelo" | "vermelho" | null | undefined }) {
  const cls =
    cor === "verde"
      ? "bg-[var(--ok)]"
      : cor === "amarelo"
        ? "bg-[var(--alerta)]"
        : cor === "vermelho"
          ? "bg-[var(--erro)]"
          : "bg-[var(--border)]";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} aria-label={cor ?? "sem sinal"} />;
}

export function Button({
  children,
  href,
  variante = "primario",
  type = "button",
  className = "",
  ...rest
}: {
  children: ReactNode;
  href?: string;
  variante?: "primario" | "secundario" | "perigo" | "fantasma";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50";
  const cls = {
    primario: "bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90",
    secundario:
      "border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--muted)]",
    perigo: "bg-[var(--erro)] text-white hover:opacity-90",
    fantasma: "text-[var(--fg-muted)] hover:bg-[var(--muted)] hover:text-[var(--fg)]",
  }[variante];
  if (href) {
    return (
      <Link href={href} className={`${base} ${cls} ${className}`}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={`${base} ${cls} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--fg)]">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-[var(--fg-muted)]">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Progresso({ valor }: { valor: number }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
      <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--muted)] text-left text-xs uppercase tracking-wide text-[var(--fg-muted)]">
          <tr>
            {cabecalho.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 align-middle text-[var(--fg)] ${className}`}>
      {children}
    </td>
  );
}

export function Abas({ abas, ativa, base }: { abas: { id: string; label: string }[]; ativa: string; base: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-[var(--border)]">
      {abas.map((a) => {
        const on = a.id === ativa;
        return (
          <Link
            key={a.id}
            href={`${base}?aba=${a.id}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              on
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Coluna de kanban (sem arrastar ainda; a reordenação vem depois). */
export function Coluna({ titulo, total, children }: { titulo: string; total: number; children: ReactNode }) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-[var(--muted)] p-3">
      <header className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">{titulo}</h3>
        <span className="rounded-full bg-[var(--card)] px-2 py-0.5 text-xs text-[var(--fg-muted)]">{total}</span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function CartaoKanban({ children, href }: { children: ReactNode; href?: string }) {
  const cls = "rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm shadow-sm hover:border-[var(--primary)]/50";
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}
