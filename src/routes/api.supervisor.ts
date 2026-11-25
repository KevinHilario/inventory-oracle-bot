import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isSameOrigin } from "../server/same-origin.server";

const body = z.object({
  consulta: z.string().trim().min(1).max(500),
  contextoSku: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/supervisor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return Response.json({ error: "Origen de solicitud no permitido." }, { status: 403 });
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
