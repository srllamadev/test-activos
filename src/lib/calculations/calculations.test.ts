import { describe, expect, it } from "vitest";
import { evaluateCia, validateCiaThresholds, DEFAULT_CIA_THRESHOLDS } from "./cia";
import {
  evaluateInherentRisk,
  evaluateResidualRisk,
  validateRiskThresholds,
  NOT_EVALUATED,
  DEFAULT_RISK_THRESHOLDS,
} from "./risk";
import { addCalendarMonths, nextReviewDate, todayIn, diffDays, isIsoDate } from "./dates";
import { followUpAlert } from "./follow-up";
import { assetRegistryStatus, type AssetRegistryInput } from "./asset-registry";

describe("Criticidad CIA", () => {
  it.each([
    [5, 4, 3, "Alta", ["confidencialidad"]],
    [2, 3, 2, "Media", ["integridad"]],
    [1, 2, 2, "Baja", ["integridad", "disponibilidad"]],
  ] as const)("CIA %i/%i/%i => %s", (c, i, d, level, dims) => {
    const r = evaluateCia({ confidencialidad: c, integridad: i, disponibilidad: d });
    expect(r.complete).toBe(true);
    expect(r.level).toBe(level);
    expect(r.max).toBe(Math.max(c, i, d));
    expect(r.dimensionsAtMax).toEqual(dims);
  });

  it("sin calcular cuando falta una dimensión", () => {
    const r = evaluateCia({ confidencialidad: 5, integridad: null, disponibilidad: 5 });
    expect(r.complete).toBe(false);
    expect(r.level).toBeNull();
    expect(r.max).toBeNull();
  });

  it("rechaza valores fuera de rango o no enteros", () => {
    expect(evaluateCia({ confidencialidad: 6, integridad: 1, disponibilidad: 1 }).complete).toBe(false);
    expect(evaluateCia({ confidencialidad: 0, integridad: 1, disponibilidad: 1 }).complete).toBe(false);
    expect(evaluateCia({ confidencialidad: 2.5, integridad: 1, disponibilidad: 1 }).complete).toBe(false);
  });

  it("respeta umbrales configurables", () => {
    const strict = { criticalFrom: 3, mediumFrom: 2 };
    expect(evaluateCia({ confidencialidad: 3, integridad: 1, disponibilidad: 1 }, strict).level).toBe("Alta");
    expect(evaluateCia({ confidencialidad: 2, integridad: 1, disponibilidad: 1 }, strict).level).toBe("Media");
  });

  it("valida el orden de los umbrales", () => {
    expect(validateCiaThresholds(DEFAULT_CIA_THRESHOLDS)).toEqual([]);
    expect(validateCiaThresholds({ criticalFrom: 3, mediumFrom: 3 })).not.toEqual([]);
    expect(validateCiaThresholds({ criticalFrom: 6, mediumFrom: 3 })).not.toEqual([]);
  });
});

describe("Riesgo inherente y residual", () => {
  it("4 × 5 = 20 Alto", () => {
    const r = evaluateInherentRisk(4, 5);
    expect(r).toMatchObject({ score: 20, level: "Alto" });
  });
  it("2 × 3 = 6 Medio", () => {
    expect(evaluateInherentRisk(2, 3)).toMatchObject({ score: 6, level: "Medio" });
  });
  it("1 × 5 = 5 Bajo", () => {
    expect(evaluateInherentRisk(1, 5)).toMatchObject({ score: 5, level: "Bajo" });
  });
  it("límites: 14 Medio, 15 Alto", () => {
    expect(evaluateInherentRisk(2, 7).level).toBeNull(); // fuera de escala
    expect(evaluateInherentRisk(2, 5).level).toBe("Medio"); // 10
    expect(evaluateInherentRisk(3, 5).level).toBe("Alto"); // 15
    expect(evaluateInherentRisk(5, 3).level).toBe("Alto"); // 15
  });
  it("sin valores completos no calcula", () => {
    expect(evaluateInherentRisk(null, 5)).toMatchObject({ score: null, level: null, label: "Sin calcular" });
  });
  it("residual incompleto muestra 'No evaluado', nunca 0", () => {
    const r = evaluateResidualRisk(undefined, undefined);
    expect(r.label).toBe(NOT_EVALUATED);
    expect(r.score).toBeNull();
  });
  it("residual válido se clasifica con los mismos umbrales", () => {
    expect(evaluateResidualRisk(1, 2, DEFAULT_RISK_THRESHOLDS)).toMatchObject({ score: 2, level: "Bajo" });
  });
  it("valida umbrales de riesgo", () => {
    expect(validateRiskThresholds({ highFrom: 15, mediumFrom: 6 })).toEqual([]);
    expect(validateRiskThresholds({ highFrom: 6, mediumFrom: 15 })).not.toEqual([]);
  });
});

describe("Fechas y revisiones", () => {
  it("suma meses calendario con cierre de mes", () => {
    expect(addCalendarMonths("2026-11-11", 3)).toBe("2027-02-11");
    expect(addCalendarMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addCalendarMonths("2028-01-31", 1)).toBe("2028-02-29"); // bisiesto
    expect(addCalendarMonths("2026-12-15", 1)).toBe("2027-01-15");
  });
  it("próxima revisión y entradas vacías", () => {
    expect(nextReviewDate("2026-11-11", 3)).toBe("2027-02-11");
    expect(nextReviewDate(null, 3)).toBeNull();
    expect(nextReviewDate("2026-02-30", 3)).toBeNull();
  });
  it("valida fechas ISO reales", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-11-12")).toBe(true);
  });
  it("calcula 'hoy' en la zona horaria configurada", () => {
    // 2026-11-12 02:30 UTC = 2026-11-11 22:30 en America/La_Paz (UTC-4)
    const now = new Date("2026-11-12T02:30:00Z");
    expect(todayIn("America/La_Paz", now)).toBe("2026-11-11");
    expect(todayIn("UTC", now)).toBe("2026-11-12");
  });
  it("diferencia de días", () => {
    expect(diffDays("2026-11-11", "2026-11-18")).toBe(7);
    expect(diffDays("2026-11-11", "2026-11-10")).toBe(-1);
  });
});

describe("Alertas de seguimiento", () => {
  const today = "2026-11-11";
  it("Completada => Cerrada aunque tenga fecha vencida", () => {
    expect(followUpAlert("Completada", "2026-01-01", today)).toBe("Cerrada");
  });
  it("sin fecha => Sin fecha", () => {
    expect(followUpAlert("Pendiente", null, today)).toBe("Sin fecha");
  });
  it("fecha anterior a hoy => Vencida", () => {
    expect(followUpAlert("En curso", "2026-11-10", today)).toBe("Vencida");
  });
  it("hoy y hasta +7 días => Próxima (inclusive)", () => {
    expect(followUpAlert("Pendiente", today, today)).toBe("Próxima");
    expect(followUpAlert("Pendiente", "2026-11-18", today)).toBe("Próxima");
  });
  it("más de 7 días => En plazo", () => {
    expect(followUpAlert("Pendiente", "2026-11-19", today)).toBe("En plazo");
  });
});

describe("Estado del registro de activo", () => {
  const complete: AssetRegistryInput = {
    code: "AG-001",
    name: "Plataforma",
    category: "Software y aplicaciones",
    assetType: "Primario",
    description: "Servicio público",
    macroprocess: "Transformación digital",
    process: "Identidad digital",
    owner: "Director de Sistemas",
    responsibleArea: "Gestión",
    classification: "Pública",
    lifecycle: "Activo",
    reviewDate: "2026-11-11",
    confidentiality: 5,
    integrity: 5,
    availability: 5,
    criticalityJustification: "Impacto alto",
    evidenceReference: "Ficha oficial",
    evidenceStatus: "verificada",
    source: "https://ejemplo.gob",
    isDraft: false,
    validatedAt: null,
  };

  it("registro completo => Listo para revisión", () => {
    expect(assetRegistryStatus(complete).status).toBe("Listo para revisión");
  });
  it("'Por identificar' no cuenta como propietario", () => {
    const r = assetRegistryStatus({ ...complete, owner: "Por identificar" });
    expect(r.status).toBe("Incompleto");
    expect(r.missing.map((m) => m.key)).toContain("owner");
  });
  it("CIA incompleto => Incompleto", () => {
    expect(assetRegistryStatus({ ...complete, integrity: null }).status).toBe("Incompleto");
  });
  it("evidencia no verificada => Incompleto", () => {
    expect(assetRegistryStatus({ ...complete, evidenceStatus: "parcial" }).status).toBe("Incompleto");
  });
  it("código duplicado => Incompleto", () => {
    expect(assetRegistryStatus({ ...complete, duplicateCode: true }).status).toBe("Incompleto");
  });
  it("borrador tiene prioridad", () => {
    expect(assetRegistryStatus({ ...complete, isDraft: true }).status).toBe("Borrador");
  });
  it("validado solo con validación formal", () => {
    expect(assetRegistryStatus({ ...complete, validatedAt: "2026-11-12T10:00:00Z" }).status).toBe("Validado");
  });
});
