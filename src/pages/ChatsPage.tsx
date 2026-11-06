import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { courseApi, evaluationApi } from "../api/services";
import type { components } from "../api/generated";
import { ApiErrorMessage, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/common";
import { ConversationRow } from "../components/WorkspaceCards";

type Evaluation = components["schemas"]["EvaluationRead"];

export function ChatsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evaluationResponse, courseResponse] = await Promise.all([evaluationApi.list(), courseApi.list()]);
      setEvaluations(evaluationResponse.items);
      setCourseNames(Object.fromEntries(courseResponse.items.map((course) => [course.id, course.name])));
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => evaluations.filter((evaluation) => {
    const haystack = `${evaluation.name} ${courseNames[evaluation.course_id] ?? ""}`.toLocaleLowerCase("es-CL");
    return haystack.includes(query.toLocaleLowerCase("es-CL"));
  }), [courseNames, evaluations, query]);

  if (loading) return <LoadingState label="Cargando conversaciones…" />;
  return (
    <div className="content-narrow data-page">
      <PageHeader title="Chats recientes" description="Retoma el trabajo en cualquiera de tus cursos." />
      <label className="page-search">
        <Search size={18} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar conversación…" aria-label="Buscar conversación" />
      </label>
      {error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : filtered.length === 0 ? (
        <EmptyState title={evaluations.length ? "No encontramos esa conversación" : "Todavía no hay conversaciones"} description={evaluations.length ? "Prueba con otro nombre." : "Crea una evaluación para abrir su conversación con Smart Rubric."} />
      ) : <div className="conversation-list">{filtered.map((evaluation) => <ConversationRow key={evaluation.id} evaluation={evaluation} courseName={courseNames[evaluation.course_id] ?? "Curso"} />)}</div>}
    </div>
  );
}
