import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";

test("uses the PDF task and keeps objectives as rubric alignment", async ({ page }) => {
  const email = `pdf-context-${Date.now()}@example.com`;
  let courseId: string | undefined;
  let accessToken: string | undefined;

  try {
    await page.goto("/register");
    await page.getByLabel("Nombre completo").fill("Docente de prueba");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("correct-horse");
    await page.getByLabel("Confirmar contraseña").fill("correct-horse");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/app$/);

    await page.getByRole("main").getByRole("link", { name: /Crear curso/ }).first().click();
    await page.getByRole("button", { name: /Pegar texto/ }).click();
    await page.getByLabel("Nombre del curso").fill("Ciencias naturales");
    await page.getByLabel("Texto del programa").fill(
      "Objetivo: Analizar las causas y consecuencias de la transición energética.\nContenido: Evidencia científica y propuestas.",
    );
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\/app\/courses\/[0-9a-f-]+(?:\?.*)?$/);
    courseId = new URL(page.url()).pathname.split("/").pop();

    await page.getByRole("link", { name: /Crear evaluación/ }).click();
    await page.getByLabel("Nombre de la evaluación").fill("Presentación sobre energías renovables");
    await page.getByRole("tab", { name: "Subir PDF" }).click();

    const pdf = new jsPDF();
    pdf.text("Consigna: realiza una presentación oral sobre energías renovables.", 20, 20);
    pdf.text("Explica una propuesta con evidencia científica para una audiencia escolar.", 20, 30);
    await page.locator('input[type="file"]').setInputFiles({
      name: "evaluacion-energias-renovables.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(pdf.output("arraybuffer")),
    });
    await expect(page.getByText("Paso 1 de 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 2 de 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 3 de 3", { exact: true })).toBeVisible();
    const evaluationCreated = page.waitForResponse((response) =>
      response.request().method() === "POST" && /\/api\/v1\/(?:courses\/[^/]+\/)?evaluations$/.test(response.url()) && response.ok(),
    );
    const createButton = page.getByRole("button", { name: "Crear evaluación" });
    await expect(createButton).toBeEnabled();
    await Promise.all([evaluationCreated, createButton.click({ timeout: 10_000 }).catch(() => undefined)]);
    await expect(page).toHaveURL(/\/app\/evaluations\//);

    await page.getByRole("link", { name: /Abrir chat/ }).click();
    await page.getByRole("button", { name: /Generar primera versión/ }).click();
    await expect(
      page.getByRole("heading", { name: "Rúbrica: Presentación sobre energías renovables" }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("evaluacion-energias-renovables.pdf", { exact: false }).first()).toBeVisible();
    const rubricTable = page.getByRole("table");
    await expect(rubricTable).toBeVisible();
    await expect(rubricTable.locator("tbody tr")).not.toHaveCount(0);
    await expect(rubricTable).toContainText(/presentación|energías renovables/i);
    await expect(page.getByText("Resultado", { exact: true })).toHaveCount(0);

    const stored = await page.evaluate(() => window.localStorage.getItem("smart-rubric.auth"));
    accessToken = stored ? (JSON.parse(stored) as { accessToken: string }).accessToken : undefined;
  } finally {
    if (!accessToken) {
      const stored = await page.evaluate(() => window.localStorage.getItem("smart-rubric.auth")).catch(() => null);
      accessToken = stored ? (JSON.parse(stored) as { accessToken: string }).accessToken : undefined;
    }
    if (courseId && accessToken) {
      const cleanupStatus = await page.evaluate(async ({ id, token }) => {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/courses/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.status;
      }, { id: courseId, token: accessToken });
      expect(cleanupStatus).toBe(200);
    }
  }
});
