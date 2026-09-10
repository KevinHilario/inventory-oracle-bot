/**
 * Intelli-Stock — capa de datos simulada pero coherente.
 *
 * Todas las métricas derivadas (demanda prevista, cobertura, riesgo,
 * rotación, cantidad recomendada) se CALCULAN a partir de los datos base,
 * de modo que nunca se contradicen entre sí:
 *  - poco stock + alta demanda  => riesgo alto/crítico
 *  - mucho stock + baja demanda => sobrestock
 */

export type RiskLevel = "critico" | "alto" | "moderado" | "saludable";

export interface BaseProduct {
  sku: string;
  nombre: string;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMin: number;
  stockMax: number;
  ventas7: number;
  ventas30: number;
  leadTime: number;
  proveedor: string;
  /** Tendencia semanal de la demanda (-0.25 .. +0.35) */
  tendencia: number;
  estacionalidad: string;
}

export interface Product extends BaseProduct {
  demandaDiaria: number;
  demanda7: number;
  demanda14: number;
  demanda30: number;
  cobertura: number;
  rotacion: number;
  riesgo: RiskLevel;
  riesgoScore: number;
  probQuiebre: number;
  diasHastaQuiebre: number;
  sobrestock: boolean;
  cantidadRecomendada: number;
  costoReposicion: number;
  prioridad: number;
  margen: number;
  valorInventario: number;
  puntoReorden: number;
  stockSeguridad: number;
  factores: string[];
  historial: { dia: string; ventas: number }[];
  forecast: { dia: string; pronostico: number; min: number; max: number }[];
  reposiciones: { fecha: string; cantidad: number; costo: number; estado: string }[];
}

const CATEGORIAS = {
  bebidas: "Bebidas",
  abarrotes: "Abarrotes",
  lacteos: "Lácteos",
  limpieza: "Limpieza",
  snacks: "Snacks",
  cuidado: "Cuidado personal",
  panaderia: "Panadería",
  congelados: "Congelados",
};

const BASE: BaseProduct[] = [
  { sku: "SKU-1042", nombre: "Café de Grano 500g", categoria: CATEGORIAS.bebidas, precioCompra: 18.5, precioVenta: 29.9, stock: 46, stockMin: 90, stockMax: 420, ventas7: 82, ventas30: 298, leadTime: 5, proveedor: "Andes Coffee S.A.", tendencia: 0.18, estacionalidad: "Alta los fines de semana" },
  { sku: "SKU-2210", nombre: "Té Matcha Premium 200g", categoria: CATEGORIAS.bebidas, precioCompra: 24.0, precioVenta: 42.0, stock: 31, stockMin: 55, stockMax: 240, ventas7: 41, ventas30: 152, leadTime: 7, proveedor: "Kyoto Import", tendencia: 0.22, estacionalidad: "Crecimiento sostenido" },
  { sku: "SKU-0877", nombre: "Jugo de Naranja 1L", categoria: CATEGORIAS.bebidas, precioCompra: 4.2, precioVenta: 7.5, stock: 128, stockMin: 160, stockMax: 700, ventas7: 190, ventas30: 690, leadTime: 3, proveedor: "Valle Fresco", tendencia: 0.09, estacionalidad: "Pico en verano" },
  { sku: "SKU-3390", nombre: "Avena Instantánea 400g", categoria: CATEGORIAS.abarrotes, precioCompra: 3.1, precioVenta: 5.9, stock: 210, stockMin: 140, stockMax: 620, ventas7: 96, ventas30: 372, leadTime: 6, proveedor: "Molinos del Sur", tendencia: 0.04, estacionalidad: "Estable" },
  { sku: "SKU-1188", nombre: "Leche Entera 1L", categoria: CATEGORIAS.lacteos, precioCompra: 3.4, precioVenta: 5.5, stock: 96, stockMin: 220, stockMax: 900, ventas7: 264, ventas30: 1010, leadTime: 2, proveedor: "Lácteos Andinos", tendencia: 0.06, estacionalidad: "Consumo diario" },
  { sku: "SKU-1190", nombre: "Yogurt Griego 900g", categoria: CATEGORIAS.lacteos, precioCompra: 6.8, precioVenta: 11.9, stock: 74, stockMin: 80, stockMax: 340, ventas7: 88, ventas30: 320, leadTime: 3, proveedor: "Lácteos Andinos", tendencia: 0.12, estacionalidad: "Alta en enero" },
  { sku: "SKU-1204", nombre: "Queso Fresco 500g", categoria: CATEGORIAS.lacteos, precioCompra: 9.2, precioVenta: 15.5, stock: 58, stockMin: 60, stockMax: 260, ventas7: 63, ventas30: 244, leadTime: 4, proveedor: "Granja Sierra Verde", tendencia: 0.03, estacionalidad: "Estable" },
  { sku: "SKU-4501", nombre: "Arroz Extra 5kg", categoria: CATEGORIAS.abarrotes, precioCompra: 14.0, precioVenta: 22.9, stock: 340, stockMin: 120, stockMax: 520, ventas7: 74, ventas30: 286, leadTime: 8, proveedor: "Molinos del Sur", tendencia: -0.03, estacionalidad: "Estable" },
  { sku: "SKU-4510", nombre: "Aceite Vegetal 1L", categoria: CATEGORIAS.abarrotes, precioCompra: 7.3, precioVenta: 11.9, stock: 118, stockMin: 130, stockMax: 500, ventas7: 142, ventas30: 528, leadTime: 6, proveedor: "Oleaginosas Perú", tendencia: 0.08, estacionalidad: "Estable" },
  { sku: "SKU-4522", nombre: "Azúcar Rubia 1kg", categoria: CATEGORIAS.abarrotes, precioCompra: 3.0, precioVenta: 4.9, stock: 420, stockMin: 150, stockMax: 600, ventas7: 88, ventas30: 366, leadTime: 5, proveedor: "Ingenio Norte", tendencia: -0.06, estacionalidad: "Baja rotación" },
  { sku: "SKU-4530", nombre: "Fideos Spaghetti 500g", categoria: CATEGORIAS.abarrotes, precioCompra: 2.2, precioVenta: 3.9, stock: 260, stockMin: 180, stockMax: 700, ventas7: 168, ventas30: 640, leadTime: 4, proveedor: "Molinos del Sur", tendencia: 0.05, estacionalidad: "Estable" },
  { sku: "SKU-4544", nombre: "Atún en Lata 170g", categoria: CATEGORIAS.abarrotes, precioCompra: 4.6, precioVenta: 7.9, stock: 92, stockMin: 140, stockMax: 560, ventas7: 154, ventas30: 560, leadTime: 9, proveedor: "Pesquera Pacífico", tendencia: 0.14, estacionalidad: "Alta en cuaresma" },
  { sku: "SKU-5601", nombre: "Detergente Líquido 3L", categoria: CATEGORIAS.limpieza, precioCompra: 12.4, precioVenta: 19.9, stock: 86, stockMin: 70, stockMax: 300, ventas7: 58, ventas30: 226, leadTime: 6, proveedor: "CleanPro Distribución", tendencia: 0.02, estacionalidad: "Estable" },
  { sku: "SKU-5612", nombre: "Lejía 2L", categoria: CATEGORIAS.limpieza, precioCompra: 3.5, precioVenta: 6.2, stock: 240, stockMin: 90, stockMax: 380, ventas7: 52, ventas30: 214, leadTime: 4, proveedor: "CleanPro Distribución", tendencia: -0.09, estacionalidad: "En declive" },
  { sku: "SKU-5620", nombre: "Papel Higiénico 12 rollos", categoria: CATEGORIAS.limpieza, precioCompra: 11.0, precioVenta: 17.5, stock: 104, stockMin: 120, stockMax: 480, ventas7: 132, ventas30: 496, leadTime: 5, proveedor: "Celulosa Sur", tendencia: 0.07, estacionalidad: "Estable" },
  { sku: "SKU-5633", nombre: "Jabón de Lavar Barra", categoria: CATEGORIAS.limpieza, precioCompra: 1.8, precioVenta: 3.2, stock: 380, stockMin: 100, stockMax: 420, ventas7: 46, ventas30: 198, leadTime: 5, proveedor: "CleanPro Distribución", tendencia: -0.12, estacionalidad: "Baja rotación" },
  { sku: "SKU-6702", nombre: "Galletas de Avena 6pk", categoria: CATEGORIAS.snacks, precioCompra: 3.9, precioVenta: 6.9, stock: 142, stockMin: 110, stockMax: 460, ventas7: 118, ventas30: 448, leadTime: 4, proveedor: "Dulcería Continental", tendencia: 0.1, estacionalidad: "Alta en época escolar" },
  { sku: "SKU-6715", nombre: "Chocolate Bitter 70% 100g", categoria: CATEGORIAS.snacks, precioCompra: 5.4, precioVenta: 9.9, stock: 44, stockMin: 70, stockMax: 300, ventas7: 96, ventas30: 342, leadTime: 7, proveedor: "Cacao Amazónico", tendencia: 0.26, estacionalidad: "Pico en julio" },
  { sku: "SKU-6728", nombre: "Papas Fritas 150g", categoria: CATEGORIAS.snacks, precioCompra: 2.9, precioVenta: 5.5, stock: 188, stockMin: 130, stockMax: 520, ventas7: 172, ventas30: 640, leadTime: 3, proveedor: "Snacks del Valle", tendencia: 0.06, estacionalidad: "Alta fines de semana" },
  { sku: "SKU-6740", nombre: "Maní Salado 250g", categoria: CATEGORIAS.snacks, precioCompra: 3.2, precioVenta: 5.9, stock: 296, stockMin: 90, stockMax: 340, ventas7: 44, ventas30: 186, leadTime: 5, proveedor: "Snacks del Valle", tendencia: -0.08, estacionalidad: "Baja rotación" },
  { sku: "SKU-7801", nombre: "Shampoo Anticaspa 400ml", categoria: CATEGORIAS.cuidado, precioCompra: 9.8, precioVenta: 16.9, stock: 62, stockMin: 60, stockMax: 260, ventas7: 64, ventas30: 232, leadTime: 8, proveedor: "BellaCorp", tendencia: 0.11, estacionalidad: "Estable" },
  { sku: "SKU-7814", nombre: "Pasta Dental 90g", categoria: CATEGORIAS.cuidado, precioCompra: 4.1, precioVenta: 7.2, stock: 158, stockMin: 100, stockMax: 400, ventas7: 92, ventas30: 356, leadTime: 6, proveedor: "BellaCorp", tendencia: 0.03, estacionalidad: "Estable" },
  { sku: "SKU-7822", nombre: "Jabón Corporal 3pk", categoria: CATEGORIAS.cuidado, precioCompra: 5.6, precioVenta: 9.5, stock: 214, stockMin: 80, stockMax: 320, ventas7: 52, ventas30: 208, leadTime: 5, proveedor: "BellaCorp", tendencia: -0.05, estacionalidad: "Estable" },
  { sku: "SKU-7838", nombre: "Desodorante Roll-on", categoria: CATEGORIAS.cuidado, precioCompra: 6.9, precioVenta: 12.5, stock: 38, stockMin: 65, stockMax: 240, ventas7: 71, ventas30: 262, leadTime: 9, proveedor: "BellaCorp", tendencia: 0.16, estacionalidad: "Alta en verano" },
  { sku: "SKU-8901", nombre: "Pan Integral 700g", categoria: CATEGORIAS.panaderia, precioCompra: 4.0, precioVenta: 6.9, stock: 54, stockMin: 90, stockMax: 300, ventas7: 168, ventas30: 610, leadTime: 1, proveedor: "Panificadora Aurora", tendencia: 0.05, estacionalidad: "Consumo diario" },
  { sku: "SKU-8914", nombre: "Croissant Mantequilla 4pk", categoria: CATEGORIAS.panaderia, precioCompra: 5.2, precioVenta: 9.9, stock: 41, stockMin: 45, stockMax: 180, ventas7: 74, ventas30: 268, leadTime: 2, proveedor: "Panificadora Aurora", tendencia: 0.13, estacionalidad: "Pico domingos" },
  { sku: "SKU-9101", nombre: "Pechuga de Pollo Congelada 1kg", categoria: CATEGORIAS.congelados, precioCompra: 13.5, precioVenta: 21.9, stock: 88, stockMin: 110, stockMax: 420, ventas7: 138, ventas30: 512, leadTime: 4, proveedor: "Frigorífico Central", tendencia: 0.09, estacionalidad: "Estable" },
  { sku: "SKU-9115", nombre: "Verduras Mixtas Congeladas 1kg", categoria: CATEGORIAS.congelados, precioCompra: 6.4, precioVenta: 10.9, stock: 176, stockMin: 70, stockMax: 300, ventas7: 48, ventas30: 196, leadTime: 6, proveedor: "Frigorífico Central", tendencia: -0.04, estacionalidad: "Baja rotación" },
  { sku: "SKU-9128", nombre: "Helado Vainilla 1L", categoria: CATEGORIAS.congelados, precioCompra: 8.1, precioVenta: 14.5, stock: 122, stockMin: 60, stockMax: 260, ventas7: 66, ventas30: 232, leadTime: 5, proveedor: "Frigorífico Central", tendencia: 0.19, estacionalidad: "Pico en verano" },
  { sku: "SKU-1055", nombre: "Agua Mineral 2.5L", categoria: CATEGORIAS.bebidas, precioCompra: 2.4, precioVenta: 4.2, stock: 410, stockMin: 180, stockMax: 780, ventas7: 214, ventas30: 812, leadTime: 2, proveedor: "Valle Fresco", tendencia: 0.07, estacionalidad: "Pico en verano" },
];

/** PRNG determinista para que el historial no cambie entre renders/SSR. */
function seedFrom(sku: string) {
  let h = 2166136261;
  for (let i = 0; i < sku.length; i++) {
    h ^= sku.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export function deriveProduct(b: BaseProduct): Product {
  const rand = rng(seedFrom(b.sku));

  // Demanda diaria: promedio ponderado entre corto y largo plazo + tendencia.
  const corto = b.ventas7 / 7;
  const largo = b.ventas30 / 30;
  const base = corto * 0.65 + largo * 0.35;
  const demandaDiaria = round(base * (1 + b.tendencia * 0.5), 2);

  const demanda7 = Math.round(demandaDiaria * 7 * (1 + b.tendencia * 0.15));
  const demanda14 = Math.round(demandaDiaria * 14 * (1 + b.tendencia * 0.25));
  const demanda30 = Math.round(demandaDiaria * 30 * (1 + b.tendencia * 0.4));

  const cobertura = round(b.stock / Math.max(demandaDiaria, 0.1), 1);
  const rotacion = round((b.ventas30 * 12) / Math.max(b.stock, 1) / 12, 2); // veces/mes
  const diasHastaQuiebre = Math.max(0, Math.floor(cobertura));

  // Stock de seguridad: cubre variabilidad durante el lead time.
  const stockSeguridad = Math.ceil(demandaDiaria * Math.sqrt(b.leadTime) * 0.9);
  const puntoReorden = Math.ceil(demandaDiaria * b.leadTime + stockSeguridad);

  // Riesgo: relación entre cobertura y el tiempo que tarda reponer.
  const holgura = cobertura - b.leadTime;
  let score = 0;
  if (holgura <= 0) score = 95 - Math.min(10, cobertura * 2);
  else if (holgura <= 3) score = 82 - holgura * 4;
  else if (holgura <= 8) score = 66 - (holgura - 3) * 4;
  else if (holgura <= 20) score = 46 - (holgura - 8) * 2;
  else score = Math.max(4, 22 - (holgura - 20) * 0.5);
  if (b.stock < b.stockMin) score += 8;
  if (b.tendencia > 0.12) score += 6;
  if (b.tendencia < -0.05) score -= 4;
  score = Math.max(2, Math.min(98, Math.round(score)));

  const riesgo: RiskLevel =
    score >= 78 ? "critico" : score >= 60 ? "alto" : score >= 38 ? "moderado" : "saludable";

  const probQuiebre = Math.max(1, Math.min(97, Math.round(score * 0.96)));

  // Sobrestock: mucha cobertura, poca rotación y stock por encima del máximo útil.
  const sobrestock = cobertura > 45 && rotacion < 1.1 && b.stock > b.stockMax * 0.6;

  // Cantidad recomendada: cubrir horizonte objetivo (lead time + 14 días de ciclo)
  // más stock de seguridad, menos lo que ya hay, respetando el stock máximo.
  const horizonte = b.leadTime + 14;
  const objetivo = Math.ceil(demandaDiaria * horizonte + stockSeguridad);
  let cantidadRecomendada = Math.max(0, objetivo - b.stock);
  cantidadRecomendada = Math.min(cantidadRecomendada, b.stockMax - b.stock);
  cantidadRecomendada = cantidadRecomendada > 0 ? Math.ceil(cantidadRecomendada / 10) * 10 : 0;
  if (sobrestock) cantidadRecomendada = 0;

  const costoReposicion = round(cantidadRecomendada * b.precioCompra, 2);
  const margen = round(((b.precioVenta - b.precioCompra) / b.precioVenta) * 100, 1);
  const valorInventario = round(b.stock * b.precioCompra, 2);
  const prioridad = Math.round(score * 0.7 + Math.min(30, rotacion * 12));

  const factores: string[] = [];
  factores.push(`Cobertura actual de ${cobertura} días frente a un lead time de ${b.leadTime} días.`);
  if (b.stock < b.stockMin)
    factores.push(`Stock (${b.stock}) por debajo del mínimo operativo (${b.stockMin}).`);
  if (b.tendencia > 0.08)
    factores.push(`Tendencia de demanda al alza: +${Math.round(b.tendencia * 100)}% en las últimas semanas.`);
  if (b.tendencia < -0.03)
    factores.push(`Tendencia de demanda a la baja: ${Math.round(b.tendencia * 100)}%.`);
  factores.push(`Rotación de ${rotacion} veces al mes (${b.ventas30} unidades en 30 días).`);
  factores.push(`Stock de seguridad calculado en ${stockSeguridad} unidades.`);
  if (sobrestock) factores.push(`Capital inmovilizado estimado: ${valorInventario.toFixed(0)} en un producto de baja salida.`);
  factores.push(`Estacionalidad registrada: ${b.estacionalidad.toLowerCase()}.`);

  // Historial de 56 días (8 semanas) determinista.
  const historial: { dia: string; ventas: number }[] = [];
  for (let i = 55; i >= 0; i--) {
    const dow = (56 - i) % 7;
    const finde = dow === 0 || dow === 6 ? 1.22 : 1;
    const drift = 1 + b.tendencia * ((56 - i) / 56);
    const ruido = 0.82 + rand() * 0.36;
    historial.push({
      dia: `D-${i}`,
      ventas: Math.max(0, Math.round(largo * finde * drift * ruido)),
    });
  }

  const forecast: { dia: string; pronostico: number; min: number; max: number }[] = [];
  for (let i = 1; i <= 30; i++) {
    const dow = i % 7;
    const finde = dow === 0 || dow === 6 ? 1.2 : 1;
    const drift = 1 + b.tendencia * (i / 30);
    const p = demandaDiaria * finde * drift;
    const banda = p * (0.1 + i * 0.006);
    forecast.push({
      dia: `+${i}`,
      pronostico: round(p, 1),
      min: round(Math.max(0, p - banda), 1),
      max: round(p + banda, 1),
    });
  }

  const reposiciones = [
    { fecha: "2026-08-12", cantidad: Math.ceil(objetivo * 0.6 / 10) * 10, costo: round(Math.ceil(objetivo * 0.6) * b.precioCompra, 2), estado: "Recibido" },
    { fecha: "2026-07-21", cantidad: Math.ceil(objetivo * 0.45 / 10) * 10, costo: round(Math.ceil(objetivo * 0.45) * b.precioCompra, 2), estado: "Recibido" },
    { fecha: "2026-06-30", cantidad: Math.ceil(objetivo * 0.5 / 10) * 10, costo: round(Math.ceil(objetivo * 0.5) * b.precioCompra, 2), estado: "Recibido" },
  ];

  return {
    ...b,
    demandaDiaria,
    demanda7,
    demanda14,
    demanda30,
    cobertura,
    rotacion,
    riesgo,
    riesgoScore: score,
    probQuiebre,
    diasHastaQuiebre,
    sobrestock,
    cantidadRecomendada,
    costoReposicion,
    prioridad,
    margen,
    valorInventario,
    puntoReorden,
    stockSeguridad,
    factores,
    historial,
    forecast,
    reposiciones,
  };
}

export const PRODUCTS: Product[] = BASE.map(deriveProduct);

export const CATEGORY_LIST = Array.from(new Set(PRODUCTS.map((p) => p.categoria))).sort();
export const SUPPLIER_LIST = Array.from(new Set(PRODUCTS.map((p) => p.proveedor))).sort();

export function getProduct(sku: string) {
  return PRODUCTS.find((p) => p.sku === sku);
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  critico: "Crítico",
  alto: "Alto",
  moderado: "Moderado",
  saludable: "Saludable",
};

export interface Metrics {
  totalSkus: number;
  criticos: number;
  altos: number;
  moderados: number;
  saludables: number;
  sobrestock: number;
  coberturaPromedio: number;
  riesgoMedio: number;
  valorInventario: number;
  capitalInmovilizado: number;
  pedidosPendientes: number;
  costoPendiente: number;
  ventas30: number;
  unidadesEnRiesgo: number;
}

export function computeMetrics(products: Product[] = PRODUCTS): Metrics {
  const criticos = products.filter((p) => p.riesgo === "critico");
  const altos = products.filter((p) => p.riesgo === "alto");
  const moderados = products.filter((p) => p.riesgo === "moderado");
  const saludables = products.filter((p) => p.riesgo === "saludable");
  const sobrestock = products.filter((p) => p.sobrestock);
  const pendientes = products.filter((p) => p.cantidadRecomendada > 0);
  return {
    totalSkus: products.length,
    criticos: criticos.length,
    altos: altos.length,
    moderados: moderados.length,
    saludables: saludables.length,
    sobrestock: sobrestock.length,
    coberturaPromedio: round(
      products.reduce((a, p) => a + p.cobertura, 0) / Math.max(products.length, 1),
      1,
    ),
    riesgoMedio: Math.round(
      products.reduce((a, p) => a + p.riesgoScore, 0) / Math.max(products.length, 1),
    ),
    valorInventario: Math.round(products.reduce((a, p) => a + p.valorInventario, 0)),
    capitalInmovilizado: Math.round(sobrestock.reduce((a, p) => a + p.valorInventario, 0)),
    pedidosPendientes: pendientes.length,
    costoPendiente: Math.round(pendientes.reduce((a, p) => a + p.costoReposicion, 0)),
    ventas30: products.reduce((a, p) => a + p.ventas30, 0),
    unidadesEnRiesgo: criticos.concat(altos).reduce((a, p) => a + p.cantidadRecomendada, 0),
  };
}

export const METRICS = computeMetrics();

/** Métricas del motor predictivo (evaluación con validación temporal). */
export const MODEL_METRICS = {
  modelo: "LightGBM + baseline promedio móvil",
  version: "v2.4",
  entrenado: "2026-09-02",
  mae: 3.1,
  rmse: 5.4,
  wape: 5.8,
  precision: 94.2,
  ventanaValidacion: "Validación temporal, 6 folds (rolling origin)",
  variables: [
    "Ventas históricas diarias",
    "Día de la semana",
    "Tendencia",
    "Estacionalidad",
    "Stock disponible",
    "Promociones activas",
    "Tiempo de reposición (lead time)",
    "Stock mínimo",
  ],
  comparativa: [
    { modelo: "Naive (última semana)", mae: 7.9, rmse: 12.1, wape: 14.2, precision: 85.8 },
    { modelo: "Promedio móvil 7d", mae: 6.2, rmse: 9.4, wape: 11.3, precision: 88.7 },
    { modelo: "XGBoost", mae: 3.5, rmse: 5.9, wape: 6.4, precision: 93.6 },
    { modelo: "LightGBM (seleccionado)", mae: 3.1, rmse: 5.4, wape: 5.8, precision: 94.2 },
  ],
};

/** Serie agregada demanda histórica vs pronóstico vs stock (8 semanas + 4 futuras). */
export function aggregateSeries() {
  const semanas: { semana: string; demanda: number | null; pronostico: number; stock: number }[] = [];
  const totalStock = PRODUCTS.reduce((a, p) => a + p.stock, 0);
  const demandaSemanal = PRODUCTS.reduce((a, p) => a + p.demandaDiaria * 7, 0);
  for (let i = 7; i >= 0; i--) {
    const idxStart = 55 - i * 7;
    const demanda = PRODUCTS.reduce((a, p) => {
      let s = 0;
      for (let d = 0; d < 7; d++) s += p.historial[Math.max(0, idxStart - 6 + d)]?.ventas ?? 0;
      return a + s;
    }, 0);
    semanas.push({
      semana: `S-${i}`,
      demanda,
      pronostico: Math.round(demanda * (0.97 + (i % 3) * 0.02)),
      stock: Math.round(totalStock * (0.82 + i * 0.025)),
    });
  }
  for (let i = 1; i <= 4; i++) {
    semanas.push({
      semana: `S+${i}`,
      demanda: null,
      pronostico: Math.round(demandaSemanal * (1 + i * 0.035)),
      stock: Math.round(Math.max(0, totalStock - demandaSemanal * i)),
    });
  }
  return semanas;
}
