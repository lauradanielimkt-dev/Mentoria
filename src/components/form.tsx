import type { ReactNode } from "react";

/* Blocos de formulário sem JavaScript no cliente: <details> abre e fecha. */

export function Painel({
  titulo,
  children,
  aberto = false,
  className = "",
}: {
  titulo: string;
  children: ReactNode;
  aberto?: boolean;
  className?: string;
}) {
  return (
    <details open={aberto} className={`glass rise group rounded-[var(--radius)] ${className}`}>
      <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-3.5 text-[13.5px] font-medium text-[var(--fg)] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <span className="brand-gradient inline-block h-1.5 w-1.5 rounded-full" />
          {titulo}
        </span>
        <span className="text-[var(--fg-muted)] transition-transform duration-300 ease-[var(--ease)] group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-[var(--border)] px-5 py-5">{children}</div>
    </details>
  );
}

export function Campo({
  rotulo,
  children,
  className = "",
  dica,
}: {
  rotulo: string;
  children: ReactNode;
  className?: string;
  dica?: string;
}) {
  return (
    <div className={className}>
      <label>{rotulo}</label>
      {children}
      {dica && <p className="mt-1 text-xs text-[var(--fg-muted)]">{dica}</p>}
    </div>
  );
}

export function Grade({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  const cls = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[cols];
  return <div className={`grid gap-4 ${cls}`}>{children}</div>;
}

export function Check({ nome, rotulo, marcado }: { nome: string; rotulo: string; marcado?: boolean }) {
  return (
    <label className="!mb-0 flex items-center gap-2 !text-[13px] !normal-case !tracking-normal !text-[var(--fg)]">
      <input type="checkbox" name={nome} defaultChecked={marcado} /> {rotulo}
    </label>
  );
}

/** Botão pequeno para ações em linha (mudar status, excluir). */
export function BotaoMini({
  children,
  tom = "neutro",
  type = "submit",
  name,
  value,
  title,
}: {
  children: ReactNode;
  tom?: "neutro" | "ok" | "erro" | "info";
  type?: "submit" | "button";
  name?: string;
  value?: string;
  title?: string;
}) {
  const cls = {
    neutro: "bg-white/[0.07] text-[var(--fg)] hover:bg-white/[0.12]",
    ok: "bg-[var(--ok)]/12 text-[var(--ok)] hover:bg-[var(--ok)]/20",
    erro: "bg-[var(--erro)]/10 text-[var(--erro)] hover:bg-[var(--erro)]/20",
    info: "bg-[var(--primary)]/12 text-[#ff8a8f] hover:bg-[var(--primary)]/22",
  }[tom];
  return (
    <button
      type={type}
      name={name}
      value={value}
      title={title}
      className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all duration-150 active:scale-95 ${cls}`}
    >
      {children}
    </button>
  );
}

export function Erro({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <p className="mb-4 rounded-[12px] bg-[var(--erro)]/10 px-3.5 py-2.5 text-[13px] text-[var(--erro)] ring-1 ring-inset ring-[var(--erro)]/25">
      {mensagem}
    </p>
  );
}

export function Ok({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <p className="mb-4 rounded-[12px] bg-[var(--ok)]/10 px-3.5 py-2.5 text-[13px] text-[var(--ok)] ring-1 ring-inset ring-[var(--ok)]/25">
      {mensagem}
    </p>
  );
}
