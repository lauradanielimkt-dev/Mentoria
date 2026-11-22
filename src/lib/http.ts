import type { NextRequest } from "next/server";

/**
 * Origem pública da requisição (https://metodo.marmarisviagens.com.br).
 * Atrás do proxy do Railway, request.url aponta para o host interno
 * (localhost:8080); os cabeçalhos x-forwarded-* trazem o endereço real.
 */
export function origemPublica(request: NextRequest): string {
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return new URL(request.url).origin;
}
