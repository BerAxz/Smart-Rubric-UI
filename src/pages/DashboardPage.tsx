import { ArrowRight, BookOpen, FileText, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { components } from "../api/generated";
import { courseApi, evaluationApi } from "../api/services";
import { ApiErrorMessage, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/common";
import { formatDate, trimText } from "../utils/format";

type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];

export function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [courseResponse, evaluationResponse] = await Promise.all([courseApi.list(), evaluationApi.list()]);
      setCourses(courseResponse.items);
      setEvaluations(evaluationResponse.items);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LoadingState label="Cargando tu espacio…" />;
  return (
    <div className="content-narrow">
      <PageHeader
        eyebrow="Espacio de trabajo"
        title="Tus evaluaciones"
        description="Organiza cursos y convierte sus objetivos en rúbricas accionables."
        actions={<Link className="button button--primary" to="/app/courses/new"><Plus size={17} aria-hidden="true" /> Nuevo curso</Link>}
      />
      {error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : null}
      {!error && <>
        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">Base de trabajo</p><h2>Cursos</h2></div>{courses.length > 0 && <span className="count-badge">{courses.length}</span>}</div>
          {courses.length === 0 ? <EmptyState title="Aún no tienes cursos" description="Crea tu primer curso cargando el material o pegando su texto base." action={<Link className="button button--secondary" to="/app/courses/new"><Plus size={16} aria-hidden="true" /> Crear curso</Link>} /> : <div className="card-grid">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div>}
        </section>
        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">Trabajo reciente</p><h2>Evaluaciones</h2></div>{evaluations.length > 0 && <span className="count-badge">{evaluations.length}</span>}</div>
          {evaluations.length === 0 ? <EmptyState title="Todavía no hay evaluaciones" description="Abre un curso y selecciona sus objetivos para crear una." /> : <div className="evaluation-list">{evaluations.slice(0, 6).map((evaluation) => <EvaluationCard key={evaluation.id} evaluation={evaluation} />)}</div>}
        </section>
      </>}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return <Link className="entity-card" to={`/app/courses/${course.id}`}><div className="entity-card__icon"><BookOpen size={19} aria-hidden="true" /></div><div className="entity-card__body"><h3>{course.name}</h3><p>{course.learning_outcomes.length} objetivos · {course.contents.length} contenidos</p><small>Actualizado {formatDate(course.updated_at)}</small></div><ArrowRight className="entity-card__arrow" size={18} aria-hidden="true" /></Link>;
}

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  return <Link className="evaluation-card" to={`/app/evaluations/${evaluation.id}`}><div className="evaluation-card__icon"><FileText size={18} aria-hidden="true" /></div><div><h3>{evaluation.name}</h3><p>{evaluation.learning_outcomes.length} objetivos · {evaluation.achievement_levels.length} niveles</p><small>{trimText(evaluation.task_context ?? "Sin contexto adicional", 90)}</small></div><span className="evaluation-card__date">{formatDate(evaluation.updated_at)}</span></Link>;
}
