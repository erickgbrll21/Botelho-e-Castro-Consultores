"use server";

// Os tipos gerados do PostgREST desta versão do supabase-js resolvem para
// `never` com o Database do projeto; por isso as escritas usam `as any`, igual
// ao restante das server actions do painel.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { registrarLog } from "@/lib/logs";
import { messageFromSupabaseError } from "@/lib/supabase-errors";
import {
  assertGestorDemandas,
  isGestorDemandas,
} from "@/lib/demandas-access";
import { parseStatus, prazoFormularioParaISO } from "@/lib/demandas";
import {
  diffDemanda,
  registrarHistoricoDemanda,
} from "@/lib/demandas-historico";
import type { DemandaStatus } from "@/types/database";
import type { CurrentProfile } from "@/lib/auth";

type SupabaseCliente = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const LIMITE_TITULO = 180;
const LIMITE_PROTOCOLO = 60;
const LIMITE_TEXTO_LONGO = 4000;
const LIMITE_CAMINHO = 600;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textoObrigatorio(
  formData: FormData,
  campo: string,
  rotulo: string,
  limite: number
): string {
  const valor = String(formData.get(campo) ?? "").trim();
  if (!valor) {
    throw new Error(`${rotulo} é obrigatório.`);
  }
  return valor.slice(0, limite);
}

function textoOpcional(
  formData: FormData,
  campo: string,
  limite: number
): string | null {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor ? valor.slice(0, limite) : null;
}

function idObrigatorio(
  formData: FormData,
  campo: string,
  rotulo: string
): string {
  const valor = String(formData.get(campo) ?? "").trim();
  if (!valor) {
    throw new Error(`${rotulo} é obrigatório.`);
  }
  return valor;
}

function prazoValidado(formData: FormData): string {
  const iso = prazoFormularioParaISO(formData.get("prazo_final"));
  if (!iso) {
    throw new Error("Informe um prazo final válido.");
  }
  return iso;
}

function revalidarModulo(demandaId?: string) {
  revalidatePath("/demandas");
  revalidatePath("/demandas/todas");
  revalidatePath("/demandas/minhas");
  if (demandaId) {
    revalidatePath(`/demandas/${demandaId}`);
  }
}

type DemandaAtual = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_servico_id: string | null;
  responsavel_id: string | null;
  criado_por: string | null;
  prazo_final: string;
  protocolo: string | null;
  status: DemandaStatus;
  url_pasta: string | null;
  caminho_pasta: string | null;
  observacoes: string | null;
};

/**
 * Carrega a demanda e valida o acesso de escrita no servidor.
 * Gestor: qualquer demanda. Usuário comum: apenas quando é o responsável.
 */
async function carregarDemandaParaEdicao(
  demandaId: string,
  opts: { exigirGestor?: boolean } = {}
): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  profile: CurrentProfile;
  demanda: DemandaAtual;
  gestor: boolean;
}> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("Sessão expirada. Entre novamente para continuar.");
  }

  const gestor = isGestorDemandas(profile.tipo_usuario);
  if (opts.exigirGestor && !gestor) {
    throw new Error("Ação permitida apenas para gestores de demandas.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await (supabase.from("demandas") as any)
    .select(
      "id, titulo, descricao, tipo_servico_id, responsavel_id, criado_por, prazo_final, protocolo, status, url_pasta, caminho_pasta, observacoes"
    )
    .eq("id", demandaId)
    .maybeSingle();

  if (error) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível carregar a demanda.")
    );
  }
  if (!data) {
    throw new Error("Demanda não encontrada ou sem permissão de acesso.");
  }

  const demanda = data as DemandaAtual;

  if (!gestor && demanda.responsavel_id !== profile.id) {
    throw new Error("Você só pode alterar demandas atribuídas a você.");
  }

  return { supabase, profile, demanda, gestor };
}

async function dicionarios(supabase: SupabaseCliente) {
  const [{ data: usuarios }, { data: tipos }] = await Promise.all([
    (supabase.from("usuarios") as any).select("id, nome"),
    (supabase.from("tipos_servico") as any).select("id, nome"),
  ]);

  return {
    nomesUsuarios: new Map<string, string>(
      ((usuarios ?? []) as { id: string; nome: string }[]).map((u) => [
        u.id,
        u.nome,
      ])
    ),
    nomesTipos: new Map<string, string>(
      ((tipos ?? []) as { id: string; nome: string }[]).map((t) => [
        t.id,
        t.nome,
      ])
    ),
  };
}

/**
 * Campos de conclusão coerentes com o status (o banco também valida via
 * constraint demandas_conclusao_coerente). Concluir registra data/hora e autor;
 * reabrir limpa os dois.
 */
function camposConclusao(
  status: DemandaStatus,
  anterior: DemandaStatus,
  usuarioId: string
): Record<string, string | null> {
  if (status === "concluida") {
    if (anterior === "concluida") return {};
    return {
      concluida_em: new Date().toISOString(),
      concluida_por: usuarioId,
    };
  }
  return { concluida_em: null, concluida_por: null };
}

// ---------------------------------------------------------------------------
// Demandas — gestor
// ---------------------------------------------------------------------------

export async function criarDemanda(formData: FormData) {
  const profile = await assertGestorDemandas();
  const supabase = await createSupabaseServerClient();

  const titulo = textoObrigatorio(formData, "titulo", "O título", LIMITE_TITULO);
  const tipo_servico_id = idObrigatorio(
    formData,
    "tipo_servico_id",
    "O tipo de serviço"
  );
  const responsavel_id = idObrigatorio(
    formData,
    "responsavel_id",
    "O responsável"
  );
  const prazo_final = prazoValidado(formData);
  const descricao = textoOpcional(formData, "descricao", LIMITE_TEXTO_LONGO);
  const observacoes = textoOpcional(formData, "observacoes", LIMITE_TEXTO_LONGO);
  const caminho_pasta = textoOpcional(formData, "caminho_pasta", LIMITE_CAMINHO);

  const { data, error } = await (supabase.from("demandas") as any)
    .insert({
      titulo,
      descricao,
      tipo_servico_id,
      responsavel_id,
      criado_por: profile.id,
      prazo_final,
      status: "pendente",
      caminho_pasta,
      observacoes,
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível criar a demanda.")
    );
  }

  const { nomesUsuarios, nomesTipos } = await dicionarios(supabase);

  await registrarHistoricoDemanda(
    supabase,
    data.id,
    { id: profile.id, nome: profile.nome },
    [
      { acao: "Criação", campo: "Demanda", valorNovo: titulo },
      {
        acao: "Responsável atribuído",
        campo: "Responsável",
        valorNovo: nomesUsuarios.get(responsavel_id) ?? "Usuário",
      },
    ]
  );

  await registrarLog("Criação de Demanda", {
    demanda_id: data.id,
    titulo,
    tipo_servico: nomesTipos.get(tipo_servico_id) ?? tipo_servico_id,
    responsavel: nomesUsuarios.get(responsavel_id) ?? responsavel_id,
  });

  revalidarModulo(data.id);
  redirect(`/demandas/${data.id}?criada=1`);
}

export async function atualizarDemanda(formData: FormData) {
  const demandaId = idObrigatorio(formData, "demanda_id", "A demanda");
  const { supabase, profile, demanda } = await carregarDemandaParaEdicao(
    demandaId,
    { exigirGestor: true }
  );

  const titulo = textoObrigatorio(formData, "titulo", "O título", LIMITE_TITULO);
  const tipo_servico_id = idObrigatorio(
    formData,
    "tipo_servico_id",
    "O tipo de serviço"
  );
  const responsavel_id = idObrigatorio(
    formData,
    "responsavel_id",
    "O responsável"
  );
  const prazo_final = prazoValidado(formData);
  const descricao = textoOpcional(formData, "descricao", LIMITE_TEXTO_LONGO);
  const observacoes = textoOpcional(formData, "observacoes", LIMITE_TEXTO_LONGO);
  const caminho_pasta = textoOpcional(formData, "caminho_pasta", LIMITE_CAMINHO);
  const status = parseStatus(formData.get("status")) ?? demanda.status;

  // Gestor pode confirmar direto na edição; usuário nunca chega aqui (exigirGestor).
  const { error } = await (supabase.from("demandas") as any)
    .update({
      titulo,
      descricao,
      tipo_servico_id,
      responsavel_id,
      prazo_final,
      observacoes,
      caminho_pasta,
      status,
      ...camposConclusao(status, demanda.status, profile.id),
    })
    .eq("id", demandaId);

  if (error) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível salvar a demanda.")
    );
  }

  const dicts = await dicionarios(supabase);
  const entradas = diffDemanda(
    demanda,
    {
      titulo,
      descricao,
      tipo_servico_id,
      responsavel_id,
      prazo_final,
      observacoes,
      caminho_pasta,
      status,
    },
    dicts
  );

  await registrarHistoricoDemanda(
    supabase,
    demandaId,
    { id: profile.id, nome: profile.nome },
    entradas
  );

  await registrarLog("Edição de Demanda", {
    demanda_id: demandaId,
    titulo,
    alteracoes: entradas.map((e) => e.campo).filter(Boolean),
  });

  revalidarModulo(demandaId);
  redirect(`/demandas/${demandaId}?salvo=1`);
}

export async function alterarResponsavel(formData: FormData) {
  const demandaId = idObrigatorio(formData, "demanda_id", "A demanda");
  const { supabase, profile, demanda } = await carregarDemandaParaEdicao(
    demandaId,
    { exigirGestor: true }
  );

  const responsavel_id = idObrigatorio(
    formData,
    "responsavel_id",
    "O responsável"
  );

  if (responsavel_id === demanda.responsavel_id) {
    redirect(`/demandas/${demandaId}`);
  }

  const { error } = await (supabase.from("demandas") as any)
    .update({ responsavel_id })
    .eq("id", demandaId);

  if (error) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível alterar o responsável.")
    );
  }

  const dicts = await dicionarios(supabase);
  await registrarHistoricoDemanda(
    supabase,
    demandaId,
    { id: profile.id, nome: profile.nome },
    diffDemanda(demanda, { responsavel_id }, dicts)
  );

  await registrarLog("Alteração de Responsável da Demanda", {
    demanda_id: demandaId,
    de: demanda.responsavel_id,
    para: responsavel_id,
  });

  revalidarModulo(demandaId);
  redirect(`/demandas/${demandaId}?responsavel=1`);
}

export async function excluirDemanda(formData: FormData) {
  const demandaId = idObrigatorio(formData, "demanda_id", "A demanda");
  const { supabase, demanda } = await carregarDemandaParaEdicao(demandaId, {
    exigirGestor: true,
  });

  const { error } = await (supabase.from("demandas") as any)
    .delete()
    .eq("id", demandaId);

  if (error) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível excluir a demanda.")
    );
  }

  await registrarLog("Exclusão de Demanda", {
    demanda_id: demandaId,
    titulo: demanda.titulo,
  });

  revalidarModulo();
  redirect("/demandas/todas?excluida=1");
}

// ---------------------------------------------------------------------------
// Demandas — responsável (ou gestor)
// ---------------------------------------------------------------------------

export async function atualizarStatus(formData: FormData) {
  const demandaId = idObrigatorio(formData, "demanda_id", "A demanda");
  const { supabase, profile, demanda, gestor } =
    await carregarDemandaParaEdicao(demandaId);

  const status = parseStatus(formData.get("status"));
  if (!status) {
    throw new Error("Status inválido.");
  }

  // Usuário comum não pode gravar a confirmação final do gestor.
  if (!gestor && status === "concluida") {
    throw new Error(
      "A confirmação final da demanda é exclusiva do gestor. Use “Marcar como concluída” para enviar à confirmação."
    );
  }

  if (status === demanda.status) {
    revalidarModulo(demandaId);
    return;
  }

  const { error } = await (supabase.from("demandas") as any)
    .update({
      status,
      ...camposConclusao(status, demanda.status, profile.id),
    })
    .eq("id", demandaId);

  if (error) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível atualizar o status.")
    );
  }

  await registrarHistoricoDemanda(
    supabase,
    demandaId,
    { id: profile.id, nome: profile.nome },
    diffDemanda(demanda, { status })
  );

  await registrarLog("Alteração de Status da Demanda", {
    demanda_id: demandaId,
    de: demanda.status,
    para: status,
  });

  revalidarModulo(demandaId);
}

/** Usuário (ou gestor no papel de responsável) marca a demanda como concluída. */
export async function concluirDemanda(formData: FormData) {
  const dados = new FormData();
  dados.set("demanda_id", String(formData.get("demanda_id") ?? ""));
  dados.set("status", "aguardando_confirmacao");
  await atualizarStatus(dados);
}

/** Confirmação final exclusiva do gestor. */
export async function confirmarConclusaoDemanda(formData: FormData) {
  const demandaId = idObrigatorio(formData, "demanda_id", "A demanda");
  const { supabase, profile, demanda } = await carregarDemandaParaEdicao(
    demandaId,
    { exigirGestor: true }
  );

  if (demanda.status === "concluida") {
    revalidarModulo(demandaId);
    return;
  }

  const status: DemandaStatus = "concluida";
  const { error } = await (supabase.from("demandas") as any)
    .update({
      status,
      ...camposConclusao(status, demanda.status, profile.id),
    })
    .eq("id", demandaId);

  if (error) {
    throw new Error(
      messageFromSupabaseError(
        error,
        "Não foi possível confirmar a conclusão da demanda."
      )
    );
  }

  await registrarHistoricoDemanda(
    supabase,
    demandaId,
    { id: profile.id, nome: profile.nome },
    diffDemanda(demanda, { status })
  );

  await registrarLog("Confirmação de Conclusão da Demanda", {
    demanda_id: demandaId,
    de: demanda.status,
    para: status,
  });

  revalidarModulo(demandaId);
}

export async function reabrirDemanda(formData: FormData) {
  const dados = new FormData();
  dados.set("demanda_id", String(formData.get("demanda_id") ?? ""));
  dados.set("status", "em_andamento");
  await atualizarStatus(dados);
}

export async function atualizarProtocolo(formData: FormData) {
  const demandaId = idObrigatorio(formData, "demanda_id", "A demanda");
  const { supabase, profile, demanda } =
    await carregarDemandaParaEdicao(demandaId);

  // Protocolo é preenchido apenas pelo responsável da demanda.
  if (demanda.responsavel_id !== profile.id) {
    throw new Error(
      "Apenas o responsável pela demanda pode informar o protocolo."
    );
  }

  const protocolo = textoOpcional(formData, "protocolo", LIMITE_PROTOCOLO);

  if ((protocolo ?? "") === (demanda.protocolo ?? "")) {
    revalidarModulo(demandaId);
    return;
  }

  const { error } = await (supabase.from("demandas") as any)
    .update({ protocolo })
    .eq("id", demandaId);

  if (error) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível salvar o protocolo.")
    );
  }

  await registrarHistoricoDemanda(
    supabase,
    demandaId,
    { id: profile.id, nome: profile.nome },
    diffDemanda(demanda, { protocolo })
  );

  revalidarModulo(demandaId);
}

export async function atualizarObservacoes(formData: FormData) {
  const demandaId = idObrigatorio(formData, "demanda_id", "A demanda");
  const { supabase, profile, demanda } =
    await carregarDemandaParaEdicao(demandaId);

  const observacoes = textoOpcional(
    formData,
    "observacoes",
    LIMITE_TEXTO_LONGO
  );

  if ((observacoes ?? "") === (demanda.observacoes ?? "")) {
    revalidarModulo(demandaId);
    return;
  }

  const { error } = await (supabase.from("demandas") as any)
    .update({ observacoes })
    .eq("id", demandaId);

  if (error) {
    throw new Error(
      messageFromSupabaseError(error, "Não foi possível salvar as observações.")
    );
  }

  await registrarHistoricoDemanda(
    supabase,
    demandaId,
    { id: profile.id, nome: profile.nome },
    diffDemanda(demanda, { observacoes })
  );

  revalidarModulo(demandaId);
}

// ---------------------------------------------------------------------------
// Tipos de serviço
// ---------------------------------------------------------------------------

export async function criarTipoServico(formData: FormData) {
  const profile = await assertGestorDemandas();
  const supabase = await createSupabaseServerClient();

  const nome = textoObrigatorio(formData, "nome", "O nome do tipo de serviço", 120);

  const { error } = await (supabase.from("tipos_servico") as any).insert({
    nome,
  });

  if (error) {
    const duplicado =
      error.code === "23505" ||
      /duplicate key|unique constraint/i.test(error.message ?? "");
    throw new Error(
      duplicado
        ? "Já existe um tipo de serviço com este nome."
        : messageFromSupabaseError(
            error,
            "Não foi possível criar o tipo de serviço."
          )
    );
  }

  await registrarLog("Criação de Tipo de Serviço", { nome, actor: profile.email });

  revalidatePath("/demandas/tipos-servico");
  revalidarModulo();
  redirect("/demandas/tipos-servico?criado=1");
}

export async function alternarTipoServico(formData: FormData) {
  const profile = await assertGestorDemandas();
  const supabase = await createSupabaseServerClient();

  const id = idObrigatorio(formData, "tipo_id", "O tipo de serviço");
  const ativar = String(formData.get("ativar") ?? "") === "1";

  const { error } = await (supabase.from("tipos_servico") as any)
    .update({ ativo: ativar })
    .eq("id", id);

  if (error) {
    throw new Error(
      messageFromSupabaseError(
        error,
        "Não foi possível alterar o tipo de serviço."
      )
    );
  }

  await registrarLog("Edição de Tipo de Serviço", {
    tipo_id: id,
    ativo: ativar,
    actor: profile.email,
  });

  revalidatePath("/demandas/tipos-servico");
  revalidarModulo();
}

export async function renomearTipoServico(formData: FormData) {
  const profile = await assertGestorDemandas();
  const supabase = await createSupabaseServerClient();

  const id = idObrigatorio(formData, "tipo_id", "O tipo de serviço");
  const nome = textoObrigatorio(formData, "nome", "O nome do tipo de serviço", 120);

  const { error } = await (supabase.from("tipos_servico") as any)
    .update({ nome })
    .eq("id", id);

  if (error) {
    const duplicado =
      error.code === "23505" ||
      /duplicate key|unique constraint/i.test(error.message ?? "");
    throw new Error(
      duplicado
        ? "Já existe um tipo de serviço com este nome."
        : messageFromSupabaseError(
            error,
            "Não foi possível renomear o tipo de serviço."
          )
    );
  }

  await registrarLog("Edição de Tipo de Serviço", {
    tipo_id: id,
    nome,
    actor: profile.email,
  });

  revalidatePath("/demandas/tipos-servico");
  revalidarModulo();
  redirect("/demandas/tipos-servico?renomeado=1");
}
