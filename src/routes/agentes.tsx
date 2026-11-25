import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Kpi, Panel, PanelHead, Tag } from "@/components/kit";
import { AGENTS, AGENT_BY_ID, type AgentId } from "@/lib/supervisor";
import { useInventory } from "@/lib/store";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/agentes")({
  head: () => ({
    meta: [
      { title: "Centro de Agentes IA | Intelli-Stock" },
      {
        name: "description",
        content:
          "Arquitectura multiagente en vivo: Supervisor, Analista de Ventas, Predictor de Demanda, Gestor de Inventario y Agente de Reposición con su registro de actividad.",
      },
      { property: "og:title", content: "Centro de Agentes IA | Intelli-Stock" },
      {
        property: "og:description",
        content: "Cómo el Supervisor coordina a los agentes especializados, paso a paso.",
      },
    ],
  }),
  component: Agentes,
});

const LOG_DEMO: { hora: string; agente: AgentId; texto: string }[] = [
  {
    hora: "19:42:03",
    agente: "supervisor",
    texto: 'Recibió consulta: "¿Qué productos debo reponer esta semana?"',
  },
  {
    hora: "19:42:04",
    agente: "ventas",
    texto: "Ejecutó consultar_ventas() y analizar_rotacion() sobre 30 SKUs.",
  },
  {
    hora: "19:42:09",
    agente: "predictor",
    texto: "Ejecutó predecir_demanda() con promedio ponderado y estacionalidad semanal, horizonte 30 días.",
  },
  {
    hora: "19:43:01",
    agente: "inventario",
    texto: "Ejecutó consultar_inventario(): stock, mínimo y cobertura.",
  },
  {
    hora: "19:43:12",
    agente: "predictor",
    texto: "Ejecutó calcular_riesgo_stock(): 12 SKUs en riesgo crítico.",
  },
  {
    hora: "19:43:20",
    agente: "reposicion",
    texto: "Ejecutó calcular_reposicion(): cantidades y momentos de pedido.",
  },
  {
    hora: "19:43:26",
    agente: "supervisor",
    texto: "Generó respuesta explicada y la envió al encargado de compras.",
  },
];

function Agentes() {
  const { METRICS, PRODUCTS, MODEL } = useInventory();
  const RESULTADOS: Record<AgentId, { tareas: number; resumen: string; ultima: string }> = {
    supervisor: {
      tareas: 128,
      resumen: `Consolidó ${METRICS.pedidosPendientes} recomendaciones de compra y las priorizó por riesgo.`,
      ultima: "hace 1 min",
    },
    ventas: {
      tareas: 342,
      resumen: `Analizó ${METRICS.ventas30.toLocaleString("es-PE")} unidades vendidas en 30 días sobre ${METRICS.totalSkus} SKUs.`,
      ultima: "hace 2 min",
    },
    predictor: {
      tareas: 210,
      resumen: `Forecast a 7/14/30 días con ${MODEL.precision}% de precisión (WAPE ${MODEL.wape}%).`,
      ultima: "hace 2 min",
    },
    inventario: {
      tareas: 415,
      resumen: `Detectó ${PRODUCTS.filter((p) => p.stock < p.stockMin).length} productos por debajo del stock mínimo.`,
      ultima: "hace 3 min",
    },
    reposicion: {
      tareas: 96,
      resumen: `Calculó ${METRICS.pedidosPendientes} pedidos por ${METRICS.costoPendiente.toLocaleString("es-PE")} soles.`,
      ultima: "hace 1 min",
    },
  };

  const { log } = useStore();
  const registro = log.length
    ? log.map((l) => ({ hora: l.hora, agente: l.agente, texto: l.texto }))
    : LOG_DEMO.slice().reverse();

  return (
    <AppShell
      title="Centro de Agentes IA"
      subtitle="Arquitectura multiagente coordinada por el Supervisor"
    >
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi
          label="Agentes activos"
          value={AGENTS.length}
          tone="good"
          hint="Supervisor + 4 especializados"
        />
        <Kpi
          label="Herramientas expuestas"
          value={7}
          tone="info"
          hint="Function calling autorizado"
          delay={40}
        />
        <Kpi
          label="Tareas ejecutadas hoy"
          value={Object.values(RESULTADOS).reduce((a, r) => a + r.tareas, 0)}
          delay={80}
        />
        <Kpi
          label="Compras automáticas"
          value="0"
          tone="warn"
          hint="Siempre requieren aprobación humana"
          delay={120}
        />
      </section>

      <Panel className="p-6" delay={60}>
        <h2 className="font-display font-semibold tracking-tight">Topología del sistema</h2>
        <p className="font-mono text-[11px] text-muted-foreground">
          USUARIO → SUPERVISOR → AGENTES ESPECIALIZADOS → RESULTADOS → SUPERVISOR → USUARIO
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="w-full max-w-sm rounded-xl border border-accent/40 bg-accent/10 p-4 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-lg bg-accent font-display font-bold text-accent-foreground">
              S
            </span>
            <p className="mt-2 font-display font-semibold tracking-tight text-accent">
              Agente Supervisor
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {AGENT_BY_ID.supervisor.responsabilidad}
            </p>
          </div>

          <div className="flex h-8 w-full items-center justify-center">
            <div className="h-full w-px bg-line" />
          </div>

          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {AGENTS.filter((a) => a.id !== "supervisor").map((a, i) => {
              const r = RESULTADOS[a.id];
              return (
                <div
                  key={a.id}
                  className="rise rounded-xl border border-line bg-surface-2 p-4"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-info/15 font-display font-bold text-info">
                      {a.inicial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[13px] font-semibold tracking-tight">
                        {a.corto}
                      </p>
                      <p className="flex items-center gap-1 font-mono text-[10px] text-good">
                        <span className="blink size-1.5 rounded-full bg-good" /> operativo
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
                    {a.responsabilidad}
                  </p>
                  <div className="mt-3 space-y-1 border-t border-line pt-3 font-mono text-[11px] text-muted-foreground">
                    <p>Última ejecución: {r.ultima}</p>
                    <p>Tareas realizadas: {r.tareas}</p>
                  </div>
                  <p className="mt-2 text-[12px] leading-snug text-foreground/80">{r.resumen}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.herramientas.map((h) => (
                      <Tag key={h} tone="muted">
                        {h}
                      </Tag>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" delay={100}>
          <PanelHead
            title="Registro de actividad"
            subtitle={
              log.length
                ? "Ejecuciones reales de esta sesión"
                : "Última ejecución registrada del sistema"
            }
          />
          <div className="max-h-[360px] divide-y divide-line/70 overflow-y-auto">
            {registro.map((l, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-2.5">
                <span className="font-mono text-[11px] text-muted-foreground">{l.hora}</span>
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-info/15 text-[10px] font-bold text-info">
                  {AGENT_BY_ID[l.agente].inicial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">
                    <span className="font-medium">{AGENT_BY_ID[l.agente].corto}</span> — {l.texto}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5" delay={140}>
          <h2 className="font-display font-semibold tracking-tight">Herramientas autorizadas</h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            Function calling con permisos acotados
          </p>
          <div className="mt-3 space-y-2">
            {[
              ["agente_ventas", "Ventas de 7 y 30 días, rotación y tendencia."],
              ["agente_predictor", "Demanda 7/14/30 días, riesgo y probabilidad de quiebre."],
              ["agente_inventario", "Stock, mínimo, máximo, cobertura y sobrestock."],
              ["agente_reposicion", "Consulta al Predictor y al Inventario, calcula la compra y razona la decisión con Claude."],
            ].map(([fn, desc]) => (
              <div key={fn} className="rounded-lg bg-surface-2 p-2.5">
                <p className="font-mono text-[12px] text-info">{fn}</p>
                <p className="text-[12px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <span className="text-warn">◆</span> Los agentes solo consultan datos. La ejecución de
            una compra está separada de la consulta y exige aprobación humana explícita.
          </p>
        </Panel>
      </section>
      <TrazasGuardadas />
    </AppShell>
  );
}

interface Traza {
  id: number;
  fecha: string;
  consulta: string;
  modelo: string;
  estado: string;
  duracionMs: number;
  inputTokens: number;
  outputTokens: number;
  respuesta: string;
  pasos: { agent: AgentId; texto: string; detalle: string; herramienta?: string }[];
}

/** Trazas persistidas en PostgreSQL (tabla agent_runs) de cada consulta al Supervisor. */
function TrazasGuardadas() {
  const [trazas, setTrazas] = useState<Traza[]>([]);
  const [abierta, setAbierta] = useState<number | null>(null);
  const cargar = () =>
    fetch("/api/agent-runs?limit=10")
      .then((r) => (r.ok ? r.json() : []))
      .then((t: Traza[]) => {
        setTrazas(t);
        setAbierta((a) => a ?? t[0]?.id ?? null);
      })
      .catch(() => undefined);
  useEffect(() => {
    void cargar();
  }, []);
  return (
    <Panel className="mt-4" delay={180}>
      <PanelHead
        title="Trazas guardadas de los agentes"
        subtitle="Tabla agent_runs en PostgreSQL · GET /api/agent-runs"
        right={
          <button
            onClick={() => void cargar()}
            className="rounded-lg border border-line px-2.5 py-1 text-[12px] hover:border-accent/50"
          >
            Actualizar
          </button>
        }
      />
      {trazas.length === 0 ? (
        <p className="p-5 text-[13px] text-muted-foreground">
          Aún no hay trazas. Haz una consulta al Supervisor.
        </p>
      ) : (
        <ul className="divide-y divide-line/70">
          {trazas.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setAbierta(abierta === t.id ? null : t.id)}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-[13px] hover:bg-surface-2"
              >
                <span className="font-mono text-muted-foreground">#{t.id}</span>
                <span className="flex-1 truncate">{t.consulta}</span>
                <span className="hidden text-[12px] text-muted-foreground md:inline">
                  {new Date(t.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <Tag tone={t.estado === "ok" ? "good" : "warn"}>
                  {(t.duracionMs / 1000).toFixed(1)} s · {t.inputTokens + t.outputTokens} tok
                </Tag>
              </button>
              {abierta === t.id && (
                <div className="space-y-2 px-5 pb-4">
                  {t.pasos.map((p, i) => (
                    <div key={i} className="flex gap-2.5 text-[12px]">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-info/15 text-[10px] font-bold text-info">
                        {AGENT_BY_ID[p.agent]?.inicial ?? "?"}
                      </span>
                      <div className="min-w-0">
                        <p>
                          <span className="font-medium">{AGENT_BY_ID[p.agent]?.corto ?? p.agent}</span>
                          {p.herramienta && (
                            <span className="ml-2 font-mono text-[11px] text-info">{p.herramienta}</span>
                          )}
                        </p>
                        <p className="text-muted-foreground">{p.detalle}</p>
                      </div>
                    </div>
                  ))}
                  <p className="whitespace-pre-line rounded-lg bg-surface-2 p-3 text-[12px]">
                    {t.respuesta}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">Modelo {t.modelo}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
