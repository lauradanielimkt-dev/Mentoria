import type { ReactNode } from "react";
import Link from "next/link";

/* Componentes do painel. Estilo: vidro escuro, cantos amplos, movimento curto. */

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
    <div className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[var(--fg)]">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-[14.5px] text-[var(--fg-muted)]">{descricao}</p>}
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
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  titulo?: string;
  acoes?: ReactNode;
  hover?: boolean;
}) {
  return (
    <section className={`glass rise rounded-[var(--radius)] p-5 ${hover ? "glass-hover" : ""} ${className}`}>
      {(titulo || acoes) && (
        <header className="mb-4 flex items-center justify-between gap-2">
          {titulo && <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">{titulo}</h2>}
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
  delay = 0,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
  tom?: "neutro" | "ok" | "alerta" | "erro" | "destaque";
  delay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}) {
  const faixa = {
    neutro: "from-white/20 to-transparent",
    ok: "from-[var(--ok)] to-transparent",
    alerta: "from-[var(--alerta)] to-transparent",
    erro: "from-[var(--erro)] to-transparent",
    destaque: "from-[var(--primary)] via-[var(--accent)] to-transparent",
  }[tom];
  return (
    <div className={`glass glass-hover rise rise-${delay} relative overflow-hidden rounded-[var(--radius)] p-5`}>
      <span className={`absolute inset-x-5 top-0 h-px bg-gradient-to-r ${faixa}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-muted)]">{rotulo}</p>
      <p className="tabular mt-3 text-[30px] font-semibold leading-none tracking-[-0.02em] text-[var(--fg)]">{valor}</p>
      {detalhe && <p className="mt-2 text-xs text-[var(--fg-muted)]">{detalhe}</p>}
    </div>
  );
}

type TomBadge = "neutro" | "ok" | "alerta" | "erro" | "info";

export function Badge({ children, tom = "neutro" }: { children: ReactNode; tom?: TomBadge }) {
  const cls = {
    neutro: "bg-white/[0.07] text-[var(--fg-muted)] ring-white/10",
    ok: "bg-[var(--ok)]/12 text-[var(--ok)] ring-[var(--ok)]/25",
    alerta: "bg-[var(--alerta)]/12 text-[var(--alerta-fg)] ring-[var(--alerta)]/25",
    erro: "bg-[var(--erro)]/12 text-[var(--erro)] ring-[var(--erro)]/25",
    info: "bg-[var(--primary)]/14 text-[#ff8a8f] ring-[var(--primary)]/30",
  }[tom];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  );
}

export function Sinal({ cor }: { cor: "verde" | "amarelo" | "vermelho" | null | undefined }) {
  const cls =
    cor === "verde"
      ? "bg-[var(--ok)] text-[var(--ok)] shadow-[0_0_10px_currentColor]"
      : cor === "amarelo"
        ? "bg-[var(--alerta)] text-[var(--alerta)] shadow-[0_0_10px_currentColor]"
        : cor === "vermelho"
          ? "bg-[var(--erro)] text-[var(--erro)] shadow-[0_0_10px_currentColor]"
          : "bg-white/15";
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} aria-label={cor ?? "sem sinal"} />;
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
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium transition-all duration-200 ease-[var(--ease-io)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";
  const cls = {
    primario:
      "brand-gradient text-white shadow-[0_8px_24px_-10px_rgba(224,38,46,0.9)] hover:shadow-[0_12px_30px_-10px_rgba(224,38,46,1)] hover:brightness-110",
    secundario:
      "border border-[var(--border)] bg-white/[0.05] text-[var(--fg)] hover:border-[var(--border-strong)] hover:bg-white/[0.09]",
    perigo: "bg-[var(--erro)] text-white hover:brightness-110",
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
    <div className="rise flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border-strong)] px-6 py-12 text-center">
      <span className="mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] opacity-70" />
      <p className="text-[14px] font-medium text-[var(--fg)]">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-[13px] text-[var(--fg-muted)]">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Progresso({ valor }: { valor: number }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-[width] duration-700 ease-[var(--ease)]"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="glass rise overflow-x-auto rounded-[var(--radius)]">
      <table className="w-full text-[13.5px]">
        <thead className="text-left text-[10.5px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
          <tr className="border-b border-[var(--border)]">
            {cabecalho.map((c) => (
              <th key={c} className="px-4 py-3.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
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
    <nav className="rise mb-7 flex flex-wrap gap-1 rounded-full border border-[var(--border)] bg-white/[0.03] p-1 w-fit max-w-full">
      {abas.map((a) => {
        const on = a.id === ativa;
        return (
          <Link
            key={a.id}
            href={`${base}?aba=${a.id}`}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ease-[var(--ease-io)] ${
              on
                ? "bg-white/[0.1] text-[var(--fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
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
    <div className="rise flex w-[290px] shrink-0 flex-col rounded-[var(--radius)] border border-[var(--border)] bg-white/[0.025] p-3">
      <header className="mb-3 flex items-center justify-between px-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-muted)]">{titulo}</h3>
        <span className="tabular rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] text-[var(--fg-muted)]">{total}</span>
      </header>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

export function CartaoKanban({ children, href }: { children: ReactNode; href?: string }) {
  const cls = "glass glass-hover block rounded-[14px] p-3.5 text-[13.5px]";
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}
