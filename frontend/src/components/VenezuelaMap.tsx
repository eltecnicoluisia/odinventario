"use client";

import React, { useState } from "react";
import { VENEZUELA_MAP_VIEWBOX, VENEZUELA_STATES_PATHS } from "./venezuelaData";

export interface StateStats {
  estado: string;
  items_count: number;
  total_stock: number;
  total_value: number;
  sedes_count: number;
  sedes?: string[];
}

interface VenezuelaMapProps {
  statesData: Record<string, StateStats>;
  selectedState: string | null;
  onSelectState: (stateName: string) => void;
}

export default function VenezuelaMap({
  statesData,
  selectedState,
  onSelectState,
}: VenezuelaMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, stateName: string) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setHoveredState(stateName);
  };

  const handleMouseLeave = () => {
    setHoveredState(null);
  };

  const activeHoverData = hoveredState ? statesData[hoveredState] : null;

  return (
    <div className="relative w-full rounded-2xl border border-cyan-500/25 bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xl shadow-[0_0_35px_rgba(6,182,212,0.15)] overflow-hidden transition-all duration-300">
      {/* Decorative Neon ambient glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />

      {/* Header bar with controls */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              🗺️ Mapa Interactivo de Cobertura Nacional
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pasa el cursor por cualquier estado para ver estadísticas o haz clic para gestionar sus Galpones, Oficinas e Inventario.
          </p>
        </div>

        {/* Quick select & reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedState || ""}
            onChange={(e) => onSelectState(e.target.value)}
            className="rounded-xl border border-cyan-500/30 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-cyan-200 outline-none hover:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
          >
            <option value="">-- Seleccionar Estado --</option>
            {VENEZUELA_STATES_PATHS.map((st) => {
              const count = statesData[st.title]?.items_count || 0;
              return (
                <option key={st.id} value={st.title}>
                  {st.title} {count > 0 ? `(${count} ítems)` : ""}
                </option>
              );
            })}
          </select>

          {selectedState && (
            <button
              onClick={() => onSelectState("")}
              className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-900/50 transition-colors"
            >
              ✕ Quitar filtro
            </button>
          )}
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="relative w-full flex justify-center items-center">
        <svg
          viewBox={VENEZUELA_MAP_VIEWBOX}
          className="w-full h-auto max-h-[520px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)] select-none"
          style={{ filter: "drop-shadow(0 0 18px rgba(6, 182, 212, 0.12))" }}
        >
          <defs>
            <linearGradient id="neonCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.95" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {VENEZUELA_STATES_PATHS.map((state) => {
            const isSelected = selectedState?.toLowerCase() === state.title.toLowerCase();
            const isHovered = hoveredState?.toLowerCase() === state.title.toLowerCase();
            const stData = statesData[state.title];
            const hasActivity = stData && (stData.items_count > 0 || stData.sedes_count > 0);

            // Dynamic Styling matching glass neon theme
            let fill = "rgba(15, 23, 42, 0.75)"; // Default dark slate
            let stroke = "rgba(6, 182, 212, 0.4)";
            let strokeWidth = 1.1;
            let filter = "none";

            if (isSelected) {
              fill = "url(#neonCyanGrad)";
              stroke = "#38bdf8";
              strokeWidth = 2.5;
              filter = "url(#glowFilter)";
            } else if (isHovered) {
              fill = "rgba(6, 182, 212, 0.55)";
              stroke = "#22d3ee";
              strokeWidth = 2.0;
              filter = "url(#glowFilter)";
            } else if (hasActivity) {
              fill = "rgba(6, 182, 212, 0.22)";
              stroke = "rgba(6, 182, 212, 0.65)";
              strokeWidth = 1.3;
            }

            return (
              <path
                key={state.id}
                id={state.id}
                d={state.d}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                filter={filter}
                className="cursor-pointer transition-all duration-200 hover:opacity-95"
                onMouseMove={(e) => handleMouseMove(e, state.title)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onSelectState(state.title)}
              >
                <title>{state.title}</title>
              </path>
            );
          })}
        </svg>

        {/* Floating Tooltip following mouse */}
        {hoveredState && (
          <div
            className="pointer-events-none absolute z-30 rounded-xl border border-cyan-400/50 bg-slate-950/90 p-3 shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md transition-transform duration-75 text-left"
            style={{
              left: Math.min(tooltipPos.x + 15, 600),
              top: Math.max(tooltipPos.y - 80, 10),
            }}
          >
            <div className="flex items-center gap-2 border-b border-cyan-500/30 pb-1 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              <p className="font-bold text-sm text-cyan-200 tracking-wide">{hoveredState}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
              <div>
                <span className="text-slate-400">Artículos:</span>{" "}
                <strong className="text-white font-mono">{activeHoverData?.items_count || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400">Stock total:</span>{" "}
                <strong className="text-white font-mono">{activeHoverData?.total_stock || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400">Galpones/Ofic:</span>{" "}
                <strong className="text-white font-mono">{activeHoverData?.sedes_count || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400">Valor USD:</span>{" "}
                <strong className="text-emerald-400 font-mono">${(activeHoverData?.total_value || 0).toLocaleString()}</strong>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-cyan-400/80 italic text-center">
              Clic para gestionar este estado
            </p>
          </div>
        )}
      </div>

      {/* Legend & quick indicators */}
      <div className="relative z-10 mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_8px_#06b6d4]" />
            <span>Estado Seleccionado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-cyan-500/25 border border-cyan-500/60" />
            <span>Con Galpones / Inventario</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-slate-900 border border-cyan-500/30" />
            <span>Sin Asignación Aún</span>
          </div>
        </div>

        {selectedState && (
          <div className="flex items-center gap-2 text-cyan-300 font-medium">
            <span>Visualizando:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-white font-bold">
              {selectedState}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
