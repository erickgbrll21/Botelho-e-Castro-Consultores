export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "user";

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nome: string;
          email: string;
          cargo: string | null;
          tipo_usuario: UserRole;
          ativo: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          cargo?: string | null;
          tipo_usuario?: UserRole;
          ativo?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
      };
      clientes: {
        Row: {
          id: string;
          razao_social: string;
          cnpj: string;
          dominio: string | null;
          grupo_economico: string | null;
          grupo_id: string | null;
          tipo_unidade: "Matriz" | "Filial" | null;
          responsavel_fiscal: string | null;
          cidade: string | null;
          estado: string | null;
          atividade: "Serviço" | "Comércio" | "Ambos" | null;
          constituicao: boolean | null;
          inscricao_estadual: string | null;
          inscricao_municipal: string | null;
          socio_responsavel_pj: string | null;
          capital_social: number | null;
          data_abertura_cliente: string | null;
          data_entrada_contabilidade: string | null;
          regime_tributario: string | null;
          processos_ativos: number | null;
          contato_nome: string | null;
          contato_telefone: string | null;
          created_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["clientes"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
      };
      grupos_economicos: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["grupos_economicos"]["Insert"]>;
      };
      quadro_socios: {
        Row: {
          id: string;
          cliente_id: string | null;
          nome_socio: string;
          percentual_participacao: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["quadro_socios"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["quadro_socios"]["Insert"]>;
      };
      responsaveis_internos: {
        Row: {
          id: string;
          cliente_id: string | null;
          responsavel_comercial: string | null;
          responsavel_contabil: string | null;
          responsavel_juridico: string | null;
          responsavel_planejamento_tributario: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["responsaveis_internos"]["Row"],
          "id"
        > & {
          id?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["responsaveis_internos"]["Insert"]
        >;
      };
      servicos_contratados: {
        Row: {
          id: string;
          cliente_id: string | null;
          contabilidade: boolean | null;
          juridico: boolean | null;
          planejamento_tributario: boolean | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["servicos_contratados"]["Row"],
          "id"
        > & {
          id?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["servicos_contratados"]["Insert"]
        >;
      };
      cliente_usuarios: {
        Row: {
          id: string;
          cliente_id: string;
          usuario_id: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cliente_usuarios"]["Row"], "id"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cliente_usuarios"]["Insert"]>;
      };
    };
    Functions: {
      auth_is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      auth_has_cliente_access: {
        Args: { cliente_id: string };
        Returns: boolean;
      };
    };
  };
}

export type Tables<
  T extends keyof Database["public"]["Tables"] = keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Row"];

export type TablesInsert<
  T extends keyof Database["public"]["Tables"] = keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Insert"];
