# Contexto del proyecto — UI

## Arquitectura

- SPA React 19 + TypeScript + Vite con rutas protegidas bajo `/app`.
- `src/api/client.ts` centraliza bearer token, refresh y errores; `src/api/services.ts` contiene
  las operaciones por dominio.
- `src/api/generated.ts` se genera desde el OpenAPI del repositorio API vecino.
- La creación de evaluación vive en `EvaluationForm`; admite una fuente PDF o descripción escrita y
  presenta tres pasos: información, unidad/objetivos/contenidos y niveles de logro.
- `CourseCreatePage` crea el curso desde PDF o texto y dirige a `CourseDetailPage?review=1`; allí se
  revisan y guardan objetivos y contenidos con `courseApi.updateStructure` antes de iniciar una
  evaluación.
- La navegación de `/app` usa un sidebar de escritorio y un drawer móvil. `/app/courses`,
  `/app/chats` y `/app/settings` son rutas de biblioteca y preferencias; el tema claro/oscuro se
  persiste localmente desde `ThemeContext`.
- `ChatPage` es deliberadamente una sola conversación: la rúbrica estructurada aparece en el hilo
  con una columna de criterio y columnas para los niveles de logro. Las descripciones de criterios
  heredadas se muestran debajo del nombre del criterio; las rúbricas nuevas pueden omitirlas. El
  historial usa el scroll natural de la página, el compositor permanece fijo al borde inferior con
  espacio reservado para que no oculte el final, y solo se sigue una respuesta nueva si el usuario
  estaba al final; cargar una conversación no fuerza el desplazamiento.
- `src/utils/rubric.ts` exporta Markdown, PDF y Excel en el navegador. Excel replica la matriz de
  `Rubrica esperada.pdf`: encabezado verde, criterios amarillos, filas de puntaje y conversión de
  puntaje a nota con exigencia del 60 %. Las exportaciones de rúbricas usan el criterio y sus niveles
  directamente, sin una columna separada de «Qué observar».

## Contratos importantes

- Un PDF se sube con checksum y URL prefirmada; si el proveedor no permite CORS se usa el fallback
  multipart autenticado. Nunca se envían credenciales del bucket al navegador.
- `EvaluationCreate.source_document_id` solo se envía después de que `sourceDocumentApi.uploadFile`
  devuelve un documento `ready`.
- El endpoint de registro no recibe nombre completo. El frontend lo conserva localmente por correo
  hasta que se acuerde el cambio de perfil; la discrepancia está registrada en Smart-Rubric-API
  issue #5.
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
