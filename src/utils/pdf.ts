import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractPdfText(file: File): Promise<string> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Selecciona un archivo PDF.");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("El PDF no puede superar los 10 MB.");
  const document = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  const text = pages.join("\n\n").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("No encontramos texto extraíble en el PDF.");
  return text;
}
