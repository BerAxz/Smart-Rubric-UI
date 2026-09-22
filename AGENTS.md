# AGENTS.md — Smart Rubric UI

Este archivo es el contexto operativo para agentes que trabajen en el frontend. Lee también
`.agents/project-context.md` y `.agents/workflow.md` antes de una tarea.

## Reglas obligatorias

- No hagas commits ni pushes desde `main`, `master`, `develop` o `dev`.
- Crea una rama `feature/<nombre>`, `fix/<nombre>` o `chore/<nombre>` desde `origin/dev`.
- En este proyecto el remoto no tiene `develop`; `dev` es la rama base equivalente y está
  documentada como tal.
- Ejecuta `scripts/setup-hooks.sh` una vez por clon. Los hooks rechazan commits y pushes en
  ramas protegidas.
- No guardes secretos, PDFs, tokens ni artefactos de Playwright en Git.
- Si cambias el contrato, modifica primero el backend, ejecuta `npm run generate:api` y revisa el
  diff de `src/api/generated.ts`; no edites ese archivo a mano.

## Ciclo mínimo

1. Inspecciona la página, componente, servicio API, tipos generados, estilos y pruebas afectadas.
2. Conserva estados explícitos de carga, error, sesión vencida y responsive.
3. Mantén la exportación local y la visualización estructurada dentro del flujo de conversación.
4. Ejecuta `npm run lint`, `npm run typecheck`, `npm test -- --run` y `npm run build`.
5. Actualiza `.agents/project-context.md` si cambia una ruta, un contrato o una decisión de UX.

## Comandos principales

```bash
scripts/setup-hooks.sh
npm run generate:api
npm run lint
npm run typecheck
npm test -- --run
npm run build
```
