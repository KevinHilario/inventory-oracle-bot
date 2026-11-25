import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isSameOrigin } from "../server/same-origin.server";

const body = z.object({
  mensajes: z
    .array(z.object({ rol: z.enum(["docente", "agente"]), texto: z.string().min(1).max(2000) }))
    .min(1)
    .max(30),
  config: z.unknown(),
  evaluacion: z.unknown().optional(),
});

const ventanas = new Map<string, number[]>();

export const Route = createFileRoute("/api/evaluador-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return Response.json({ error: "Origen de solicitud no permitido." }, { status: 403 });
        }
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
        const ahora = Date.now();
        const recientes = (ventanas.get(ip) ?? []).filter((t) => ahora - t < 60_000);
        recientes.push(ahora);
        ventanas.set(ip, recientes);
        if (recientes.length > 15) {
          return Response.json({ error: "Demasiados mensajes por minuto." }, { status: 429 });
        }
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Mensaje inválido." }, { status: 400 });
        const { conversar, configSchema } = await import("../server/evaluador-chat.server");
        const config = configSchema.safeParse(parsed.data.config);
        if (!config.success) {
          return Response.json({ error: "La configuración actual no es válida." }, { status: 400 });
        }
        try {
          return Response.json(
            await conversar(parsed.data.mensajes, config.data, parsed.data.evaluacion),
          );
        } catch (error) {
          console.error("Coordinador falló:", error);
          return Response.json({ error: "El coordinador no respondió. Intenta de nuevo." }, { status: 502 });
        }
      },
    },
  },
});
