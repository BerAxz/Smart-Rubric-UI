import type { components } from "../api/generated";

export type RubricCriterionPayload = Omit<components["schemas"]["RubricCriterion"], "description"> & {
  description?: string | null;
};

export type RubricPayload = Omit<components["schemas"]["RubricPayload"], "criteria"> & {
  criteria: RubricCriterionPayload[];
};

const rubricColors = {
  headerGreen: "B3E5A1",
  contentYellow: "FEE6A4",
  scoreYellow: "FEF1CE",
  scaleHeader: "EEEDEA",
  line: "000000",
  scaleLine: "D9D9D9",
  white: "FFFFFF",
  noteRed: "FF0000",
};

function rubricLevels(rubric: RubricPayload) {
  return rubric.criteria[0] ? Object.keys(rubric.criteria[0].levels) : [];
}

export function rubricScoreForLevel(criterion: RubricPayload["criteria"][number], level: string, index: number) {
  const score = criterion.scores?.[level];
  return typeof score === "number" && Number.isFinite(score) && score >= 0 ? score : index;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item));
}

function isRubricCriterion(value: unknown): value is RubricCriterionPayload {
  if (!isRecord(value)) return false;
  const descriptionIsValid = value.description === undefined || value.description === null || typeof value.description === "string";
  const scoresAreValid = value.scores === undefined || isNumberRecord(value.scores);
  return typeof value.criterion === "string" &&
    descriptionIsValid &&
    isStringRecord(value.levels) &&
    scoresAreValid;
}

export function isRubricPayload(value: unknown): value is RubricPayload {
  if (!isRecord(value) || typeof value.title !== "string" || !Array.isArray(value.criteria)) return false;
  const instructionsAreValid = value.instructions === undefined || value.instructions === null || typeof value.instructions === "string";
  const suggestionsAreValid = value.suggestions === undefined ||
    (Array.isArray(value.suggestions) && value.suggestions.every((item) => typeof item === "string"));
  return instructionsAreValid && suggestionsAreValid && value.criteria.every(isRubricCriterion);
}

export function rubricCriterionText(criterion: Pick<RubricCriterionPayload, "criterion" | "description">) {
  const description = criterion.description?.trim();
  return description ? `${criterion.criterion} — ${description}` : criterion.criterion;
}

function markdownCell(value: string) {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

export function rubricToMarkdown(rubric: RubricPayload, evaluationName: string) {
  const levels = rubricLevels(rubric);
  const lines = [`# ${rubric.title || evaluationName}`, "", `Evaluación: ${evaluationName}`, ""];
  if (rubric.instructions) lines.push("## Instrucciones", "", rubric.instructions, "");
  lines.push(
    "## Criterios",
    "",
    `| Criterio | ${levels.map(markdownCell).join(" | ")} |`,
    "| --- |" + levels.map(() => " --- |").join(""),
  );
  for (const criterion of rubric.criteria) {
    lines.push(
      `| ${markdownCell(rubricCriterionText(criterion))} | ${levels.map((level) => markdownCell(criterion.levels[level] ?? "")).join(" | ")} |`,
      `| Puntaje | ${levels.map((level, index) => rubricScoreForLevel(criterion, level, index)).join(" | ")} |`,
    );
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
  const body = rubric.criteria.flatMap((criterion) => [
    [rubricCriterionText(criterion), ...levels.map((level) => criterion.levels[level] ?? "")],
    ["Puntaje", ...levels.map((level, index) => rubricScoreForLevel(criterion, level, index))],
  ]);
  autoTable(document, {
    startY: rubric.instructions ? 40 : 32,
    head: [["Criterio", ...levels]],
    body,
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak", lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [179, 229, 161], textColor: [0, 0, 0] },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.row.index % 2 === 1) {
        data.cell.styles.fillColor = [254, 241, 206];
        data.cell.styles.fontStyle = data.column.index === 0 ? "bold" : "normal";
      } else if (data.column.index === 0) {
        data.cell.styles.fillColor = [254, 230, 164];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  document.save(`${safeFilename(evaluationName)}.pdf`);
}

export async function downloadRubricExcel(rubric: RubricPayload, evaluationName: string) {
  const file = await createRubricExcelFile(rubric, evaluationName);
  downloadBlob(
    file,
    `${safeFilename(evaluationName)}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}

export async function createRubricExcelFile(rubric: RubricPayload, evaluationName: string) {
  const [XLSX, fflate] = await Promise.all([import("xlsx-js-style"), import("fflate")]);
  const workbook = await createRubricExcelWorkbook(rubric, evaluationName);
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const archive = fflate.unzipSync(data instanceof Uint8Array ? data : new Uint8Array(data));
  const sheetPath = "xl/worksheets/sheet1.xml";
  let sheetXml = fflate.strFromU8(archive[sheetPath]);
  const pageSetupProperties = '<pageSetUpPr fitToPage="1"/>';

  if (/<sheetPr\b/.test(sheetXml)) {
    if (!/<pageSetUpPr\b/.test(sheetXml)) {
      sheetXml = sheetXml.replace("</sheetPr>", `${pageSetupProperties}</sheetPr>`);
    }
  } else {
    sheetXml = sheetXml.replace(/(<worksheet\b[^>]*>)/, `$1<sheetPr>${pageSetupProperties}</sheetPr>`);
  }

  const pageSetup = '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="1"/>';
  if (/<pageSetup\b/.test(sheetXml)) {
    sheetXml = sheetXml.replace(/<pageSetup\b[^>]*\/>/, pageSetup);
  } else if (/<pageMargins\b[^>]*\/>/.test(sheetXml)) {
    sheetXml = sheetXml.replace(/(<pageMargins\b[^>]*\/>)/, `$1${pageSetup}`);
  } else {
    sheetXml = sheetXml.replace("</worksheet>", `${pageSetup}</worksheet>`);
  }

  archive[sheetPath] = fflate.strToU8(sheetXml);
  return fflate.zipSync(archive, { level: 6 });
}

export async function createRubricExcelWorkbook(rubric: RubricPayload, evaluationName: string) {
  const XLSX = await import("xlsx-js-style");
  const levels = rubricLevels(rubric);
  const gradeStartColumn = levels.length + 2;
  const totalColumns = gradeStartColumn + 4;
  const makeRow = () => Array<string | number>(totalColumns).fill("");
  const rows: (string | number)[][] = [makeRow()];
  rows[0][0] = "Contenido";
  rows[0][1] = "Rubrica General";
  rows[0][gradeStartColumn] = "Puntaje";
  rows[0][gradeStartColumn + 1] = "Nota";
  rows[0][gradeStartColumn + 2] = "Puntaje";
  rows[0][gradeStartColumn + 3] = "Nota";

  const criterionScores = rubric.criteria.map((criterion) =>
    levels.map((level, index) => rubricScoreForLevel(criterion, level, index)),
  );
  const maxPoints = criterionScores.reduce(
    (total, scores) => total + Math.max(0, ...scores),
    0,
  );
  const totalPointValues = Array.from({ length: maxPoints + 1 }, (_, index) => index);
  const leftScaleRows = Math.ceil(totalPointValues.length / 2);

  rubric.criteria.forEach((criterion, criterionIndex) => {
    const descriptorRow = makeRow();
    descriptorRow[0] = criterion.criterion;
    levels.forEach((level, index) => {
      descriptorRow[index + 1] = criterion.levels[level] ?? "";
    });
    rows.push(descriptorRow);

    const scoreRow = makeRow();
    scoreRow[0] = "Puntaje";
    levels.forEach((level, index) => {
      scoreRow[index + 1] = criterionScores[criterionIndex][index];
    });
    rows.push(scoreRow);
  });

  while (rows.length < leftScaleRows + 1) rows.push(makeRow());
  for (let index = 0; index < leftScaleRows; index += 1) {
    const point = totalPointValues[index];
    const row = rows[index + 1];
    row[gradeStartColumn] = point;
    row[gradeStartColumn + 1] = gradeForScore(point, maxPoints);
    const rightPoint = totalPointValues[index + leftScaleRows];
    if (rightPoint !== undefined) {
      row[gradeStartColumn + 2] = rightPoint;
      row[gradeStartColumn + 3] = gradeForScore(rightPoint, maxPoints);
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const rubricColumnCount = levels.length + 1;
  const lastRubricColumn = rubricColumnCount - 1;
  const mainBorder = makeBorder(rubricColors.line);
  const scaleBorder = makeBorder(rubricColors.scaleLine);
  const headerStyle = {
    fill: { fgColor: { rgb: rubricColors.headerGreen } },
    font: { bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: mainBorder,
  };
  const descriptorStyle = {
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: mainBorder,
  };
  const criterionStyle = {
    fill: { fgColor: { rgb: rubricColors.contentYellow } },
    font: { bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    border: mainBorder,
  };
  const scoreStyle = {
    fill: { fgColor: { rgb: rubricColors.scoreYellow } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: mainBorder,
  };
  const gradeHeaderStyle = {
    fill: { fgColor: { rgb: rubricColors.scaleHeader } },
    font: { bold: true, color: { rgb: "595959" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: scaleBorder,
  };
  const gradeCellStyle = {
    fill: { fgColor: { rgb: rubricColors.white } },
    alignment: { horizontal: "center", vertical: "center" },
    border: scaleBorder,
  };
  const noteCellStyle = {
    ...gradeCellStyle,
    font: { color: { rgb: rubricColors.noteRed } },
    numFmt: "0.0",
  };
  const cellAddress = (row: number, column: number) => XLSX.utils.encode_cell({ r: row, c: column });
  const applyStyle = (row: number, column: number, style: object) => {
    const address = cellAddress(row, column);
    sheet[address] ??= { t: "s", v: "" };
    sheet[address].s = style;
  };

  for (let column = 0; column < rubricColumnCount; column += 1) applyStyle(0, column, headerStyle);
  for (let column = 0; column < 4; column += 1) {
    applyStyle(0, gradeStartColumn + column, gradeHeaderStyle);
  }
  rubric.criteria.forEach((criterion, criterionIndex) => {
    const descriptorRowIndex = criterionIndex * 2 + 1;
    const scoreRowIndex = descriptorRowIndex + 1;
    applyStyle(descriptorRowIndex, 0, criterionStyle);
    for (let column = 1; column < rubricColumnCount; column += 1) {
      applyStyle(descriptorRowIndex, column, descriptorStyle);
    }
    for (let column = 0; column < rubricColumnCount; column += 1) {
      applyStyle(scoreRowIndex, column, scoreStyle);
    }
  });
  for (let index = 0; index < totalPointValues.length; index += 1) {
    const row = index + 1;
    for (const column of [gradeStartColumn, gradeStartColumn + 2]) applyStyle(row, column, gradeCellStyle);
    for (const column of [gradeStartColumn + 1, gradeStartColumn + 3]) applyStyle(row, column, noteCellStyle);
  }

  sheet["!merges"] = [{ s: { r: 0, c: 1 }, e: { r: 0, c: lastRubricColumn } }];
  sheet["!cols"] = [
    { wch: 28 },
    ...levels.map(() => ({ wch: 33 })),
    { wch: 3 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
  ];
  sheet["!rows"] = rows.map((row, index) => {
    if (index === 0) return { hpt: 23 };
    const isDescriptorRow = index % 2 === 1 && index <= rubric.criteria.length * 2;
    if (isDescriptorRow) {
      const criterion = rubric.criteria[(index - 1) / 2];
      const maxLines = Math.max(
        Math.ceil(criterion.criterion.length / 28),
        ...levels.map((level) => Math.ceil((criterion.levels[level] ?? "").length / 33)),
      );
      return { hpt: Math.max(42, Math.min(90, 13 + maxLines * 11)) };
    }
    return { hpt: 18 };
  });
  sheet["!margins"] = { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 };
  sheet["!sheetViews"] = [{ showGridLines: true }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Rúbrica");
  workbook.Props = { Title: evaluationName, Subject: "Rúbrica de evaluación" };
  return workbook;
}

function gradeForScore(score: number, maxScore: number) {
  if (maxScore <= 0) return 1;
  const proportion = score / maxScore;
  const grade = proportion <= 0.6
    ? 1 + (proportion / 0.6) * 3
    : 4 + ((proportion - 0.6) / 0.4) * 3;
  return Number(grade.toFixed(1));
}

function makeBorder(color: string) {
  const side = { style: "thin", color: { rgb: color } };
  return { top: side, bottom: side, left: side, right: side };
}

function safeFilename(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rubrica";
}
