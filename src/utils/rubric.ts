import type { components } from "../api/generated";

export type RubricPayload = components["schemas"]["RubricPayload"];

export function isRubricPayload(value: unknown): value is RubricPayload {
  if (!value || typeof value !== "object") return false;
  const rubric = value as Record<string, unknown>;
  return typeof rubric.title === "string" && Array.isArray(rubric.criteria) && rubric.criteria.every((criterion) => {
    if (!criterion || typeof criterion !== "object") return false;
    const item = criterion as Record<string, unknown>;
    return typeof item.criterion === "string" && typeof item.description === "string" && typeof item.levels === "object" && item.levels !== null;
  });
}

export function rubricToMarkdown(rubric: RubricPayload, evaluationName: string) {
  const levels = rubric.criteria[0] ? Object.keys(rubric.criteria[0].levels) : [];
  const lines = [`# ${rubric.title || evaluationName}`, "", `Evaluación: ${evaluationName}`, ""];
  if (rubric.instructions) lines.push("## Instrucciones", "", rubric.instructions, "");
  lines.push("## Criterios", "", `| Criterio | Descripción | ${levels.join(" | ")} |`, "| --- | --- |" + levels.map(() => " --- | ").join(""));
  for (const criterion of rubric.criteria) {
    lines.push(`| ${criterion.criterion} | ${criterion.description} | ${levels.map((level) => criterion.levels[level] ?? "").join(" | ")} |`);
  }
  if (rubric.suggestions?.length) lines.push("", "## Sugerencias", "", ...rubric.suggestions.map((suggestion) => `- ${suggestion}`));
  return `${lines.join("\n")}\n`;
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadRubricMarkdown(rubric: RubricPayload, evaluationName: string) {
  downloadBlob(rubricToMarkdown(rubric, evaluationName), `${safeFilename(evaluationName)}.md`, "text/markdown;charset=utf-8");
}

export async function downloadRubricPdf(rubric: RubricPayload, evaluationName: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
  const document = new jsPDF({ orientation: "landscape" });
  document.setFontSize(18);
  document.text(rubric.title || evaluationName, 14, 18);
  document.setFontSize(10);
  document.text(`Evaluación: ${evaluationName}`, 14, 26);
  if (rubric.instructions) document.text(rubric.instructions.slice(0, 180), 14, 34);
  const levels = rubric.criteria[0] ? Object.keys(rubric.criteria[0].levels) : [];
  autoTable(document, {
    startY: rubric.instructions ? 40 : 32,
    head: [["Criterio", "Descripción", ...levels]],
    body: rubric.criteria.map((criterion) => [criterion.criterion, criterion.description, ...levels.map((level) => criterion.levels[level] ?? "")]),
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [16, 43, 63] },
  });
  document.save(`${safeFilename(evaluationName)}.pdf`);
}

export async function downloadRubricExcel(rubric: RubricPayload, evaluationName: string) {
  const XLSX = await import("xlsx-js-style");
  const levels = rubric.criteria[0] ? Object.keys(rubric.criteria[0].levels) : [];
  const rows: string[][] = [[rubric.title || evaluationName], ["Criterio", "Descripción", ...levels]];
  for (const criterion of rubric.criteria) rows.push([criterion.criterion, criterion.description, ...levels.map((level) => criterion.levels[level] ?? "")]);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["A1"].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "102B3F" } } };
  sheet["!cols"] = [{ wch: 28 }, { wch: 36 }, ...levels.map(() => ({ wch: 30 }))];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Rúbrica");
  XLSX.writeFile(workbook, `${safeFilename(evaluationName)}.xlsx`);
}

function safeFilename(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rubrica";
}
