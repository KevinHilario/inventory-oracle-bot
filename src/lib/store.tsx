import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PRODUCTS, type Product } from "./inventory";
import type { AgentId } from "./supervisor";

export type DecisionEstado = "aprobado" | "modificado" | "pospuesto" | "descartado";

export interface Decision {
  id: string;
  sku: string;
  nombre: string;
  cantidadSugerida: number;
  cantidadFinal: number;
  costo: number;
  estado: DecisionEstado;
  motivo: string;
  fecha: string;
  usuario: string;
}

export interface LogEntry {
  id: string;
  hora: string;
  agente: AgentId;
  texto: string;
}

interface StoreValue {
  decisions: Decision[];
  log: LogEntry[];
  addDecision: (d: Omit<Decision, "id" | "fecha" | "usuario">) => void;
  pushLog: (agente: AgentId, texto: string) => void;
  pendientes: Product[];
  estadoDe: (sku: string) => DecisionEstado | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

const KEY = "intelli-stock:decisions";

const nowTime = () =>
  new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setDecisions(JSON.parse(raw) as Decision[]);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const addDecision = useCallback((d: Omit<Decision, "id" | "fecha" | "usuario">) => {
    setDecisions((prev) => {
      const next = [
        {
          ...d,
          id: `${d.sku}-${Date.now()}`,
          fecha: new Date().toISOString(),
          usuario: "M. Gutiérrez · Encargado de compras",
        },
        ...prev,
      ];
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const pushLog = useCallback((agente: AgentId, texto: string) => {
    setLog((prev) => [{ id: `${Date.now()}-${Math.random()}`, hora: nowTime(), agente, texto }, ...prev].slice(0, 60));
  }, []);

  const estadoDe = useCallback(
    (sku: string) => decisions.find((d) => d.sku === sku)?.estado,
    [decisions],
  );

  const pendientes = useMemo(() => {
    const resueltos = new Set(
      decisions.filter((d) => d.estado === "aprobado" || d.estado === "descartado").map((d) => d.sku),
    );
    return PRODUCTS.filter((p) => p.cantidadRecomendada > 0 && !resueltos.has(p.sku)).sort(
      (a, b) => b.prioridad - a.prioridad,
    );
  }, [decisions]);

  const value = useMemo(
    () => ({ decisions, log, addDecision, pushLog, pendientes, estadoDe }),
    [decisions, log, addDecision, pushLog, pendientes, estadoDe],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
