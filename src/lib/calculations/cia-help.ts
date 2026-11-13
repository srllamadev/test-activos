import type { CiaDimension } from "./cia";

/**
 * Descripciones por nivel (1–5) tomadas de la hoja "Criterios CIA" del Excel.
 * Son textos de ayuda contextual; los criterios deben ser aprobados por la organización.
 */
export const CIA_HELP: Record<CiaDimension, Record<1 | 2 | 3 | 4 | 5, string>> = {
  confidencialidad: {
    1: "Exposición de impacto insignificante",
    2: "Exposición limitada, recuperable",
    3: "Exposición interna con consecuencias moderadas",
    4: "Divulgación de datos sensibles con impacto grave",
    5: "Divulgación con consecuencias críticas o legales",
  },
  integridad: {
    1: "Error sin afectación relevante",
    2: "Error menor, corrección sencilla",
    3: "Errores que afectan un proceso importante",
    4: "Modificación que altera decisiones críticas",
    5: "Alteración crítica o irreversible",
  },
  disponibilidad: {
    1: "Interrupción insignificante",
    2: "Interrupción menor tolerable",
    3: "Interrupción que degrada un proceso",
    4: "Interrupción grave de una operación esencial",
    5: "Paralización de servicios esenciales",
  },
};
