import { createFileRoute } from "@tanstack/react-router";

/** Trazas de auditoría: últimas ejecuciones del Supervisor y sus agentes. */
export const Route = createFileRoute("/api/agent-runs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 20) || 20, 100);
        try {
          const { readAgentRuns } = await import("../server/database.server");
          return Response.json(await readAgentRuns(limit), {
            headers: { "Cache-Control": "no-store" },
          });
        } catch {
          return Response.json({ error: "No se pudieron leer las trazas." }, { status: 503 });
        }
      },
    },
  },
});
