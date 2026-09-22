import { ArrowRight, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { components } from "../api/generated";
import { courseApi, evaluationApi } from "../api/services";
import { ApiErrorMessage, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/common";
import { formatDate } from "../utils/format";

export function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<components["schemas"]["EvaluationRead"][]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [evaluationResponse, courseResponse] = await Promise.all([evaluationApi.list(), courseApi.list()]);
      setEvaluations(evaluationResponse.items);
      setCourses(Object.fromEntries(courseResponse.items.map((course) => [course.id, course.name])));
    } catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <LoadingState label="Cargando evaluaciones…" />;
  return <div className="content-narrow"><PageHeader eyebrow="Biblioteca" title="Todas tus evaluaciones" description="Accede a cualquier evaluación y retoma su conversación." />{error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : evaluations.length === 0 ? <EmptyState title="Aún no tienes evaluaciones" description="Crea una desde cualquiera de tus cursos para verla aquí." /> : <div className="evaluation-list">{evaluations.map((evaluation) => <Link className="evaluation-card" key={evaluation.id} to={`/app/evaluations/${evaluation.id}`}><div className="evaluation-card__icon"><FileText size={18} aria-hidden="true" /></div><div><h3>{evaluation.name}</h3><p>{courses[evaluation.course_id] ?? "Curso"} · {evaluation.learning_outcomes.length} objetivos · {evaluation.achievement_levels.length} niveles</p><small>Actualizada {formatDate(evaluation.updated_at)}</small></div><ArrowRight className="entity-card__arrow" size={18} aria-hidden="true" /></Link>)}</div>}</div>;
}
