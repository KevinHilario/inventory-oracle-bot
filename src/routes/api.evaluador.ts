import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isSameOrigin } from "../server/same-origin.server";

const seccion = z.number().min(0).max(10);
const configSchema = z.object({
  url: z.string().url().max(300),
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Formato usuario/repositorio")
    .max(120),
  consultas: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  usuarios: z.number().int().min(1).max(20),
  pesos: z.object({
    A: seccion,
    B: seccion,
    C: seccion,
    D: seccion,
    E: seccion,
    F: seccion,
    G: seccion,
    H: seccion,
    I: seccion,
    J: seccion,
    K: seccion,
  }),
  instruccion: z.string().max(1500),
  cuestionario: z.string().max(200_000).optional(),
});

let enCurso = false;

export const Route = createFileRoute("/api/evaluador")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { readEvaluaciones } = await import("../server/database.server");
          return Response.json(await readEvaluaciones(15), {
            headers: { "Cache-Control": "no-store" },
          });
        } catch {
          return Response.json({ error: "No se pudieron leer las evaluaciones." }, { status: 503 });
        }
      },
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) {
          return Response.json({ error: "Origen de solicitud no permitido." }, { status: 403 });
        }
        const parsed = configSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json(
            { error: "Configuración inválida: " + parsed.error.issues.map((i) => i.message).join("; ") },
            { status: 400 },
          );
        }
        if (enCurso) {
          return Response.json(
            { error: "Ya hay una evaluación en curso. Espera a que termine." },
            { status: 409 },
          );
        }
        enCurso = true;
        const { ejecutarEvaluacion } = await import("../server/evaluador.server");
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const emit = (e: unknown) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
            try {
              await ejecutarEvaluacion(parsed.data, emit);
            } catch (error) {
              console.error("Evaluación falló:", error);
              emit({
                tipo: "error",
                texto: error instanceof Error ? error.message : "Error desconocido",
              });
            } finally {
              enCurso = false;
              controller.close();
            }
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
