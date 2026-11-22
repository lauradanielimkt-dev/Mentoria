export const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

export const dataCurta = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(iso)) : "—";

export const dataLonga = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso))
    : "—";

export const dataHora = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(iso),
      )
    : "—";

export const pct = (v: number) => `${Math.round(v)}%`;

export const ROTULOS = {
  statusLead: {
    novo_contato: "Novo contato",
    aplicacao_recebida: "Aplicação recebida",
    call_agendada: "Call agendada",
    proposta_enviada: "Proposta enviada",
    negociacao: "Negociação",
    fechado: "Fechado",
    perdido: "Perdido",
  },
  statusMarketing: {
    ideia: "Ideia",
    roteiro: "Roteiro",
    producao: "Produção",
    aprovacao: "Aprovação",
    agendado: "Agendado",
    publicado: "Publicado",
  },
  formato: {
    reels: "Reels",
    stories: "Stories",
    carrossel: "Carrossel",
    anuncio: "Anúncio",
    pagina: "Página",
  },
  statusParcela: { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado" },
  statusTarefa: { a_fazer: "A fazer", em_andamento: "Em andamento", concluida: "Concluída" },
  statusPlano: {
    pendente: "Pendente",
    em_andamento: "Em andamento",
    concluido: "Concluído",
    atrasado: "Atrasado",
  },
  periodo: { inicio: "Ponto de partida", mes_1: "Mês 1", mes_2: "Mês 2", mes_3: "Mês 3" },
  continuacao: {
    vai_renovar: "Vai renovar",
    nao_vai: "Não vai renovar",
    em_negociacao: "Em negociação",
    indefinido: "Indefinido",
  },
  perfil: { admin: "Admin", equipe: "Equipe", mentorado: "Mentorado" },
  tipoMaterial: {
    documento: "Documento",
    video: "Vídeo",
    planilha: "Planilha",
    link: "Link",
    arquivo: "Arquivo",
  },
} as const;

/** Valor para <input type="datetime-local"> no fuso de São Paulo. */
export function inputDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

/** Valor para <input type="date"> (aceita "YYYY-MM-DD" ou ISO). */
export function inputDate(v: string | null | undefined): string {
  return v ? v.slice(0, 10) : "";
}
