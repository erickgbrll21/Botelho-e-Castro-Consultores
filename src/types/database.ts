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
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          created_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          razao_social: string
          cnpj: string
          dominio: string | null
          tipo_unidade: "Matriz" | "Filial" | null
          responsavel_fiscal: string | null
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
          regime_tributario: string | null
          contato_nome: string | null
          contato_telefone: string | null
          valor_contrato: number | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          razao_social: string
          cnpj: string
          dominio?: string | null
          tipo_unidade?: "Matriz" | "Filial" | null
          responsavel_fiscal?: string | null
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
          regime_tributario?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          valor_contrato?: number | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          razao_social?: string
          cnpj?: string
          dominio?: string | null
          tipo_unidade?: "Matriz" | "Filial" | null
          responsavel_fiscal?: string | null
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
          regime_tributario?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          valor_contrato?: number | null
          ativo?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
    }
  }
}

export type UserRole = "admin" | "user" | "diretor" | "financeiro"

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
