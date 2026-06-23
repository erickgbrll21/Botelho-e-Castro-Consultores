import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV !== "production";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// O Next injeta scripts inline de hidratação/streaming (dev e produção), por
// isso `script-src` precisa de 'unsafe-inline'. Em dev, o Turbopack/HMR também
// usa eval e websocket. As demais diretivas mantêm a proteção forte
// (clickjacking, exfiltração, base-uri, etc.).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co https://*.supabase.in https://brasilapi.com.br https://receitaws.com.br https://publica.cnpj.ws https://api-publica.datajud.cnj.jus.br https://generativelanguage.googleapis.com${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const hstsHeaders =
  process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : [];

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      tailwindcss: path.join(projectRoot, "node_modules/tailwindcss"),
      "@tailwindcss/postcss": path.join(
        projectRoot,
        "node_modules/@tailwindcss/postcss"
      ),
    },
  },
  experimental: {
    optimizePackageImports: ["@heroicons/react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...hstsHeaders],
      },
    ];
  },
};

export default nextConfig;
