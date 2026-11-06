import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { components } from "../api/generated";
import { courseApi } from "../api/services";
import { ApiErrorMessage, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/common";
import { CourseTile } from "../components/WorkspaceCards";

type Course = components["schemas"]["CourseRead"];

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCourses((await courseApi.list()).items);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => courses.filter((course) => course.name.toLocaleLowerCase("es-CL").includes(query.toLocaleLowerCase("es-CL"))), [courses, query]);

  if (loading) return <LoadingState label="Cargando cursos…" />;
  return (
    <div className="content-narrow data-page">
      <PageHeader title="Tus cursos" description="Abre un curso para revisar su estructura o continuar una evaluación." actions={<Link className="button button--primary" to="/app/courses/new">＋ Crear curso</Link>} />
      <label className="page-search">
        <Search size={18} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar curso por nombre…" aria-label="Buscar curso por nombre" />
      </label>
      {error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : filtered.length === 0 ? (
        <EmptyState title={courses.length ? "No encontramos ese curso" : "Aún no tienes cursos"} description={courses.length ? "Prueba con otro nombre." : "Crea un curso desde un PDF o pega el contenido del programa."} action={!courses.length ? <Link className="button button--primary" to="/app/courses/new">Crear curso</Link> : undefined} />
      ) : <div className="course-grid">{filtered.map((course) => <CourseTile key={course.id} course={course} />)}</div>}
    </div>
  );
}
