"use client";

import { useState } from "react";
import type { RiskView } from "@/features/risks/data";
import type { RiskLevel } from "@/lib/calculations/risk";

interface RiskMatrixProps {
  risks: RiskView[];
  type: "inherent" | "residual";
  onCellClick?: (probability: number, impact: number, risks: RiskView[]) => void;
}

/**
 * Matriz de riesgo 5x5 interactiva.
 * Eje Y: Probabilidad (5 arriba, 1 abajo)
 * Eje X: Impacto (1 izquierda, 5 derecha)
 */
export function RiskMatrix({ risks, type, onCellClick }: RiskMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<{ p: number; i: number } | null>(null);
  
  // Agrupar riesgos por celda
  const matrixData = buildMatrix(risks, type);
  
  const handleCellClick = (p: number, i: number) => {
    const cellRisks = matrixData[p]?.[i] || [];
    setSelectedCell({ p, i });
    onCellClick?.(p, i, cellRisks);
  };
  
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <h3 className="card-title text-primary">
          Matriz de Riesgo {type === "inherent" ? "Inherente" : "Residual"}
        </h3>
        
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Encabezado de impacto */}
            <div className="flex items-center mb-2">
              <div className="w-24"></div>
              <div className="flex-1 grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="text-center text-sm font-semibold text-primary">
                    {i}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Título eje X */}
            <div className="flex items-center mb-4">
              <div className="w-24"></div>
              <div className="flex-1 text-center text-sm font-bold text-primary">
                Impacto →
              </div>
            </div>
            
            {/* Matriz */}
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((p) => (
                <div key={p} className="flex items-center gap-2">
                  {/* Etiqueta de probabilidad */}
                  <div className="w-24 text-right pr-2 text-sm font-semibold text-primary">
                    {p}
                  </div>
                  
                  {/* Celdas de la matriz */}
                  <div className="flex-1 grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const level = calculateRiskLevel(p, i);
                      const count = matrixData[p]?.[i]?.length || 0;
                      const isSelected = selectedCell?.p === p && selectedCell?.i === i;
                      
                      return (
                        <button
                          key={`${p}-${i}`}
                          onClick={() => handleCellClick(p, i)}
                          className={`
                            aspect-square rounded-lg transition-all duration-200
                            flex items-center justify-center
                            text-sm font-bold
                            ${getMatrixCellColor(level)}
                            ${isSelected ? "ring-4 ring-accent scale-105" : "hover:scale-105"}
                            ${count > 0 ? "cursor-pointer" : "cursor-default opacity-70"}
                          `}
                          title={`P=${p}, I=${i}: ${count} riesgo(s)`}
                        >
                          {count > 0 ? count : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Título eje Y */}
            <div className="flex items-center mt-4">
              <div className="w-24 text-center text-sm font-bold text-primary rotate-0">
                ← Probabilidad
              </div>
            </div>
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-base-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-error-content text-error"></div>
            <span className="text-sm font-semibold text-primary">Alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-warning-content text-warning"></div>
            <span className="text-sm font-semibold text-primary">Medio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-success-content text-success"></div>
            <span className="text-sm font-semibold text-primary">Bajo</span>
          </div>
        </div>
        
        {/* Información de celda seleccionada */}
        {selectedCell && (
          <div className="alert bg-base-200 mt-4">
            <div className="flex-1">
              <p className="font-semibold text-primary">
                Celda seleccionada: Probabilidad = {selectedCell.p}, Impacto = {selectedCell.i}
              </p>
              <p className="text-sm text-primary/80">
                {matrixData[selectedCell.p]?.[selectedCell.i]?.length || 0} riesgo(s) en esta celda
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Construye la matriz de datos agrupando riesgos por celda.
 */
function buildMatrix(
  risks: RiskView[],
  type: "inherent" | "residual"
): Record<number, Record<number, RiskView[]>> {
  const matrix: Record<number, Record<number, RiskView[]>> = {};
  
  for (let p = 1; p <= 5; p++) {
    matrix[p] = {};
    for (let i = 1; i <= 5; i++) {
      matrix[p][i] = [];
    }
  }
  
  for (const risk of risks) {
    let p: number | null = null;
    let i: number | null = null;
    
    if (type === "inherent") {
      p = risk.probability_inherent;
      i = risk.impact_inherent;
    } else {
      p = risk.probability_residual;
      i = risk.impact_residual;
    }
    
    if (p && i && p >= 1 && p <= 5 && i >= 1 && i <= 5) {
      matrix[p][i].push(risk);
    }
  }
  
  return matrix;
}

/**
 * Calcula el nivel de riesgo basado en probabilidad e impacto.
 */
function calculateRiskLevel(probability: number, impact: number): RiskLevel {
  const score = probability * impact;
  if (score >= 15) return "Alto";
  if (score >= 6) return "Medio";
  return "Bajo";
}

/**
 * Obtiene el color de la celda según el nivel de riesgo.
 */
function getMatrixCellColor(level: RiskLevel): string {
  switch (level) {
    case "Alto":
      return "bg-error-content text-error hover:bg-error-content/80";
    case "Medio":
      return "bg-warning-content text-warning hover:bg-warning-content/80";
    case "Bajo":
      return "bg-success-content text-success hover:bg-success-content/80";
  }
}

/**
 * Componente para mostrar la lista de riesgos en una celda de la matriz.
 */
export function MatrixRiskList({ risks, onClose }: { risks: RiskView[]; onClose: () => void }) {
  if (risks.length === 0) return null;
  
  return (
    <div className="modal modal-open">
      <div className="modal-box bg-base-100 max-w-3xl">
        <h3 className="font-bold text-lg text-primary mb-4">
          Riesgos en esta celda ({risks.length})
        </h3>
        
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead className="bg-primary text-primary-content">
              <tr>
                <th>Código</th>
                <th>Activo</th>
                <th>Amenaza</th>
                <th>Nivel</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id} className="hover:bg-base-200">
                  <td className="font-mono text-sm">{risk.code}</td>
                  <td>{risk.asset_name || risk.asset_code}</td>
                  <td className="max-w-xs truncate">{risk.threat_source}</td>
                  <td>
                    {risk.riskInherentLevel && (
                      <span className={`badge ${getBadgeColor(risk.riskInherentLevel)}`}>
                        {risk.riskInherentLevel}
                      </span>
                    )}
                  </td>
                  <td>
                    <a
                      href={`/riesgos/${risk.id}`}
                      className="btn btn-ghost btn-xs"
                    >
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-primary">
            Cerrar
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

function getBadgeColor(level: RiskLevel): string {
  switch (level) {
    case "Alto":
      return "badge-error";
    case "Medio":
      return "badge-warning";
    case "Bajo":
      return "badge-success";
  }
}
