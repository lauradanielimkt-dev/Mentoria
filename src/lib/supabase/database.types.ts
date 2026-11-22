/**
 * Tipos do banco. Versão inicial escrita à mão a partir da migration.
 * Depois de criar o projeto no Supabase, regenerar com:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 */

export type PerfilUsuario = "admin" | "equipe" | "mentorado";

export type StatusLead =
  | "novo_contato"
  | "aplicacao_recebida"
  | "call_agendada"
  | "proposta_enviada"
  | "negociacao"
  | "fechado"
  | "perdido";

export type FormaPagamento = "a_vista" | "parcelado";
export type StatusParcela = "pendente" | "pago" | "atrasado";
export type StatusMarketing =
  | "ideia"
  | "roteiro"
  | "producao"
  | "aprovacao"
  | "agendado"
  | "publicado";
export type FormatoMarketing = "reels" | "stories" | "carrossel" | "anuncio" | "pagina";
export type TipoMaterial = "documento" | "video" | "planilha" | "link" | "arquivo";
export type StatusTarefa = "a_fazer" | "em_andamento" | "concluida";
export type LadoTarefa = "mentorado" | "marmaris";
export type StatusPlano = "pendente" | "em_andamento" | "concluido" | "atrasado";
export type PeriodoIndicador = "inicio" | "mes_1" | "mes_2" | "mes_3";
export type SinalSaude = "verde" | "amarelo" | "vermelho";
export type StatusContinuacao = "vai_renovar" | "nao_vai" | "em_negociacao" | "indefinido";
export type TipoModelo = "onboarding" | "plano_3_meses" | "pauta_reuniao";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Relacao = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/** Gera Insert/Update a partir do Row, para manter o arquivo curto. */
type Tabela<Row, Required extends keyof Row = never, Rels extends Relacao[] = []> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: Rels;
};

/** FKs usadas em joins (`select("*, mentorados(nome_agencia)")`). */
type ParaMentorado = {
  foreignKeyName: "mentorado_id_fkey";
  columns: ["mentorado_id"];
  isOneToOne: false;
  referencedRelation: "mentorados";
  referencedColumns: ["id"];
};
type ParaPerfil<Col extends string> = {
  foreignKeyName: `${Col}_fkey`;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: "perfis";
  referencedColumns: ["id"];
};
type ParaFinanceiro = {
  foreignKeyName: "parcelas_financeiro_id_fkey";
  columns: ["financeiro_id"];
  isOneToOne: false;
  referencedRelation: "financeiro";
  referencedColumns: ["id"];
};

export type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  perfil: PerfilUsuario;
  mentorado_id: string | null;
  ativo: boolean;
  created_at: string;
}

export type Turma = {
  id: string;
  nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  vagas: number;
  ativa: boolean;
  created_at: string;
}

export type Mentorado = {
  id: string;
  turma_id: string | null;
  nome_agencia: string;
  cidade: string | null;
  uf: string | null;
  dono: string | null;
  equipe: string | null;
  faturamento_aprox: number | null;
  ticket_medio: number | null;
  canais: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ListaFixa = {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export type Modelo = {
  id: string;
  tipo: TipoModelo;
  nome: string;
  itens: Json;
  padrao: boolean;
  created_at: string;
}

export type Lead = {
  id: string;
  turma_id: string | null;
  nome: string;
  agencia: string | null;
  cidade: string | null;
  uf: string | null;
  origem_id: string | null;
  faturamento_aprox: number | null;
  data_call: string | null;
  proximo_passo: string | null;
  status: StatusLead;
  motivo_perda_id: string | null;
  motivo_perda_texto: string | null;
  lista_espera: boolean;
  mentorado_id: string | null;
  responsavel_id: string | null;
  ordem: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentoVenda = {
  id: string;
  nome: string;
  tipo: string;
  versao: string;
  url: string | null;
  arquivo_path: string | null;
  observacoes: string | null;
  atualizado_por: string | null;
  created_at: string;
  updated_at: string;
}

export type Financeiro = {
  id: string;
  mentorado_id: string;
  forma_pagamento: FormaPagamento;
  valor_total: number;
  num_parcelas: number;
  nota_fiscal_emitida: boolean;
  contrato_assinado: boolean;
  interesse_continuacao: boolean;
  valor_continuacao: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type Parcela = {
  id: string;
  financeiro_id: string;
  numero: number;
  valor: number;
  vencimento: string;
  status: StatusParcela;
  pago_em: string | null;
}

export type MarketingConteudo = {
  id: string;
  titulo: string;
  formato: FormatoMarketing;
  responsavel_id: string | null;
  data_publicacao: string | null;
  roteiro: string | null;
  anexos: string[];
  link_post: string | null;
  status: StatusMarketing;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export type OnboardingItem = {
  id: string;
  mentorado_id: string;
  titulo: string;
  ordem: number;
  concluido: boolean;
  concluido_em: string | null;
  concluido_por: string | null;
  created_at: string;
}

export type BibliotecaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoMaterial;
  pilar_id: string | null;
  url: string | null;
  arquivo_path: string | null;
  liberado: boolean;
  liberar_semana: number | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export type Diagnostico = {
  id: string;
  mentorado_id: string;
  respostas: Json;
  notas_reuniao: string | null;
  data_reuniao: string | null;
  visivel_mentorado: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanoItem = {
  id: string;
  mentorado_id: string;
  mes: number;
  semana: number | null;
  titulo: string;
  descricao: string | null;
  status: StatusPlano;
  visivel_mentorado: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export type Reuniao = {
  id: string;
  mentorado_id: string;
  data: string;
  duracao_min: number;
  pauta: string | null;
  ata: string | null;
  link_gravacao: string | null;
  decisoes: string | null;
  plano_acao: string | null;
  realizada: boolean;
  visivel_mentorado: boolean;
  created_at: string;
  updated_at: string;
}

export type Tarefa = {
  id: string;
  mentorado_id: string | null;
  titulo: string;
  descricao: string | null;
  lado: LadoTarefa;
  responsavel_id: string | null;
  prazo: string | null;
  status: StatusTarefa;
  visivel_mentorado: boolean;
  ordem: number;
  concluida_em: string | null;
  created_at: string;
  updated_at: string;
}

export type Indicador = {
  id: string;
  mentorado_id: string;
  periodo: PeriodoIndicador;
  faturamento: number | null;
  num_vendas: number | null;
  leads: number | null;
  conversao: number | null;
  ticket_medio: number | null;
  pct_recorrencia: number | null;
  seguidores: number | null;
  observacoes: string | null;
  updated_at: string;
}

export type Acesso = {
  id: string;
  mentorado_id: string;
  item: string;
  liberado: boolean;
  liberado_em: string | null;
  observacoes: string | null;
  ordem: number;
}

export type NotaInterna = {
  id: string;
  mentorado_id: string;
  autor_id: string | null;
  texto: string;
  risco: SinalSaude | null;
  created_at: string;
}

export type Arquivo = {
  id: string;
  mentorado_id: string;
  nome: string;
  arquivo_path: string;
  tipo: string | null;
  visivel_mentorado: boolean;
  enviado_por: string | null;
  created_at: string;
}

export type PosMentoria = {
  id: string;
  mentorado_id: string;
  nps: number | null;
  depoimento_texto: string | null;
  depoimento_url: string | null;
  autoriza_case: boolean | null;
  status_continuacao: StatusContinuacao;
  acessos_revogados: boolean;
  grupo_arquivado: boolean;
  pasta_arquivada: boolean;
  respondido_em: string | null;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      perfis: Tabela<Perfil, "id", [ParaMentorado]>;
      turmas: Tabela<Turma, "nome">;
      mentorados: Tabela<Mentorado, "nome_agencia">;
      motivos_perda: Tabela<ListaFixa, "nome">;
      origens_lead: Tabela<ListaFixa, "nome">;
      pilares_biblioteca: Tabela<ListaFixa, "nome">;
      modelos: Tabela<Modelo, "tipo" | "nome">;
      leads: Tabela<Lead, "nome", [ParaMentorado, ParaPerfil<"responsavel_id">]>;
      documentos_venda: Tabela<DocumentoVenda, "nome" | "tipo", [ParaPerfil<"atualizado_por">]>;
      financeiro: Tabela<Financeiro, "mentorado_id", [ParaMentorado]>;
      parcelas: Tabela<Parcela, "financeiro_id" | "numero" | "valor" | "vencimento", [ParaFinanceiro]>;
      marketing_conteudos: Tabela<MarketingConteudo, "titulo", [ParaPerfil<"responsavel_id">]>;
      onboarding_itens: Tabela<OnboardingItem, "mentorado_id" | "titulo", [ParaMentorado]>;
      biblioteca_itens: Tabela<BibliotecaItem, "titulo">;
      diagnosticos: Tabela<Diagnostico, "mentorado_id", [ParaMentorado]>;
      plano_itens: Tabela<PlanoItem, "mentorado_id" | "mes" | "titulo", [ParaMentorado]>;
      reunioes: Tabela<Reuniao, "mentorado_id" | "data", [ParaMentorado]>;
      tarefas: Tabela<Tarefa, "titulo", [ParaMentorado, ParaPerfil<"responsavel_id">]>;
      indicadores: Tabela<Indicador, "mentorado_id" | "periodo", [ParaMentorado]>;
      acessos: Tabela<Acesso, "mentorado_id" | "item", [ParaMentorado]>;
      notas_internas: Tabela<NotaInterna, "mentorado_id" | "texto", [ParaMentorado, ParaPerfil<"autor_id">]>;
      arquivos: Tabela<Arquivo, "mentorado_id" | "nome" | "arquivo_path", [ParaMentorado]>;
      pos_mentoria: Tabela<PosMentoria, "mentorado_id", [ParaMentorado]>;
    };
    Views: Record<string, never>;
    Functions: {
      meu_perfil: { Args: Record<string, never>; Returns: PerfilUsuario };
      meu_mentorado_id: { Args: Record<string, never>; Returns: string | null };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      converter_lead_em_mentorado: { Args: { p_lead_id: string }; Returns: string };
      gerar_plano_do_modelo: {
        Args: { p_mentorado_id: string; p_modelo_id?: string | null };
        Returns: number;
      };
      desativar_mentorado: { Args: { p_mentorado_id: string }; Returns: undefined };
      semana_atual: { Args: { p_mentorado_id: string }; Returns: number };
    };
    Enums: {
      perfil_usuario: PerfilUsuario;
      status_lead: StatusLead;
      forma_pagamento: FormaPagamento;
      status_parcela: StatusParcela;
      status_marketing: StatusMarketing;
      formato_marketing: FormatoMarketing;
      tipo_material: TipoMaterial;
      status_tarefa: StatusTarefa;
      lado_tarefa: LadoTarefa;
      status_plano: StatusPlano;
      periodo_indicador: PeriodoIndicador;
      sinal_saude: SinalSaude;
      status_continuacao: StatusContinuacao;
      tipo_modelo: TipoModelo;
    };
    CompositeTypes: Record<string, never>;
  };
}
