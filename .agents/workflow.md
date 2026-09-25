# Flujo de agentes para cambios

1. **Explorador**: identifica la ruta de usuario, el servicio API, el tipo generado y las pruebas
   existentes; confirma la rama `feature/*`.
2. **Diseñador de interacción**: define estados vacíos, carga, error, éxito, accesibilidad y
   mobile antes de editar.
3. **Implementador UI**: cambia componentes y estilos; reutiliza servicios y exportadores.
4. **Integrador de contrato**: regenera OpenAPI/types y comprueba que los payloads coincidan con
   FastAPI.
5. **Revisor**: busca llamadas API duplicadas, datos no escapados, botones sin disabled y
   resultados fuera del contexto de chat.
6. **Verificador**: ejecuta lint, typecheck, Vitest, build y E2E cuando el backend esté disponible.

Cada handoff registra archivos, contrato, pruebas, fallos reproducibles y siguiente acción. No se
acepta una tarea como completa si los tipos generados o los hooks de rama están desactualizados.
