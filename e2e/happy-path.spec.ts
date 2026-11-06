import { expect, test } from "@playwright/test";

test("registers, creates a course and generates a rubric through the real API", async ({ page }) => {
  const email = `playwright-${Date.now()}@example.com`;
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
    if (process.env.REVIEW_SCREENSHOTS) await page.screenshot({ path: "/tmp/smart-rubric-dashboard.png", fullPage: true });

    await page.goto("/app/courses/00000000-0000-0000-0000-000000000099");
    await expect(page.getByRole("alert")).toContainText("Course not found.");
    await page.goto("/app");

    await page.getByRole("main").getByRole("link", { name: /Crear curso/ }).first().click();
    await page.getByRole("button", { name: /Pegar texto/ }).click();
    await page.getByLabel("Nombre del curso").fill("Lenguaje 8° básico");
    await page.getByLabel("Texto del programa").fill(
      "Unidad 1: Narrativa\nObjetivo: Analizar la construcción de personajes.\nContenido: Narrador y focalización.\nUnidad 2: Argumentación\nObjetivo: Defender una postura con evidencia.\nContenido: Tesis y fuentes.",
    );
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\/app\/courses\/[0-9a-f-]+(?:\?.*)?$/);
    courseId = new URL(page.url()).pathname.split("/").pop();
    await expect(page.getByRole("heading", { name: "Unidades, objetivos y contenidos" })).toBeVisible();

    await page.getByRole("link", { name: /Crear evaluación/ }).click();
    await page.getByLabel("Nombre de la evaluación").fill("Ensayo argumentativo");
    await page.getByLabel("Describe la actividad").fill("Quiero evaluar un ensayo argumentativo con evidencia y una conclusión clara.");
    await expect(page.getByText("Paso 1 de 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 2 de 3", { exact: true })).toBeVisible();
    await page.getByLabel("Unidad del curso").selectOption({ label: "Unidad 2: Argumentación" });
    await page.getByRole("checkbox").first().check();
    await page.getByRole("checkbox").nth(1).check();
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
    await expect(page.getByRole("heading", { name: "Ensayo argumentativo" })).toBeVisible();
    await expect(page.getByText("Unidad: Unidad 2: Argumentación.")).toBeVisible();
    await page.getByRole("button", { name: /Generar primera versión/ }).click();
    await expect(page.getByRole("heading", { name: "Rúbrica: Ensayo argumentativo" }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("row", { name: /Puntaje/ }).first()).toContainText("0");
    if (process.env.REVIEW_SCREENSHOTS) {
      await page.screenshot({ path: "/tmp/smart-rubric-chat-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "/tmp/smart-rubric-chat-mobile.png", fullPage: true });
      await page.getByRole("button", { name: "Abrir menú" }).click();
    }

    const stored = await page.evaluate(() => window.localStorage.getItem("smart-rubric.auth"));
    accessToken = stored ? (JSON.parse(stored) as { accessToken: string }).accessToken : undefined;

    if (courseId && accessToken) {
      const cleanupStatus = await page.evaluate(async ({ id, token }) => {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/courses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        return response.status;
      }, { id: courseId, token: accessToken });
      expect(cleanupStatus).toBe(200);
      courseId = undefined;
    }

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    if (!accessToken) {
      const stored = await page.evaluate(() => window.localStorage.getItem("smart-rubric.auth")).catch(() => null);
      accessToken = stored ? (JSON.parse(stored) as { accessToken: string }).accessToken : undefined;
    }
    if (courseId && accessToken) {
      const cleanupStatus = await page.evaluate(async ({ id, token }) => {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/courses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        return response.status;
      }, { id: courseId, token: accessToken });
      expect(cleanupStatus).toBe(200);
    }
  }
});
