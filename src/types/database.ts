export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          cargo: string | null
          tipo_usuario: UserRole
          created_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          cargo?: string | null
          tipo_usuario: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          cargo?: string | null
          tipo_usuario?: UserRole
          created_at?: string
        }
      }
      grupos_economicos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          valor_contrato: number | null
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          valor_contrato?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          valor_contrato?: number | null
          created_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          razao_social: string
          cnpj: string
          tipo_pessoa: "pj" | "pf"
          email: string | null
          dominio: string | null
          tipo_unidade: "Matriz" | "Filial" | null
          identificacao_filial?: string | null
          responsavel_fiscal: string | null
          cep: string | null
          logradouro: string | null
          bairro: string | null
          complemento: string | null
          cidade: string | null
          estado: string | null
          atividade: "Serviço" | "Comércio" | "Indústria" | "Ambos" | null
          constituicao: boolean | null
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          grupo_economico: string | null
          grupo_id: string | null
          socio_responsavel_pj: string | null
          capital_social: number | null
          data_abertura_cliente: string | null
          data_entrada_contabilidade: string | null
          data_saida: string | null
          regime_tributario: string | null
          contato_nome: string | null
          contato_telefone: string | null
          contato_celular: string | null
          valor_contrato: number | null
          cobranca_por_grupo: boolean
          ativo: boolean
          situacao_empresa?: "ativa" | "paralisada" | "desativada"
          created_at: string
        }
        Insert: {
          id?: string
          razao_social: string
          cnpj: string
          dominio?: string | null
          tipo_unidade?: "Matriz" | "Filial" | null
          identificacao_filial?: string | null
          responsavel_fiscal?: string | null
          cep?: string | null
          logradouro?: string | null
          bairro?: string | null
          complemento?: string | null
          cidade?: string | null
          estado?: string | null
          atividade?: "Serviço" | "Comércio" | "Indústria" | "Ambos" | null
          constituicao?: boolean | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          grupo_economico?: string | null
          grupo_id?: string | null
          socio_responsavel_pj?: string | null
          capital_social?: number | null
          data_abertura_cliente?: string | null
          data_entrada_contabilidade?: string | null
          data_saida?: string | null
          regime_tributario?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          contato_celular?: string | null
          tipo_pessoa?: "pj" | "pf"
          email?: string | null
          valor_contrato?: number | null
          cobranca_por_grupo?: boolean
          ativo?: boolean
          situacao_empresa?: "ativa" | "paralisada" | "desativada"
          created_at?: string
        }
        Update: {
          id?: string
          razao_social?: string
          cnpj?: string
          dominio?: string | null
          tipo_unidade?: "Matriz" | "Filial" | null
          identificacao_filial?: string | null
          responsavel_fiscal?: string | null
          cep?: string | null
          logradouro?: string | null
          bairro?: string | null
          complemento?: string | null
          cidade?: string | null
          estado?: string | null
          atividade?: "Serviço" | "Comércio" | "Indústria" | "Ambos" | null
          constituicao?: boolean | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          grupo_economico?: string | null
          grupo_id?: string | null
          socio_responsavel_pj?: string | null
          capital_social?: number | null
          data_abertura_cliente?: string | null
          data_entrada_contabilidade?: string | null
          data_saida?: string | null
          regime_tributario?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          contato_celular?: string | null
          tipo_pessoa?: "pj" | "pf"
          email?: string | null
          valor_contrato?: number | null
          cobranca_por_grupo?: boolean
          ativo?: boolean
          situacao_empresa?: "ativa" | "paralisada" | "desativada"
          created_at?: string
        }
      }
      responsaveis_internos: {
        Row: {
          id: string
          cliente_id: string
          responsavel_comercial: string | null
          responsavel_contabil: string | null
          responsavel_juridico: string | null
          responsavel_planejamento_tributario: string | null
          responsavel_dp: string | null
          responsavel_financeiro: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          responsavel_comercial?: string | null
          responsavel_contabil?: string | null
          responsavel_juridico?: string | null
          responsavel_planejamento_tributario?: string | null
          responsavel_dp?: string | null
          responsavel_financeiro?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          responsavel_comercial?: string | null
          responsavel_contabil?: string | null
          responsavel_juridico?: string | null
          responsavel_planejamento_tributario?: string | null
          responsavel_dp?: string | null
          responsavel_financeiro?: string | null
          created_at?: string
        }
      }
      servicos_contratados: {
        Row: {
          id: string
          cliente_id: string
          contabil_fiscal: boolean
          contabil_contabilidade: boolean
          contabil_dp: boolean
          contabil_pericia: boolean
          contabil_legalizacao: boolean
          juridico_civel: boolean
          juridico_trabalhista: boolean
          juridico_licitacao: boolean
          juridico_penal: boolean
          juridico_empresarial: boolean
          planejamento_societario_tributario: boolean
          bpo_financeiro: boolean
          valor_bpo_financeiro: number | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          contabil_fiscal?: boolean
          contabil_contabilidade?: boolean
          contabil_dp?: boolean
          contabil_pericia?: boolean
          contabil_legalizacao?: boolean
          juridico_civel?: boolean
          juridico_trabalhista?: boolean
          juridico_licitacao?: boolean
          juridico_penal?: boolean
          juridico_empresarial?: boolean
          planejamento_societario_tributario?: boolean
          bpo_financeiro?: boolean
          valor_bpo_financeiro?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          contabil_fiscal?: boolean
          contabil_contabilidade?: boolean
          contabil_dp?: boolean
          contabil_pericia?: boolean
          contabil_legalizacao?: boolean
          juridico_civel?: boolean
          juridico_trabalhista?: boolean
          juridico_licitacao?: boolean
          juridico_penal?: boolean
          juridico_empresarial?: boolean
          planejamento_societario_tributario?: boolean
          bpo_financeiro?: boolean
          valor_bpo_financeiro?: number | null
          created_at?: string
        }
      }
      quadro_socios: {
        Row: {
          id: string
          cliente_id: string
          nome_socio: string
          percentual_participacao: number
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          nome_socio: string
          percentual_participacao: number
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          nome_socio?: string
          percentual_participacao?: number
          created_at?: string
        }
      }
      quadro_socios_grupo: {
        Row: {
          id: string
          grupo_id: string
          nome_socio: string
          cpf: string | null
          email: string | null
          telefone: string | null
          percentual_participacao: number | null
          created_at: string
        }
        Insert: {
          id?: string
          grupo_id: string
          nome_socio: string
          cpf?: string | null
          email?: string | null
          telefone?: string | null
          percentual_participacao?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          grupo_id?: string
          nome_socio?: string
          cpf?: string | null
          email?: string | null
          telefone?: string | null
          percentual_participacao?: number | null
          created_at?: string
        }
      }
      tipos_servico: {
        Row: {
          id: string
          nome: string
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      demandas: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          tipo_servico_id: string | null
          responsavel_id: string | null
          criado_por: string | null
          prazo_final: string
          protocolo: string | null
          status: DemandaStatus
          url_pasta: string | null
          caminho_pasta: string | null
          observacoes: string | null
          cnpj: string | null
          empresa_nome: string | null
          empresa_fantasia: string | null
          empresa_situacao: string | null
          empresa_cidade: string | null
          empresa_uf: string | null
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          tipo_servico_id?: string | null
          responsavel_id?: string | null
          criado_por?: string | null
          prazo_final: string
          protocolo?: string | null
          status?: DemandaStatus
          url_pasta?: string | null
          caminho_pasta?: string | null
          observacoes?: string | null
          cnpj?: string | null
          empresa_nome?: string | null
          empresa_fantasia?: string | null
          empresa_situacao?: string | null
          empresa_cidade?: string | null
          empresa_uf?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descricao?: string | null
          tipo_servico_id?: string | null
          responsavel_id?: string | null
          criado_por?: string | null
          prazo_final?: string
          protocolo?: string | null
          status?: DemandaStatus
          url_pasta?: string | null
          caminho_pasta?: string | null
          observacoes?: string | null
          cnpj?: string | null
          empresa_nome?: string | null
          empresa_fantasia?: string | null
          empresa_situacao?: string | null
          empresa_cidade?: string | null
          empresa_uf?: string | null
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      historico_demandas: {
        Row: {
          id: string
          demanda_id: string
          usuario_id: string | null
          usuario_nome: string | null
          acao: string
          campo_alterado: string | null
          valor_anterior: string | null
          valor_novo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          demanda_id: string
          usuario_id?: string | null
          usuario_nome?: string | null
          acao: string
          campo_alterado?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          demanda_id?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          acao?: string
          campo_alterado?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          created_at?: string
        }
      }
      logs_sistema: {
        Row: {
          id: string
          usuario_id: string
          usuario_nome: string
          acao: string
          detalhes: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          usuario_nome: string
          acao: string
          detalhes?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          usuario_nome?: string
          acao?: string
          detalhes?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      demandas_view: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          tipo_servico_id: string | null
          tipo_servico_nome: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          criado_por: string | null
          criado_por_nome: string | null
          prazo_final: string
          protocolo: string | null
          status: DemandaStatus
          url_pasta: string | null
          caminho_pasta: string | null
          observacoes: string | null
          cnpj: string | null
          empresa_nome: string | null
          empresa_fantasia: string | null
          empresa_situacao: string | null
          empresa_cidade: string | null
          empresa_uf: string | null
          concluida_em: string | null
          concluida_por: string | null
          concluida_por_nome: string | null
          created_at: string
          updated_at: string
          atrasada: boolean
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      demanda_status: DemandaStatus
    }
  }
}

export type UserRole =
  | "admin"
  | "user"
  | "diretor"
  | "financeiro"
  | "controladoria"

export type DemandaStatus =
  | "pendente"
  | "em_andamento"
  | "aguardando_confirmacao"
  | "concluida"

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
