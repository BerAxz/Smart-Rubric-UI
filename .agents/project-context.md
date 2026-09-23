# Contexto del proyecto — UI

## Arquitectura

- SPA React 19 + TypeScript + Vite con rutas protegidas bajo `/app`.
- `src/api/client.ts` centraliza bearer token, refresh y errores; `src/api/services.ts` contiene
  las operaciones por dominio.
- `src/api/generated.ts` se genera desde el OpenAPI del repositorio API vecino.
- La creación de evaluación vive en `EvaluationForm`; admite una fuente PDF o contexto escrito y
  exige seleccionar la unidad que delimita el análisis de la IA.
- `ChatPage` es deliberadamente una sola conversación: la rúbrica estructurada aparece como una
  tarjeta de un mensaje del asistente, y sus exportaciones parten de esa tarjeta.
- `src/utils/rubric.ts` exporta Markdown, PDF y Excel en el navegador.

## Contratos importantes

- Un PDF se sube con checksum y URL prefirmada; si el proveedor no permite CORS se usa el fallback
  multipart autenticado. Nunca se envían credenciales del bucket al navegador.
- `EvaluationCreate.source_document_id` solo se envía después de que `sourceDocumentApi.uploadFile`
  devuelve un documento `ready`.
- Una respuesta de chat puede incluir `structured_payload`; `isRubricPayload` decide si se muestra
  como rúbrica visual o como Markdown normal.
- Si cambia el backend, ejecuta `npm run generate:api` antes de tocar componentes.

La respuesta de chat se genera con la unidad completa, no solo con los objetivos marcados. El
usuario puede pedir en el mismo chat que se cambie, elimine o agregue un criterio; la interfaz
visualiza y exporta la versión completa devuelta por cada turno.

## Puntos de extensión

- Campos de creación/edición: `src/components/EvaluationForm.tsx`.
- Flujo de subida: `src/api/services.ts` y `CourseCreatePage.tsx` como referencia.
- Visualización/exportación: `src/pages/ChatPage.tsx` y `src/utils/rubric.ts`.
- Diseño global: `src/styles.css`; conserva la adaptación móvil de la tabla mediante scroll.
