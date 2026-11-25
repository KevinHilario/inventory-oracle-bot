/**
 * Agente Evaluador (sistema multiagente) ejecutado desde la propia aplicación.
 *
 *  1. Inspector de repositorio → revisa el repositorio de GitHub (archivos, secretos, pruebas).
 *  2. Verificador en línea     → prueba la URL: HTTPS, /health/ready, concurrencia,
 *                                 consultas al Supervisor y trazas.
 *  3. Juez de rúbrica (Claude) → contrasta el cuestionario con la evidencia y pone la nota.
 *
 * Emite eventos de progreso para mostrarlos en vivo en la interfaz.
 */
import Anthropic from "@anthropic-ai/sdk";
import { insertEvaluacion, readUltimoCuestionario } from "./database.server";
import { EVALUADOR_TOKEN } from "./evaluador-token.server";

const MODEL = process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-5-5";

export type AgenteEval = "inspector" | "verificador" | "juez";
export type EventoEval =
  | { tipo: "agente"; agente: AgenteEval; estado: "inicio" | "fin" }
  | { tipo: "log"; agente: AgenteEval; texto: string; ok?: boolean | undefined }
  | { tipo: "resultado"; evaluacion: Record<string, unknown> }
  | { tipo: "error"; texto: string };

export interface ConfigEval {
  url: string;
  repo: string;
  consultas: string[];
  usuarios: number;
  pesos: Record<string, number>;
  instruccion: string;
  cuestionario?: string | undefined;
}

export const SECCIONES: Record<string, string> = {
  A: "Datos del integrante y del equipo",
  B: "Problema, usuario e innovación",
  C: "Requerimientos funcionales",
  D: "Requerimientos técnicos y no funcionales",
  E: "Arquitectura multiagente (eliminatorio)",
  F: "Modelos de IA, datos y costos",
  G: "Despliegue en línea",
  H: "Seguridad y ética",
  I: "Pruebas y evidencias",
  J: "Gestión del proyecto",
  K: "Declaración final",
};

async function medir(url: string, init?: RequestInit) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
    const texto = await res.text();
    let json: any;
    try {
      json = JSON.parse(texto);
    } catch {
      json = undefined;
    }
    return { status: res.status, ms: Math.round(performance.now() - t0), json };
  } catch (e) {
    return { status: 0, ms: Math.round(performance.now() - t0), json: undefined, error: String(e) };
  }
}

// ------------------------------------------------------------ Agente 1
async function inspector(repo: string, emit: (e: EventoEval) => void) {
  const log = (texto: string, ok?: boolean) => emit({ tipo: "log", agente: "inspector", texto, ok });
  const token = process.env["GITHUB_TOKEN"];
  const arbol = await medir(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, {
    headers: {
      "User-Agent": "intelli-stock-evaluador",
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  let rutas: string[];
  if (arbol.status === 200 && Array.isArray(arbol.json?.tree)) {
    rutas = arbol.json.tree.map((t: { path: string }) => t.path);
    log(`Repositorio ${repo} accesible: ${rutas.length} archivos (API de GitHub).`, true);
  } else {
    // Respaldo sin límite de la API: comprueba rutas conocidas en raw.githubusercontent.com
    const conocidas = [
      "Dockerfile", "compose.yaml", ".env.example", "README.md", ".gitignore", "DESPLIEGUE.md",
      "migrations/001_products_decisions.sql", "migrations/002_agent_runs.sql",
      "migrations/003_evaluaciones.sql", "scripts/db.mjs", "scripts/evaluar.mjs",
      "tests/api.test.mjs", "tests/inventory.test.mjs", "tests/same-origin.test.mjs",
      "tests/e2e/persistence.spec.mjs", "src/server/agents.server.ts",
      "src/server/database.server.ts", "src/server/evaluador.server.ts",
      "src/server/same-origin.server.ts", "src/server/decisions-http.server.ts",
      "src/routes/api.supervisor.ts", "src/routes/api.agent-runs.ts",
      "src/routes/api.evaluador.ts", "src/routes/health.ready.ts", "src/routes/api.decisions.ts",
    ];
    const existe = await Promise.all(
      conocidas.map(async (r) => {
        const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/${r}`, {
          method: "HEAD",
          signal: AbortSignal.timeout(15_000),
        }).catch(() => null);
        return res?.ok ? r : null;
      }),
    );
    rutas = existe.filter((r): r is string => r !== null);
    if (!rutas.length) {
      log(`No se pudo leer el repositorio ${repo} en GitHub (API HTTP ${arbol.status}).`, false);
      return { repo, accesible: false };
    }
    log(
      `Repositorio ${repo} accesible: ${rutas.length} de ${conocidas.length} archivos clave encontrados (API de GitHub limitada, se usó raw.githubusercontent.com).`,
      true,
    );
  }

  const requeridos = [
    "Dockerfile",
    "compose.yaml",
    ".env.example",
    "README.md",
    "migrations",
    "tests",
    "src/server/agents.server.ts",
  ];
  const archivos = Object.fromEntries(
    requeridos.map((f) => [f, rutas.some((r) => r === f || r.startsWith(f + "/"))]),
  );
  const presentes = Object.values(archivos).filter(Boolean).length;
  log(`Archivos obligatorios: ${presentes}/${requeridos.length}.`, presentes === requeridos.length);

  const pruebas = rutas.filter((r) => /^tests\/.*\.(test|spec)\.m?[jt]s$/.test(r));
  log(`Pruebas automatizadas: ${pruebas.length} archivos (${pruebas.join(", ")}).`, pruebas.length > 0);

  const candidatos = rutas
    .filter(
      (r) =>
        /^(src\/server|src\/routes|scripts|migrations)\/.+\.(ts|tsx|mjs|sql)$/.test(r) ||
        ["compose.yaml", "Dockerfile", ".env.example", "README.md", ".gitignore"].includes(r),
    )
    .slice(0, 45);
  const patrones = [/sk-ant-[A-Za-z0-9_-]{20,}/, /postgres(?:ql)?:\/\/[^:\s/]+:(?!clave@)[^@\s]{6,}@/];
  const secretos: string[] = [];
  let gitignoreEnv = false;
  await Promise.all(
    candidatos.map(async (r) => {
      const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/${r}`, {
        signal: AbortSignal.timeout(20_000),
      }).catch(() => null);
      if (!res?.ok) return;
      const t = await res.text();
      if (r === ".gitignore") gitignoreEnv = /^\.env$/m.test(t);
      if (patrones.some((p) => p.test(t))) secretos.push(r);
    }),
  );
  log(
    secretos.length
      ? `⚠ Posibles secretos en: ${secretos.join(", ")}`
      : `Sin claves ni contraseñas en ${candidatos.length} archivos revisados.`,
    secretos.length === 0,
  );
  log(`.env ignorado por git: ${gitignoreEnv ? "sí" : "no"}.`, gitignoreEnv);
  return { repo, accesible: true, archivos, pruebas, secretosEncontrados: secretos, envIgnorado: gitignoreEnv };
}

// ------------------------------------------------------------ Agente 2
async function verificador(cfg: ConfigEval, emit: (e: EventoEval) => void) {
  const log = (texto: string, ok?: boolean) =>
    emit({ tipo: "log", agente: "verificador", texto, ok });
  const base = cfg.url.replace(/\/$/, "");
  const https = base.startsWith("https://");
  const home = await medir(base + "/");
  log(`GET / → ${home.status} en ${home.ms} ms · HTTPS: ${https ? "sí" : "no"}.`, home.status === 200 && https);
  const salud = await medir(base + "/health/ready");
  log(`GET /health/ready → ${salud.status} ${JSON.stringify(salud.json ?? {})}.`, salud.status === 200);

  const conc = await Promise.all(Array.from({ length: cfg.usuarios }, () => medir(base + "/")));
  const concurrencia = {
    usuarios: cfg.usuarios,
    promedioMs: Math.round(conc.reduce((s, r) => s + r.ms, 0) / conc.length),
    maxMs: Math.max(...conc.map((r) => r.ms)),
    errores: conc.filter((r) => r.status !== 200).length,
    origen:
      "Medido por el propio servidor de la aplicación contra su URL pública mientras ejecuta la evaluación; en una instancia gratuita puede ser más lento que una medición externa.",
  };
  log(
    `${cfg.usuarios} usuarios simultáneos → prom ${concurrencia.promedioMs} ms, máx ${concurrencia.maxMs} ms, errores ${concurrencia.errores}.`,
    concurrencia.errores === 0,
  );

  const casos = [];
  for (const consulta of cfg.consultas) {
    const r = await medir(base + "/api/supervisor", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base, "x-evaluador": EVALUADOR_TOKEN },
      body: JSON.stringify({ consulta }),
    });
    const pasos: { agent: string }[] = r.json?.pasos ?? [];
    const agentes = [...new Set(pasos.map((p) => p.agent))];
    const especialistas = agentes.filter((a) => a !== "supervisor");
    const caso = {
      consulta,
      status: r.status,
      ms: r.ms,
      modo: r.json?.modo ?? "sin respuesta",
      agentes,
      colaboracion: especialistas.length >= 2,
      runId: r.json?.runId,
      tokens: (r.json?.inputTokens ?? 0) + (r.json?.outputTokens ?? 0),
      respuesta: String(r.json?.respuesta ?? r.json?.error ?? "").slice(0, 500),
    };
    casos.push(caso);
    log(
      `"${consulta}" → ${caso.modo}, ${caso.ms} ms, agentes: ${especialistas.join(", ") || "ninguno"}${caso.runId ? ` (traza #${caso.runId})` : ""}.`,
      caso.status === 200 && caso.modo === "llm",
    );
  }
  const trazas = await medir(base + "/api/agent-runs?limit=3");
  const nTrazas = Array.isArray(trazas.json) ? trazas.json.length : 0;
  log(`GET /api/agent-runs → ${trazas.status}, ${nTrazas} trazas recientes.`, trazas.status === 200 && nTrazas > 0);

  const llm = casos.filter((c) => c.modo === "llm");
  return {
    url: base,
    https,
    home: { status: home.status, ms: home.ms },
    salud: { status: salud.status, cuerpo: salud.json },
    concurrencia,
    casos,
    resumen: {
      consultasLLM: `${llm.length}/${casos.length}`,
      conColaboracion: casos.filter((c) => c.colaboracion).length,
      latenciaPromedioMs: llm.length ? Math.round(llm.reduce((s, c) => s + c.ms, 0) / llm.length) : null,
      tokensPromedio: llm.length ? Math.round(llm.reduce((s, c) => s + c.tokens, 0) / llm.length) : null,
    },
    trazaEjemplo: Array.isArray(trazas.json) ? trazas.json[0] : undefined,
  };
}

// ------------------------------------------------------------ Agente 3
async function juez(
  cfg: ConfigEval,
  cuestionario: string,
  evidencia: unknown,
  emit: (e: EventoEval) => void,
) {
  const log = (texto: string, ok?: boolean) => emit({ tipo: "log", agente: "juez", texto, ok });
  if (!process.env["ANTHROPIC_API_KEY"]) {
    log("Sin ANTHROPIC_API_KEY: no se puede calificar.", false);
    return null;
  }
  const total = Object.values(cfg.pesos).reduce((s, n) => s + n, 0);
  const pesos = Object.entries(cfg.pesos)
    .map(([s, p]) => `${s}. ${SECCIONES[s]}: ${p} puntos`)
    .join("\n");
  log(`Calificando con ${MODEL} sobre ${total} puntos…`);
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["secciones", "eliminatorioCumplido", "notaTotal", "resumen", "mejorasPrioritarias"],
    properties: {
      secciones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["seccion", "puntaje", "maximo", "justificacion", "faltantes"],
          properties: {
            seccion: { type: "string" },
            puntaje: { type: "number" },
            maximo: { type: "number" },
            justificacion: { type: "string" },
            faltantes: { type: "array", items: { type: "string" } },
          },
        },
      },
      eliminatorioCumplido: { type: "boolean" },
      notaTotal: { type: "number" },
      resumen: { type: "string" },
      mejorasPrioritarias: { type: "array", items: { type: "string" } },
    },
  } as const;

  const client = new Anthropic({ timeout: 120_000, maxRetries: 1 });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system: `Eres el docente evaluador del curso Tecnologías Emergentes. Calificas el proyecto final (sistema multiagente) sobre ${total} puntos con esta distribución:
${pesos}

Reglas de la rúbrica (vienen del propio cuestionario):
- Cada afirmación técnica debe estar respaldada por evidencia verificable; una respuesta sin evidencia se considera no cumplida.
- Requisito eliminatorio: sistema multiagente funcionando y demostrable en una URL pública HTTPS. Si no se cumple, la nota máxima es la mitad del total.
- Penaliza contradicciones entre lo que dice el cuestionario y lo que muestra la evidencia en línea.
- Usa en "seccion" el formato "A. Nombre". Sé estricto pero justo. Escribe en español; en "faltantes" pon acciones concretas.
- "resumen": 2 o 3 frases con el veredicto general.${cfg.instruccion ? `\n\nInstrucciones adicionales del docente:\n${cfg.instruccion}` : ""}`,
    messages: [
      {
        role: "user",
        content: `<cuestionario_respondido>\n${cuestionario || "(no se adjuntó cuestionario)"}\n</cuestionario_respondido>\n\n<evidencia_automatica>\n${JSON.stringify(evidencia, null, 2)}\n</evidencia_automatica>\n\nCalifica cada sección y da la nota total sobre ${total}.`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("El juez rechazó la solicitud.");
  const texto = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const veredicto = JSON.parse(texto);
  log(
    `Nota: ${veredicto.notaTotal}/${total} · eliminatorio ${veredicto.eliminatorioCumplido ? "cumplido" : "NO cumplido"}.`,
    veredicto.eliminatorioCumplido,
  );
  return {
    ...veredicto,
    total,
    modelo: MODEL,
    tokens: { entrada: response.usage.input_tokens, salida: response.usage.output_tokens },
  };
}

// ------------------------------------------------------------ Orquestador
export async function ejecutarEvaluacion(cfg: ConfigEval, emit: (e: EventoEval) => void) {
  const inicio = Date.now();
  const cuestionario = cfg.cuestionario?.trim() || (await readUltimoCuestionario());

  emit({ tipo: "agente", agente: "inspector", estado: "inicio" });
  const repositorio = await inspector(cfg.repo, emit);
  emit({ tipo: "agente", agente: "inspector", estado: "fin" });

  emit({ tipo: "agente", agente: "verificador", estado: "inicio" });
  const enLinea = await verificador(cfg, emit);
  emit({ tipo: "agente", agente: "verificador", estado: "fin" });

  emit({ tipo: "agente", agente: "juez", estado: "inicio" });
  emit({
    tipo: "log",
    agente: "juez",
    texto: cuestionario
      ? `Cuestionario: ${cuestionario.length.toLocaleString("es-PE")} caracteres${cfg.cuestionario ? " (adjuntado)" : " (último cargado)"}.`
      : "No hay cuestionario cargado: se califica solo con la evidencia.",
    ok: Boolean(cuestionario),
  });
  const evidencia = { repositorio, enLinea };
  const veredicto = await juez(cfg, cuestionario, evidencia, emit);
  emit({ tipo: "agente", agente: "juez", estado: "fin" });

  const configuracion = { ...cfg, cuestionario: undefined, duracionMs: Date.now() - inicio };
  const guardada = await insertEvaluacion({
    url: cfg.url,
    nota: veredicto?.notaTotal ?? null,
    eliminatorio: veredicto?.eliminatorioCumplido ?? null,
    configuracion,
    evidencia,
    veredicto,
    cuestionario,
  });
  emit({
    tipo: "resultado",
    evaluacion: { ...guardada, url: cfg.url, configuracion, evidencia, veredicto },
  });
}
