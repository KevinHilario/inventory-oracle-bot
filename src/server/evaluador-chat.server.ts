/**
 * Agente Coordinador del evaluador (Claude + tool use).
 * Interpreta en lenguaje natural los cambios que pide el docente, los aplica a la
 * configuración y decide si se ejecuta la evaluación. También responde preguntas
 * sobre la última evaluación usando su evidencia.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-5-5";
const SECCIONES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"] as const;

export const configSchema = z.object({
  url: z.string().url().max(300),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/).max(120),
  consultas: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  usuarios: z.number().int().min(1).max(20),
  pesos: z.record(z.enum(SECCIONES), z.number().min(0).max(10)),
  instruccion: z.string().max(1500),
});
export type ConfigChat = z.infer<typeof configSchema>;

const cambiosSchema = configSchema.partial().extend({
  pesos: z.record(z.enum(SECCIONES), z.number().min(0).max(10)).optional(),
});

const TOOLS: Anthropic.Tool[] = [
  {
    name: "configurar_evaluacion",
    description:
      "Cambia la configuración de la próxima evaluación. Envía SOLO los campos que el docente pidió cambiar. 'consultas' es la lista completa final (máx. 8). 'pesos' acepta solo las secciones a modificar (0 a 10 puntos). 'instruccion' reemplaza las instrucciones adicionales para el juez.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        url: { type: "string", description: "URL pública a evaluar" },
        repo: { type: "string", description: "Repositorio de GitHub usuario/repo" },
        consultas: { type: "array", items: { type: "string" }, maxItems: 8 },
        usuarios: { type: "integer", minimum: 1, maximum: 20 },
        pesos: {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(SECCIONES.map((s) => [s, { type: "number" }])),
        },
        instruccion: { type: "string" },
      },
    },
  },
  {
    name: "ejecutar_evaluacion",
    description:
      "Inicia la evaluación con la configuración vigente (Inspector, Verificador y Juez). Úsala cuando el docente pida ejecutar, evaluar, probar o volver a correr.",
    input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
];

export interface MensajeChat {
  rol: "docente" | "agente";
  texto: string;
}

export async function conversar(
  mensajes: MensajeChat[],
  config: ConfigChat,
  contextoEvaluacion: unknown,
) {
  if (!process.env["ANTHROPIC_API_KEY"]) throw new Error("Falta ANTHROPIC_API_KEY en el servidor.");
  const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  let vigente: ConfigChat = structuredClone(config);
  const cambiados = new Set<string>();
  let ejecutar = false;

  const system = `Eres el Agente Coordinador del Agente Evaluador de Intelli-Stock (proyecto final de Tecnologías Emergentes).
El docente te escribe cambios para la evaluación o preguntas sobre el resultado.
- Para cambiar algo usa configurar_evaluacion con solo los campos pedidos. Para agregar o quitar consultas, envía la lista completa final.
- Si el docente pide ejecutar/evaluar/probar, usa ejecutar_evaluacion (después de configurar, si también pidió cambios).
- Si solo pide cambios sin ejecutar, aplícalos y pregunta si quiere ejecutar.
- Para preguntas sobre el resultado, responde con la evidencia de la última evaluación; no inventes datos.
- Responde en español, breve (máximo 80 palabras), en texto plano sin Markdown. Indica qué cambió.

Configuración vigente:
${JSON.stringify(vigente, null, 2)}

Última evaluación (resumen):
${contextoEvaluacion ? JSON.stringify(contextoEvaluacion).slice(0, 12000) : "(todavía no hay evaluaciones)"}`;

  const msgs: Anthropic.MessageParam[] = mensajes.slice(-12).map((m) => ({
    role: m.rol === "docente" ? "user" : "assistant",
    content: m.texto,
  }));
  if (msgs[0]?.role !== "user") msgs.shift();

  let respuesta = "";
  for (let i = 0; i < 4; i++) {
    const r = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      system,
      tools: TOOLS,
      messages: msgs,
    });
    const usos = r.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (r.stop_reason !== "tool_use" || !usos.length) {
      respuesta = r.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      break;
    }
    msgs.push({ role: "assistant", content: r.content });
    msgs.push({
      role: "user",
      content: usos.map((u): Anthropic.ToolResultBlockParam => {
        if (u.name === "ejecutar_evaluacion") {
          ejecutar = true;
          return { type: "tool_result", tool_use_id: u.id, content: "La evaluación se inicia en la interfaz al terminar tu respuesta." };
        }
        const p = cambiosSchema.safeParse(u.input);
        if (!p.success) {
          return {
            type: "tool_result",
            tool_use_id: u.id,
            is_error: true,
            content: "Cambios inválidos: " + p.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
          };
        }
        const { pesos, ...resto } = p.data;
        const nueva = { ...vigente, ...resto, pesos: { ...vigente.pesos, ...(pesos ?? {}) } };
        const ok = configSchema.safeParse(nueva);
        if (!ok.success) {
          return { type: "tool_result", tool_use_id: u.id, is_error: true, content: "La configuración resultante no es válida." };
        }
        for (const k of Object.keys(resto)) cambiados.add(k);
        for (const k of Object.keys(pesos ?? {})) cambiados.add(`pesos.${k}`);
        vigente = ok.data;
        return { type: "tool_result", tool_use_id: u.id, content: "Configuración actualizada: " + JSON.stringify(vigente) };
      }),
    });
  }
  return { respuesta: respuesta || "Listo.", config: vigente, cambiados: [...cambiados], ejecutar };
}
