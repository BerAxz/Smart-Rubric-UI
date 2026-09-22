import { expect, test } from "@playwright/test";

test("registers, creates a course and generates a rubric through the real API", async ({ page }) => {
  const email = `playwright-${Date.now()}@example.com`;
  let courseId: string | undefined;
  let accessToken: string | undefined;

  try {
    await page.goto("/register");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("correct-horse");
    await page.getByLabel("Repite la contraseña").fill("correct-horse");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/app$/);
    if (process.env.REVIEW_SCREENSHOTS) await page.screenshot({ path: "/tmp/smart-rubric-dashboard.png", fullPage: true });

    await page.goto("/app/courses/00000000-0000-0000-0000-000000000099");
    await expect(page.getByRole("alert")).toContainText("Course not found.");
    await page.goto("/app");

    await page.getByRole("main").getByRole("link", { name: "Nuevo curso" }).click();
    await page.getByLabel("Nombre del curso").fill("Lenguaje 8° básico");
    await page.getByLabel("Texto del curso").fill("Objetivo: Analizar textos argumentativos.\nContenido: Argumentación y evidencia.");
    await page.getByRole("button", { name: "Crear curso" }).click();
    await expect(page).toHaveURL(/\/app\/courses\/[0-9a-f-]+$/);
    courseId = page.url().split("/").pop();
    await expect(page.getByRole("heading", { name: "Objetivos y contenidos" })).toBeVisible();

    await page.getByRole("link", { name: /Nueva evaluación/ }).first().click();
    await page.getByLabel("Nombre de la evaluación").fill("Ensayo argumentativo");
    await page.getByRole("radio", { name: /Escribir un contexto/ }).check();
    await page.getByLabel("Contexto de la actividad").fill("Quiero evaluar un ensayo argumentativo con evidencia y una conclusión clara.");
    await page.getByRole("checkbox").first().check();
    await page.getByRole("checkbox").nth(1).check();
    await page.getByRole("button", { name: "Crear evaluación" }).click();
    await expect(page).toHaveURL(/\/app\/evaluations\//);

    await page.getByRole("link", { name: /Abrir chat/ }).click();
    await expect(page.getByRole("heading", { name: "Ensayo argumentativo" })).toBeVisible();
    await page.getByRole("button", { name: /Generar primera versión/ }).click();
    await expect(page.getByRole("heading", { name: "Rúbrica: Ensayo argumentativo" }).first()).toBeVisible({ timeout: 20_000 });
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

    await page.getByRole("button", { name: "Salir" }).click();
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
