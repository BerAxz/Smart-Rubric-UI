import { describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import * as XLSX from "xlsx-js-style";
import type { RubricPayload } from "./rubric";
import { createRubricExcelFile, createRubricExcelWorkbook, downloadRubricPdf, isRubricPayload, rubricToMarkdown } from "./rubric";

const pdfMocks = vi.hoisted(() => ({ autoTable: vi.fn(), text: vi.fn(), save: vi.fn() }));

vi.mock("jspdf", () => ({
  jsPDF: class MockJsPdf {
    setFontSize = vi.fn();
    text = pdfMocks.text;
    save = pdfMocks.save;
  },
}));

vi.mock("jspdf-autotable", () => ({ default: pdfMocks.autoTable }));

const achievementLevels = ["Inicial", "En desarrollo", "Logrado", "Sobresaliente"];
const rubric: RubricPayload = {
  title: "Rúbrica de prueba",
  criteria: Array.from({ length: 6 }, (_, index) => ({
    criterion: `Criterio ${index + 1}`,
    description: "Descripción observable del criterio.",
    levels: {
      Inicial: "Requiere apoyo.",
      "En desarrollo": "Muestra avances parciales.",
      Logrado: "Cumple lo esperado.",
      Sobresaliente: "Supera lo esperado con claridad.",
    },
    scores: {
      Inicial: 0,
      "En desarrollo": 1,
      Logrado: 2,
      Sobresaliente: 3,
    },
  })),
};

describe("rubric exports", () => {
  it("writes the expected rubric colors, point rows, and 60-percent grade scale to Excel", async () => {
    const workbook = await createRubricExcelWorkbook(rubric, "Evaluación de prueba");
    const sheet = workbook.Sheets["Rúbrica"];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, raw: true });

    expect(sheet["A1"].v).toBe("Contenido");
    expect(sheet["B1"].v).toBe("Rubrica General");
    expect(sheet["A2"].v).toBe("Criterio 1");
    expect(sheet["A1"].s.fill.fgColor.rgb).toBe("B3E5A1");
    expect(sheet["A2"].s.fill.fgColor.rgb).toBe("FEE6A4");
    expect(sheet["A3"].v).toBe("Puntaje");
    expect(sheet["A3"].s.fill.fgColor.rgb).toBe("FEF1CE");
    expect(rows[2].slice(1, 5)).toEqual([0, 1, 2, 3]);

    expect(sheet["G1"].v).toBe("Puntaje");
    expect(sheet["H1"].v).toBe("Nota");
    expect(sheet["G2"].v).toBe(0);
    expect(sheet["H2"].v).toBe(1);
    expect(sheet["I2"].v).toBe(10);
    expect(sheet["J2"].v).toBe(3.8);
    expect(sheet["G11"].v).toBe(9);
    expect(sheet["H11"].v).toBe(3.5);
    expect(sheet["I10"].v).toBe(18);
    expect(sheet["J10"].v).toBe(7);
    expect(sheet["H2"].s.font.color.rgb).toBe("FF0000");
    expect(sheet["!merges"]).toContainEqual({ s: { r: 0, c: 1 }, e: { r: 0, c: achievementLevels.length } });
    expect(workbook.Props?.Title).toBe("Evaluación de prueba");

    const serialized = await createRubricExcelFile(rubric, "Evaluación de prueba");
    const archive = unzipSync(serialized);
    const worksheetXml = strFromU8(archive["xl/worksheets/sheet1.xml"]);
    const stylesXml = strFromU8(archive["xl/styles.xml"]);
    const reopened = XLSX.read(serialized, { type: "array" });
    const exportedSheet = reopened.Sheets["Rúbrica"];
    expect(exportedSheet["A1"].v).toBe("Contenido");
    expect(exportedSheet["A3"].v).toBe("Puntaje");
    expect(exportedSheet["J10"].v).toBe(7);
    expect(worksheetXml).toContain('<pageSetUpPr fitToPage="1"/>');
    expect(worksheetXml).toContain('orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="1"');
    expect(stylesXml).toContain('rgb="FFB3E5A1"');
    expect(stylesXml).toContain('rgb="FFFEE6A4"');
    expect(stylesXml).toContain('rgb="FFFEF1CE"');
  });

  it("includes a score row for each criterion in Markdown", () => {
    const markdown = rubricToMarkdown(rubric, "Evaluación de prueba");

    expect(markdown).toContain("| Criterio | Inicial | En desarrollo | Logrado | Sobresaliente |");
    expect(markdown).toContain("| Criterio 1 — Descripción observable del criterio. | Requiere apoyo. | Muestra avances parciales. | Cumple lo esperado. | Supera lo esperado con claridad. |");
    expect(markdown).toContain("| Puntaje | 0 | 1 | 2 | 3 |");
    expect(markdown).not.toContain("Qué observar");
  });

  it("exports criteria without the legacy description field", async () => {
    const currentRubric: RubricPayload = {
      title: "Rúbrica actual",
      criteria: [{ criterion: "Claridad", levels: { Inicial: "Poco claro", Logrado: "Claro" } }],
    };
    const markdown = rubricToMarkdown(currentRubric, "Evaluación actual");
    const workbook = await createRubricExcelWorkbook(currentRubric, "Evaluación actual");

    expect(markdown).toContain("| Claridad | Poco claro | Claro |");
    expect(workbook.Sheets["Rúbrica"]["A2"].v).toBe("Claridad");
    expect(workbook.Sheets["Rúbrica"]["B2"].v).toBe("Poco claro");
  });

  it("exports PDF with the same criterion and level columns as the chat", async () => {
    pdfMocks.autoTable.mockClear();
    await downloadRubricPdf(rubric, "Evaluación de prueba");

    expect(pdfMocks.autoTable).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      head: [["Criterio", ...achievementLevels]],
      body: expect.arrayContaining([
        ["Criterio 1 — Descripción observable del criterio.", "Requiere apoyo.", "Muestra avances parciales.", "Cumple lo esperado.", "Supera lo esperado con claridad."],
        ["Puntaje", 0, 1, 2, 3],
      ]),
    }));
    expect(pdfMocks.save).toHaveBeenCalledWith("evaluacion-de-prueba.pdf");
  });
});

describe("rubric payload compatibility", () => {
  it("accepts legacy descriptions and criteria without descriptions", () => {
    const currentCriterion = {
      criterion: rubric.criteria[0].criterion,
      levels: rubric.criteria[0].levels,
      scores: rubric.criteria[0].scores,
    };

    expect(isRubricPayload(rubric)).toBe(true);
    expect(isRubricPayload({ ...rubric, criteria: [currentCriterion] })).toBe(true);
  });

  it("rejects invalid criterion levels and non-object level collections", () => {
    expect(isRubricPayload({
      title: "Rúbrica inválida",
      criteria: [{ criterion: "Criterio", levels: ["Inicial", "Logrado"] }],
    })).toBe(false);
    expect(isRubricPayload({
      title: "Rúbrica inválida",
      criteria: [{ criterion: "Criterio", levels: { Inicial: 0 } }],
    })).toBe(false);
  });
});
