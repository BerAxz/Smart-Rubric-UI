import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { components } from "../api/generated";
import { courseApi, evaluationApi } from "../api/services";
import { ApiErrorMessage, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/common";
import { ConversationRow, CourseTile } from "../components/WorkspaceCards";

type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];

export function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
  const courseNames = useMemo(() => Object.fromEntries(courses.map((course) => [course.id, course.name])), [courses]);
  const latest = evaluations[0];

  if (loading) return <LoadingState label="Cargando tu espacio…" />;
  return (
    <div className="content-narrow workspace-home">
      <PageHeader title="Tu espacio de trabajo" description="Continúa una conversación o entra a uno de tus cursos." />
      {error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : (
        <>
          <section className="continue-section">
            <p className="section-kicker">RETOMAR</p>
            {latest ? (
              <div className="continue-row">
                <div><strong>{latest.name}</strong><small>{courseNames[latest.course_id] ?? "Curso"} · Conversación reciente</small></div>
                <Link className="button button--primary continue-row__action" to={`/app/evaluations/${latest.id}/chat`}>Continuar chat <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            ) : (
              <div className="continue-row continue-row--empty">
                <div><strong>Cuando empieces una evaluación, la conversación aparecerá aquí.</strong><small>Tu trabajo reciente queda a mano.</small></div>
                <Link className="button button--primary continue-row__action" to={courses[0] ? `/app/courses/${courses[0].id}` : "/app/courses/new"}>{courses[0] ? "Abrir curso" : "Crear curso"} <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            )}
          </section>

          <section className="workspace-section">
            <div className="workspace-section__heading"><h2>Cursos</h2><Link to="/app/courses">Ver todos los cursos</Link></div>
            {courses.length ? <div className="course-grid course-grid--dashboard">{courses.slice(0, 3).map((course) => <CourseTile course={course} key={course.id} />)}</div> : (
              <EmptyState title="Aún no tienes cursos" description="Crea tu primer curso desde un PDF o pegando el contenido del programa." action={<Link className="button button--primary" to="/app/courses/new">＋ Crear curso</Link>} />
            )}
          </section>

          <section className="workspace-section workspace-section--conversations">
            <div className="workspace-section__heading"><h2>Chats recientes</h2><Link to="/app/chats">Ver todos los chats</Link></div>
            {evaluations.length ? <div className="conversation-list conversation-list--dashboard">{evaluations.slice(0, 4).map((evaluation: Evaluation) => <ConversationRow key={evaluation.id} evaluation={evaluation} courseName={courseNames[evaluation.course_id] ?? "Curso"} compact />)}</div> : (
              <EmptyState title="Todavía no hay chats" description="Crea una evaluación para comenzar una conversación con Smart Rubric." />
            )}
          </section>
        </>
      )}
    </div>
  );
}
