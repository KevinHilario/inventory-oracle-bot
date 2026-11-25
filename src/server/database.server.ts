import pg from "pg";
import type { BaseProduct } from "../lib/inventory";
import type { Decision } from "../lib/decisions";

const common = { max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 };
// DATABASE_URL (p. ej. Neon, con sslmode=require) tiene prioridad sobre las variables PG*.
const pool = process.env["DATABASE_URL"]
  ? new pg.Pool({ connectionString: process.env["DATABASE_URL"], ...common })
  : new pg.Pool({
      host: process.env["PGHOST"] ?? "127.0.0.1",
      port: Number(process.env["PGPORT"] ?? "5433"),
      database: process.env["PGDATABASE"] ?? process.env["POSTGRES_DB"],
      user: process.env["PGUSER"] ?? process.env["POSTGRES_USER"],
      password: process.env["PGPASSWORD"] ?? process.env["POSTGRES_PASSWORD"],
      ...common,
    });
pool.on("error", () => console.error("Conexión PostgreSQL interrumpida."));
const productColumns = `sku, nombre, categoria, proveedor,
  precio_compra::float8 AS "precioCompra", precio_venta::float8 AS "precioVenta",
  stock, stock_min AS "stockMin", stock_max AS "stockMax", ventas7, ventas30,
  lead_time AS "leadTime", tendencia::float8 AS tendencia, estacionalidad`;
const decisionColumns = `id, sku, nombre, cantidad_sugerida AS "cantidadSugerida",
  cantidad_final AS "cantidadFinal", costo::float8 AS costo, estado, motivo,
  to_char(fecha AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fecha, usuario`;

export async function readProducts(): Promise<BaseProduct[]> {
  const { rows } = await pool.query<BaseProduct>(
    `SELECT ${productColumns} FROM products ORDER BY display_order, sku`,
  );
  if (!rows.length) throw new Error("El catálogo está vacío. Ejecuta la carga inicial.");
  return rows;
}
export async function readProduct(sku: string): Promise<BaseProduct | undefined> {
  const { rows } = await pool.query<BaseProduct>(
    `SELECT ${productColumns} FROM products WHERE sku = $1`,
    [sku],
  );
  return rows[0];
}
export async function readDecisions(): Promise<Decision[]> {
  return (
    await pool.query<Decision>(
      `SELECT ${decisionColumns} FROM decisions ORDER BY fecha DESC, created_order DESC`,
    )
  ).rows;
}
export async function insertDecisions(decisions: Decision[]): Promise<number> {
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query("BEGIN");
    for (const d of [...decisions].reverse()) {
      const result = await client.query(
        `INSERT INTO decisions
        (id,sku,nombre,cantidad_sugerida,cantidad_final,costo,estado,motivo,fecha,usuario)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [
          d.id,
          d.sku,
          d.nombre,
          d.cantidadSugerida,
          d.cantidadFinal,
          d.costo,
          d.estado,
          d.motivo,
          d.fecha,
          d.usuario,
        ],
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function checkDatabase() {
  await pool.query("SELECT sku FROM products LIMIT 1");
  await pool.query("SELECT id FROM decisions LIMIT 1");
  await pool.query("SELECT id FROM agent_runs LIMIT 1");
}

export interface AgentRunInput {
  consulta: string;
  modelo: string;
  estado: "ok" | "fallback" | "error";
  pasos: unknown[];
  respuesta: string;
  inputTokens: number;
  outputTokens: number;
  duracionMs: number;
}
export async function insertAgentRun(r: AgentRunInput): Promise<number> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO agent_runs
     (consulta, modelo, estado, pasos, respuesta, input_tokens, output_tokens, duracion_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      r.consulta,
      r.modelo,
      r.estado,
      JSON.stringify(r.pasos),
      r.respuesta,
      r.inputTokens,
      r.outputTokens,
      r.duracionMs,
    ],
  );
  return Number(rows[0]?.id);
}
export async function readAgentRuns(limit = 20) {
  return (
    await pool.query(
      `SELECT id::int AS id, created_at AS fecha, consulta, modelo, estado, pasos, respuesta,
        input_tokens AS "inputTokens", output_tokens AS "outputTokens", duracion_ms AS "duracionMs"
       FROM agent_runs ORDER BY id DESC LIMIT $1`,
      [limit],
    )
  ).rows;
}
export async function insertEvaluacion(e: {
  url: string;
  nota: number | null;
  eliminatorio: boolean | null;
  configuracion: unknown;
  evidencia: unknown;
  veredicto: unknown;
  cuestionario: string;
}): Promise<{ id: number; fecha: string }> {
  const { rows } = await pool.query<{ id: number; fecha: string }>(
    `INSERT INTO evaluaciones (url, nota, eliminatorio, configuracion, evidencia, veredicto, cuestionario)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id::int AS id, created_at AS fecha`,
    [
      e.url,
      e.nota,
      e.eliminatorio,
      JSON.stringify(e.configuracion),
      JSON.stringify(e.evidencia),
      e.veredicto === null ? null : JSON.stringify(e.veredicto),
      e.cuestionario,
    ],
  );
  return rows[0]!;
}
export async function readEvaluaciones(limit = 15) {
  return (
    await pool.query(
      `SELECT id::int AS id, created_at AS fecha, url, nota::float8 AS nota, eliminatorio,
        configuracion, evidencia, veredicto
       FROM evaluaciones ORDER BY id DESC LIMIT $1`,
      [limit],
    )
  ).rows;
}
export async function readUltimoCuestionario(): Promise<string> {
  const { rows } = await pool.query<{ cuestionario: string }>(
    `SELECT cuestionario FROM evaluaciones WHERE cuestionario <> '' ORDER BY id DESC LIMIT 1`,
  );
  return rows[0]?.cuestionario ?? "";
}
export async function countAgentRunsToday(): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT count(*) AS n FROM agent_runs WHERE estado = 'ok' AND created_at > now() - interval '1 day'`,
  );
  return Number(rows[0]?.n ?? 0);
}
