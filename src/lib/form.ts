/** Leitura segura de campos de FormData nas Server Actions. */

export function texto(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function obrigatorio(fd: FormData, k: string): string {
  const v = texto(fd, k);
  if (!v) throw new Error(`Campo obrigatório: ${k}`);
  return v;
}

/** Aceita "1.234,56", "1234.56" e "1234". */
export function numero(fd: FormData, k: string): number | null {
  const v = texto(fd, k);
  if (!v) return null;
  const limpo = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export function inteiro(fd: FormData, k: string): number | null {
  const n = numero(fd, k);
  return n == null ? null : Math.trunc(n);
}

export function bool(fd: FormData, k: string): boolean {
  const v = fd.get(k);
  return v === "on" || v === "1" || v === "true";
}

export function uuid(fd: FormData, k: string): string | null {
  const v = texto(fd, k);
  return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

/** Valor de um <input type="date"> ou datetime-local, ou null. */
export function data(fd: FormData, k: string): string | null {
  return texto(fd, k);
}

/** Garante que o valor está entre as opções permitidas. */
export function opcao<T extends string>(fd: FormData, k: string, permitidos: readonly T[], padrao?: T): T {
  const v = texto(fd, k);
  if (v && (permitidos as readonly string[]).includes(v)) return v as T;
  if (padrao !== undefined) return padrao;
  throw new Error(`Valor inválido em ${k}`);
}

/** Converte linhas "Pergunta: resposta" em objeto JSON. */
export function linhasParaJson(txt: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!txt) return out;
  for (const linha of txt.split(/\r?\n/)) {
    const i = linha.indexOf(":");
    if (i <= 0) continue;
    const k = linha.slice(0, i).trim();
    const v = linha.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export function jsonParaLinhas(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  return Object.entries(obj as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${v ?? ""}`)
    .join("\n");
}

/**
 * Valor de <input type="datetime-local"> interpretado no fuso de São Paulo
 * (UTC-3, sem horário de verão) e devolvido como ISO com offset.
 */
export function dataHoraSP(fd: FormData, k: string): string | null {
  const v = texto(fd, k);
  if (!v) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(v)) return v;
  return `${v.length === 16 ? `${v}:00` : v}-03:00`;
}
