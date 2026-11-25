/**
 * Pruebas de aceptación de los requerimientos RF-06, RF-07, RF-08 y RF-09
 * contra la aplicación en marcha (interfaz con Playwright + API).
 *
 *   BASE_URL=https://inventory-oracle-bot.onrender.com PW_CHANNEL=msedge npm run test:rf
 *
 * PW_CHANNEL: navegador instalado ("msedge" o "chrome"); si se omite usa el de Playwright.
 * Por defecto NO escribe en la base: la creación de una decisión (RF-06) solo corre
 * con ALLOW_WRITES=1 y deja un registro marcado como "Prueba automática".
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ESCRIBIR = process.env.ALLOW_WRITES === "1";

let browser;
before(async () => {
  browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
});
after(async () => browser?.close());

async function textoDe(ruta, preparar) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  try {
    await page.goto(BASE + ruta, { waitUntil: "networkidle", timeout: 120_000 });
    if (preparar) await preparar(page);
    return (await page.locator("body").innerText()).replace(/\s+/g, " ");
  } finally {
    await page.close();
  }
}
const api = (ruta, init = {}) =>
  fetch(BASE + ruta, {
    ...init,
    headers: { "Content-Type": "application/json", Origin: BASE, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
const decisiones = async () => (await api("/api/decisions")).json();

// ---------------------------------------------------------------- RF-06
test("RF-06: las decisiones se leen de PostgreSQL con estado válido", async () => {
  const lista = await decisiones();
  assert.ok(Array.isArray(lista));
  for (const d of lista) {
    assert.ok(["aprobado", "modificado", "pospuesto", "descartado"].includes(d.estado));
    assert.ok(d.id && d.sku && d.fecha && d.usuario);
  }
});

test("RF-06: el Historial muestra las mismas decisiones que la base", async () => {
  const lista = await decisiones();
  const texto = await textoDe("/historial");
  assert.match(texto, /Registro cronológico/);
  assert.match(texto, new RegExp(`Decisiones registradas ${lista.length}\\b`));
  if (lista[0]) assert.ok(texto.includes(lista[0].nombre), "la decisión más reciente aparece en el Historial");
});

test("RF-06: rechaza una decisión con estado inventado (400, no se guarda)", async () => {
  const antes = (await decisiones()).length;
  const r = await api("/api/decisions", {
    method: "POST",
    body: JSON.stringify({
      id: randomUUID(), sku: "SKU-1042", nombre: "Café de Grano 500g",
      cantidadSugerida: 210, cantidadFinal: 210, costo: 3885, estado: "inventado", motivo: "x",
    }),
  });
  assert.equal(r.status, 400);
  assert.equal((await decisiones()).length, antes);
});

test("RF-06: aprobar una compra la guarda y aparece en el Historial (ALLOW_WRITES=1)", { skip: !ESCRIBIR }, async () => {
  const id = randomUUID();
  const r = await api("/api/decisions", {
    method: "POST",
    body: JSON.stringify({
      id, sku: "SKU-1042", nombre: "Café de Grano 500g",
      cantidadSugerida: 210, cantidadFinal: 180, costo: 3330, estado: "modificado",
      motivo: "Prueba automática RF-06",
    }),
  });
  assert.equal(r.status, 200);
  const guardada = (await decisiones()).find((d) => d.id === id);
  assert.ok(guardada, "la decisión quedó en PostgreSQL");
  assert.equal(guardada.estado, "modificado");
  assert.equal(guardada.cantidadFinal, 180);
});

// ---------------------------------------------------------------- RF-07
test('RF-07: "¿Qué pasa si no repongo café?" → se agota en ≈3 días, 94 % de quiebre', async () => {
  const t = await textoDe("/simulador");
  assert.match(t, /¿Qué pasa si no repongo Café de Grano 500g\?/);
  assert.match(t, /3 días hasta quiebre/);
  assert.match(t, /94% probabilidad de quiebre/);
  assert.match(t, /se agotan en 3 días/);
});

test('RF-07: "¿Qué pasa si compro 100 unidades?" recalcula cobertura y capital', async () => {
  const t = await textoDe("/simulador", async (page) => {
    await page.locator("#sim-qty").fill("100");
    await page.waitForTimeout(500);
  });
  assert.match(t, /¿Qué pasa si compro 100 unidades\?/);
  assert.match(t, /S\/ 1,850 capital invertido/);
  assert.match(t, /12\.1 nueva cobertura/);
  assert.match(t, /146 stock resultante/);
});

// ---------------------------------------------------------------- RF-08
test("RF-08: Analítica muestra la rotación por categoría y el Centro de Inteligencia la de los productos", async () => {
  const analitica = await textoDe("/analitica");
  assert.match(analitica, /Rotación media 3\.95 ×\/mes/);
  assert.match(analitica, /Rotación por categoría/);
  assert.match(analitica, /Productos en alza 9/);
  const inicio = await textoDe("/");
  assert.match(inicio, /Productos por rotación/);
});

// ---------------------------------------------------------------- RF-09
test("RF-09: el reporte semanal resume riesgos y compras sobre los 30 SKUs", async () => {
  const t = await textoDe("/reportes");
  assert.match(t, /RESUMEN EJECUTIVO/i);
  assert.match(t, /Riesgos detectados 17/);
  assert.match(t, /15 críticos, 2 altos/);
  assert.match(t, /catálogo de 30 SKUs/);
  assert.match(t, /pendientes de aprobación humana/);
});

test("RF-09: importar un JSON válido ya existente no duplica decisiones", async (t) => {
  const lista = await decisiones();
  if (!lista.length) return t.skip("no hay decisiones para reimportar");
  const r = await api("/api/decisions/import", { method: "POST", body: JSON.stringify(lista) });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.inserted, 0, "ningún identificador repetido se inserta");
  assert.equal(j.decisions.length, lista.length);
});

test("RF-09: un lote con SKU desconocido se rechaza completo (400, sin importación parcial)", async (t) => {
  const lista = await decisiones();
  if (!lista.length) return t.skip("no hay decisiones de referencia");
  const antes = lista.length;
  const malo = { ...lista[0], id: randomUUID(), sku: "SKU-NO-EXISTE" };
  const bueno = { ...lista[0], id: randomUUID() };
  const r = await api("/api/decisions/import", { method: "POST", body: JSON.stringify([bueno, malo]) });
  assert.equal(r.status, 400);
  assert.equal((await decisiones()).length, antes, "el registro válido del lote tampoco se importó");
});

test("RF-09: un archivo que no es JSON válido se rechaza (400)", async () => {
  const r = await api("/api/decisions/import", { method: "POST", body: "{esto no es json" });
  assert.equal(r.status, 400);
});
