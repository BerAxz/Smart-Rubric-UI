import { expect, test } from "@playwright/test";
import { jsPDF } from "jspdf";

test("uses the PDF task and keeps objectives as rubric alignment", async ({ page }) => {
  const email = `pdf-context-${Date.now()}@example.com`;
  let courseId: string | undefined;
  let accessToken: string | undefined;

  try {
    await page.goto("/register");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("correct-horse");
    await page.getByLabel("Repite la contraseña").fill("correct-horse");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/app$/);

    await page.getByRole("main").getByRole("link", { name: "Nuevo curso" }).click();
    await page.getByLabel("Nombre del curso").fill("Ciencias naturales");
    await page.getByLabel("Texto del curso").fill(
      "Objetivo: Analizar las causas y consecuencias de la transición energética.\nContenido: Evidencia científica y propuestas.",
    );
    await page.getByRole("button", { name: "Crear curso" }).click();
    await expect(page).toHaveURL(/\/app\/courses\/[0-9a-f-]+$/);
    courseId = page.url().split("/").pop();

    await page.getByRole("link", { name: /Nueva evaluación/ }).first().click();
    await page.getByLabel("Nombre de la evaluación").fill("Presentación sobre energías renovables");

    const pdf = new jsPDF();
    pdf.text("Consigna: realiza una presentación oral sobre energías renovables.", 20, 20);
    pdf.text("Explica una propuesta con evidencia científica para una audiencia escolar.", 20, 30);
    await page.locator('input[type="file"]').setInputFiles({
      name: "evaluacion-energias-renovables.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(pdf.output("arraybuffer")),
    });
    await page.getByRole("checkbox").first().check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "Crear evaluación" }).click();
    await expect(page).toHaveURL(/\/app\/evaluations\//);

    await page.getByRole("link", { name: /Abrir chat/ }).click();
    await page.getByRole("button", { name: /Generar primera versión/ }).click();
    await expect(
      page.getByRole("heading", { name: "Rúbrica: Presentación sobre energías renovables" }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Se analizó la evaluación en PDF/)).toBeVisible();
    await expect(page.getByText("Comunicación oral y recursos de apoyo", { exact: true })).toBeVisible();
    await expect(page.getByText("Analizar las causas y consecuencias", { exact: false }).first()).toBeVisible();
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
