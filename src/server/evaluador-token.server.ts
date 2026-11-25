import { randomUUID } from "node:crypto";

/**
 * Token interno del proceso: el Agente Evaluador lo envía al llamar a /api/supervisor
 * de esta misma instancia para no consumir el límite por minuto de los usuarios.
 * Se genera al arrancar y nunca sale del servidor.
 */
export const EVALUADOR_TOKEN = randomUUID();
