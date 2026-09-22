import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { components } from "../api/generated";
import { courseApi, evaluationApi, sourceDocumentApi } from "../api/services";
import { EvaluationForm, type EvaluationFormPayload } from "../components/EvaluationForm";
import { ApiErrorMessage, BackLink, ErrorState, LoadingState, PageHeader } from "../components/common";

export function EvaluationCreatePage() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<components["schemas"]["CourseRead"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setCourse(await courseApi.get(courseId)); }
    catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }, [courseId]);
  useEffect(() => { void load(); }, [load]);

  async function submit(payload: EvaluationFormPayload) {
    setSaving(true);
    try {
      const { sourceFile, ...evaluationPayload } = payload;
      const sourceDocument = sourceFile ? await sourceDocumentApi.uploadFile(sourceFile) : null;
      const evaluation = await evaluationApi.create(courseId, {
        ...evaluationPayload,
        source_document_id: sourceDocument?.id ?? evaluationPayload.source_document_id ?? null,
      });
      navigate(`/app/evaluations/${evaluation.id}`);
    }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingState label="Cargando contexto del curso…" />;
  if (error || !course) return <div className="content-narrow"><BackLink to={`/app/courses/${courseId}`} />{error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : <ErrorState message="No encontramos este curso." />}</div>;
  return <div className="content-narrow content-narrow--form"><BackLink to={`/app/courses/${course.id}`}>Volver al curso</BackLink><PageHeader eyebrow="Nueva evaluación" title="Crea una evaluación con ayuda de la IA" description="Sube una evaluación en PDF para analizarla o describe la actividad que quieres diseñar." /><EvaluationForm course={course} loading={saving} submitLabel="Crear evaluación" onSubmit={submit} onCancel={() => navigate(`/app/courses/${course.id}`)} /></div>;
}
