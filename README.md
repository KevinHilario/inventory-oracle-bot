# Intelli Stock Advisor

Quiero que construyas desde cero una aplicación web llamada “Intelli-Stock”, basada en el documento Word adjunto.

Debe ser un MVP visual y funcional de un sistema multiagente inteligente para gestión predictiva de inventarios, orientado al encargado de compras.

La idea principal es:

USUARIO CONSULTA → AGENTE SUPERVISOR INTERPRETA → AGENTES ESPECIALIZADOS ANALIZAN → IA CONSOLIDA → SISTEMA RECOMIENDA → HUMANO APRUEBA.

Usa exactamente la arquitectura planteada en el documento:

- Agente Supervisor

- Agente Analista de Ventas

- Agente Predictor de Demanda

- Agente Gestor de Inventario

- Agente de Reposición

El Supervisor debe ser el centro de la experiencia. El usuario debe poder escribir consultas en lenguaje natural como:

“¿Qué productos debo reponer esta semana?”

“¿Qué productos tienen riesgo crítico?”

“¿Cuánto debería comprar de café?”

“¿Por qué recomiendas esa cantidad?”

“¿Qué productos tienen sobrestock?”

“Muéstrame los productos con menor cobertura.”

El sistema debe simular visualmente cómo el Supervisor consulta a los demás agentes y mostrar estados como:

- Analizando ventas…

- Prediciendo demanda…

- Consultando inventario…

- Calculando reposición…

- Generando recomendación…

Después debe entregar resultados basados en los datos simulados del sistema, no respuestas genéricas.

## Diseño

Quiero una interfaz moderna tipo SaaS / Business Intelligence, limpia, profesional y empresarial.

Usar:

- sidebar lateral

- tarjetas KPI

- gráficos interactivos

- alertas

- rankings

- indicadores

- tablas solo cuando sean necesarias

- panel flotante o persistente del Supervisor IA

No hacer una web compuesta únicamente por tablas.

## Secciones principales

Crear estas páginas:

1. Centro de Inteligencia

2. Productos

3. Reposición

4. Predicción de Demanda

5. Inventario

6. Analítica

7. Agentes IA

8. Reportes

9. Historial de decisiones

## Dashboard principal

Mostrar KPIs como:

- Total SKUs

- Productos críticos

- Riesgo medio

- Productos saludables

- Productos con sobrestock

- Cobertura promedio

- Pedidos pendientes

- Valor del inventario

- Precisión del modelo predictivo

Añadir gráficos como:

- Demanda histórica vs demanda pronosticada vs stock

- Distribución de riesgo

- Top productos en riesgo

- Productos por rotación

- Ventas últimas semanas

- Demanda proyectada 7, 14 y 30 días

- Cobertura de inventario

- Capital inmovilizado

## Productos

Crear mínimo 25 productos simulados de distintas categorías.

Cada producto debe tener:

- SKU

- nombre

- categoría

- precio compra

- precio venta

- stock actual

- stock mínimo

- stock máximo

- ventas 7 días

- ventas 30 días

- demanda prevista

- cobertura

- lead time

- rotación

- riesgo

- proveedor

- cantidad recomendada de reposición

Agregar buscador, filtros y ordenamiento.

Al seleccionar un producto, mostrar una vista detallada con:

- KPIs

- historial de ventas

- forecast

- riesgo

- explicación de IA

- factores que influyeron en la recomendación

- historial de reposiciones

## Agentes IA

Crear una pantalla muy visual llamada “Centro de Agentes IA”.

Mostrar al Agente Supervisor conectado con los demás agentes.

Cada agente debe mostrar:

- estado

- responsabilidad

- última ejecución

- tareas realizadas

- resultado resumido

También debe existir un registro de actividad, por ejemplo:

19:42 Supervisor recibió consulta

19:42 Analista revisando ventas

19:42 Predictor ejecutando forecasting

19:43 Gestor consultando inventario

19:43 Reposición calculando pedido

19:43 Supervisor generó respuesta

## Predicción

Crear una sección específica de Machine Learning.

Mostrar:

- histórico vs predicción

- horizonte 7 / 14 / 30 días

- MAE

- RMSE

- WAPE

- precisión estimada

- variables utilizadas

Usar los conceptos definidos en el documento adjunto.

## Reposición

La IA debe recomendar:

- qué producto comprar

- cuánto comprar

- cuándo comprar

- prioridad

- riesgo

- costo estimado

- explicación

Permitir:

- aprobar

- modificar cantidad

- posponer

- descartar

IMPORTANTE:

Toda compra debe requerir aprobación humana. No ejecutar compras automáticamente.

## Simulador

Agregar una sección “¿Qué pasaría si...?”

Ejemplos:

“¿Qué pasa si no repongo café?”

Mostrar:

- días hasta quiebre

- unidades potencialmente perdidas

- ventas potenciales perdidas

- probabilidad de quiebre

“¿Qué pasa si compro 100 unidades?”

Mostrar:

- nueva cobertura

- riesgo de sobrestock

- capital invertido

## Datos

Los datos pueden ser simulados, pero deben ser coherentes entre sí.

Si un producto tiene poco stock y alta demanda, debe tener riesgo alto.

Si tiene mucho stock y poca demanda, debe marcarse posible sobrestock.

Las respuestas del Supervisor deben utilizar realmente esos datos.

## Importante

Usa el Word adjunto como fuente principal para la lógica, arquitectura multiagente, funciones de los agentes, flujo de interacción y motor predictivo.

Quiero que el resultado parezca un MVP avanzado y presentable en una exposición universitaria.

El usuario debe sentir que tiene un analista inteligente de inventarios que le dice:

QUÉ comprar,

CUÁNTO comprar,

CUÁNDO comprar

y POR QUÉ.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inventory-oracle-bot.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a84afde5-32ed-4eef-a828-0fd6dbce9bbe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
