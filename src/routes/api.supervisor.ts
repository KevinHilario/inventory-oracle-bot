import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isSameOrigin } from "../server/same-origin.server";

const body = z.object({
  consulta: z.string().trim().min(1).max(500),
  contextoSku: z.string().max(40).optional(),
});

// Límite por minuto y por IP (en memoria del servidor), además del tope diario.
const LIMITE_POR_MINUTO = Number(process.env["SUPERVISOR_RATE_PER_MIN"] ?? "10");
const ventanas = new Map<string, number[]>();
function superaLimite(request: Request): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const ahora = Date.now();
  const recientes = (ventanas.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  recientes.push(ahora);
  ventanas.set(ip, recientes);
  if (ventanas.size > 5000) ventanas.clear();
  return recientes.length > LIMITE_POR_MINUTO;
}

export const Route = createFileRoute("/api/supervisor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return Response.json({ error: "Origen de solicitud no permitido." }, { status: 403 });
        }
        if (superaLimite(request)) {
          return Response.json(
            { error: `Límite de ${LIMITE_POR_MINUTO} consultas por minuto. Espera un momento.` },
            { status: 429, headers: { "Retry-After": "60" } },
          );
        }
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "Consulta inválida (1 a 500 caracteres)." }, { status: 400 });
        }
        try {
          const { ejecutarSupervisor } = await import("../server/agents.server");
          const r = await ejecutarSupervisor(parsed.data.consulta, parsed.data.contextoSku);
          if (!r) return Response.json({ modo: "reglas" });
          return Response.json({ modo: "llm", ...r });
        } catch (error) {
          console.error("Supervisor LLM falló:", error);
          return Response.json({ modo: "reglas", error: "El LLM no respondió; se usaron reglas." });
        }
      },
    },
  },
});
