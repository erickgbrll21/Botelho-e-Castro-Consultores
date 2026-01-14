// Script para criar usuário admin via service role.
// Uso:
//   node scripts/create-admin.js admin@bcconsultores.adv.br 12345678 "Administrador" "Admin"

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Arquivo de env não encontrado: ${abs}`);
  }
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const val = rest.join("=");
    if (key && val !== undefined) {
      process.env[key.trim()] = val.trim();
    }
  }
}

async function main() {
  const [email, password, nome = "Administrador", cargo = "Admin"] =
    process.argv.slice(2);

  if (!email || !password) {
    console.error("Uso: node scripts/create-admin.js <email> <senha> [nome] [cargo]");
    process.exit(1);
  }

  loadEnv(path.join(__dirname, "..", ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Faltam variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, cargo, tipo_usuario: "admin" },
    app_metadata: { tipo_usuario: "admin" },
  });

  if (createError || !created.user?.id) {
    throw createError ?? new Error("Erro ao criar usuário.");
  }

  const userId = created.user.id;

  const { error: insertError } = await supabase.from("usuarios").insert({
    id: userId,
    nome,
    email,
    cargo,
    tipo_usuario: "admin",
    ativo: true,
  });

  if (insertError) {
    throw insertError;
  }

  console.log("Usuário admin criado com sucesso:", { userId, email, nome, cargo });
}

main().catch((err) => {
  console.error("Falha ao criar admin:", err);
  process.exit(1);
});
