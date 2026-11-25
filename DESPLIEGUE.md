# Despliegue en línea y Agente Evaluador

## Supervisor multiagente con Claude

`POST /api/supervisor` recibe la consulta. El Agente Supervisor (Claude, `ANTHROPIC_MODEL`,
por defecto `claude-opus-5-5`) decide qué agentes llamar mediante *tool use*:
`agente_ventas`, `agente_predictor`, `agente_inventario` y `agente_reposicion`.
Cada agente calcula con los datos de PostgreSQL (fórmulas de `src/lib/inventory.ts`),
así las cifras no las inventa el modelo.

Controles: máximo 6 iteraciones, 60 s por consulta, consultas de 1 a 500 caracteres,
tope diario `SUPERVISOR_DAILY_LIMIT`, verificación de origen y solo herramientas de lectura:
ninguna compra se ejecuta sin la aprobación del comprador en la interfaz.
Sin `ANTHROPIC_API_KEY`, o si la API falla, el panel responde con las reglas anteriores.

Cada ejecución queda en la tabla `agent_runs` (consulta, pasos de cada agente, herramientas,
entradas, respuesta, tokens y duración) y se puede auditar en `GET /api/agent-runs`.

## Render + Neon

1. **Neon:** crea un proyecto y copia la cadena de conexión **directa** (sin `-pooler`),
   con `?sslmode=require`.
2. **Migraciones** (una vez, desde este equipo, en PowerShell):

   ```powershell
   $env:DATABASE_URL = "postgresql://...neon.tech/neondb?sslmode=require"
   npm.cmd run db:setup
   Remove-Item Env:DATABASE_URL
   ```

3. **Render:** New → Web Service → repositorio de GitHub → Runtime **Docker**.
   - Variables: `DATABASE_URL` (la de Neon), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL=claude-opus-5-5`,
     `PORT=3000`.
   - Health Check Path: `/health/ready`.
4. Al terminar, comprueba `https://<tu-servicio>.onrender.com/health/ready` → `{"status":"ready"}`.

## Agente Evaluador

```powershell
npm.cmd run evaluar -- --url https://<tu-servicio>.onrender.com
```

Usa tres agentes: **Inspector de repositorio** (archivos obligatorios, secretos, pruebas),
**Verificador en línea** (HTTPS, `/health/ready`, 10 usuarios simultáneos, 6 consultas al
Supervisor, trazas) y **Juez de rúbrica** (Claude: contrasta el cuestionario `.docx` con la
evidencia y pone la nota sobre 20 por sección A–K). El reporte queda en `evaluacion/reporte.md`.
