import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { SupervisorPanel } from "./SupervisorPanel";
import { METRICS } from "@/lib/inventory";

const NAV = [
  { to: "/", label: "Centro de Inteligencia" },
  { to: "/productos", label: "Productos" },
  { to: "/reposicion", label: "Reposición" },
  { to: "/prediccion", label: "Predicción de Demanda" },
  { to: "/inventario", label: "Inventario" },
  { to: "/analitica", label: "Analítica" },
  { to: "/agentes", label: "Agentes IA" },
  { to: "/reportes", label: "Reportes" },
  { to: "/historial", label: "Historial de decisiones" },
  { to: "/simulador", label: "Simulador" },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-sm text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent font-display font-bold text-accent-foreground">
            IS
          </span>
          <span className="font-display font-semibold tracking-tight">Intelli-Stock</span>
        </div>
        <nav className="space-y-0.5 p-3 text-[13px]">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              activeProps={{ className: "!bg-accent/10 !text-accent font-medium" }}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line p-3">
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="blink size-1.5 rounded-full bg-good" /> SUPERVISOR ACTIVO
            </div>
            <div className="mt-2 text-xs text-foreground/70">5 agentes conectados · modelo v2.4</div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-background/90 px-6 backdrop-blur">
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
            <p className="font-mono text-[11px] uppercase text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] text-muted-foreground md:block">
              {METRICS.criticos} críticos · {METRICS.pedidosPendientes} pedidos por aprobar
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-surface-2 font-display text-xs font-semibold">
              MG
            </span>
          </div>
        </header>
        <div className="space-y-5 p-6">{children}</div>
      </main>

      <div className="hidden xl:flex">
        <SupervisorPanel />
      </div>
    </div>
  );
}
