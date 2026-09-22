# Smart Rubric UI

Frontend nuevo de HochBot/Smart Rubric. Es una SPA de React + TypeScript que consume exclusivamente la API FastAPI bajo `/api/v1`; no contiene respuestas simuladas ni depende de Supabase o Django.

## Requisitos

- Node.js 22 o superior
- El backend ejecutándose en `http://localhost:8000` (consulta `../Smart-Rubric-API/README.md`)

## Desarrollo desde cero

Desde este directorio:

```bash
cp .env.example .env
npm install
npm run generate:api
npm run dev
```

Abre <http://localhost:5173>. `VITE_API_BASE_URL` permite apuntar a otra URL del backend y
`VITE_MAX_PDF_BYTES` solo ajusta la validación temprana de la interfaz; el límite efectivo lo
impone FastAPI. El archivo `src/api/generated.ts` se conserva en el repositorio para que el
build independiente también funcione; `npm run generate:api` lo actualiza desde
`../Smart-Rubric-API/backend/openapi/openapi.json`.

## Flujos incluidos

- Registro, inicio/cierre de sesión, renovación automática de tokens y redirección cuando la sesión vence.
- Recuperación y cambio de contraseña.
- Dashboard, listado global de evaluaciones y cuenta.
- Creación de cursos desde PDF o texto, edición de objetivos/contenidos, renombrado y archivado.
- Los PDFs se suben directamente a la URL prefirmada que entrega FastAPI; si el proveedor local no permite CORS, el cliente usa el fallback multipart autenticado. El navegador nunca recibe credenciales S3/R2/MinIO.
- Creación y edición de evaluaciones con niveles de logro, objetivos, contenidos, contexto y criterios adicionales.
- Chat persistido por evaluación conectado a la respuesta estructurada del backend.
- Exportación local de la rúbrica resultante a Markdown, PDF y Excel.

El cliente API centralizado (`src/api/client.ts`) agrega el bearer token, intenta una única renovación ante `401`, interpreta el contrato de error `{ error: { code, message, details } }` y limpia las credenciales cuando la sesión deja de ser válida.

## Verificaciones

```bash
npm run generate:api
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Con el backend real levantado, el flujo de navegador completo se puede comprobar con:

```bash
npx playwright install chromium
npm run test:e2e
```

## Producción local con Docker

El Dockerfile compila la SPA y la sirve con Nginx. `VITE_API_BASE_URL` se fija durante el build:

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 --build-arg VITE_MAX_PDF_BYTES=10485760 -t smart-rubric-ui .
docker run --rm -p 5173:80 smart-rubric-ui
```

Nginx usa `try_files` para que las rutas de React funcionen al recargar una URL profunda. El endpoint de health del contenedor es `/health`.

## Despliegue conjunto

1. En `../Smart-Rubric-API`, copia `.env.example` a `.env`, define un `JWT_SECRET_KEY` aleatorio y ejecuta `docker compose up --build -d`.
2. Comprueba `http://localhost:8000/api/v1/health` y confirma que `CORS_ORIGINS` incluya el origen real del frontend.
3. Construye el frontend con la URL pública de la API y publícalo detrás de HTTPS:

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.example.com --build-arg VITE_MAX_PDF_BYTES=10485760 -t smart-rubric-ui .
docker run --rm -p 5173:80 smart-rubric-ui
```

PostgreSQL se despliega junto al backend únicamente para desarrollo o una instalación local. Para producción se recomienda PostgreSQL administrado o una instancia privada, con credenciales en el gestor de secretos y backups/PITR configurados según el procedimiento del README del backend.

## Estructura relevante

```text
src/
  api/          cliente fetch, servicios y tipos generados desde OpenAPI
  auth/         sesión y protección de rutas
  components/   shell, formularios y estados reutilizables
  pages/        pantallas públicas y protegidas
  utils/        PDF, exportación y formato
```

La API real sigue siendo la autoridad de permisos. El frontend no intenta inferir acceso: ante una respuesta `401/403/404` muestra el error y permite volver a intentar o regresar al espacio de trabajo.
