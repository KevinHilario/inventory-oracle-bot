/**
 * Comprueba que una petición de escritura venga de la propia aplicación.
 * Detrás de un proxy HTTPS (Render, Caddy) el servidor recibe http:// internamente,
 * así que se compara solo el host del Origin con el host público de la petición.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const publicHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    new URL(request.url).host;
  return originHost === publicHost;
}
