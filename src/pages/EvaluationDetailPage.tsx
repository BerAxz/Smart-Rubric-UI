import { ArrowRight, Edit3, MessageSquareText, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { components } from "../api/generated";
import { courseApi, evaluationApi, sourceDocumentApi } from "../api/services";
import { EvaluationForm, type EvaluationFormPayload } from "../components/EvaluationForm";
import { ApiErrorMessage, BackLink, ErrorState, LoadingState, PageHeader } from "../components/common";
import { formatDate } from "../utils/format";

export function EvaluationDetailPage() {
  const { evaluationId = "" } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<components["schemas"]["EvaluationRead"] | null>(null);
  const [course, setCourse] = useState<components["schemas"]["CourseRead"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const nextEvaluation = await evaluationApi.get(evaluationId);
      const nextCourse = await courseApi.get(nextEvaluation.course_id);
      setEvaluation(nextEvaluation); setCourse(nextCourse);
    } catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }, [evaluationId]);
  useEffect(() => { void load(); }, [load]);

  async function update(payload: EvaluationFormPayload) {
    setSaving(true);
    try {
      const { sourceFile, ...evaluationPayload } = payload;
      const sourceDocument = sourceFile ? await sourceDocumentApi.uploadFile(sourceFile) : null;
      setEvaluation(await evaluationApi.update(evaluationId, {
        ...evaluationPayload,
        source_document_id: sourceDocument?.id ?? evaluationPayload.source_document_id ?? null,
      }));
      setEditing(false);
    }
    finally { setSaving(false); }
  }

  async function archive() {
    if (!window.confirm("¿Archivar esta evaluación? También se archivará su conversación.")) return;
    try { await evaluationApi.archive(evaluationId); navigate(course ? `/app/courses/${course.id}` : "/app"); }
    catch (archiveError) { setError(archiveError); }
  }

  if (loading) return <LoadingState label="Cargando evaluación…" />;
  if (error || !evaluation || !course) return <div className="content-narrow"><BackLink to="/app" />{error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : <ErrorState message="No encontramos esta evaluación." />}</div>;
  if (editing) return <div className="content-narrow content-narrow--form"><BackLink to={`/app/courses/${course.id}`}>Volver al curso</BackLink><PageHeader eyebrow="Editar evaluación" title={evaluation.name} description="Actualiza el PDF o el contexto que se usará en las próximas respuestas." /><EvaluationForm course={course} initial={evaluation} loading={saving} submitLabel="Guardar cambios" onSubmit={update} onCancel={() => setEditing(false)} /></div>;
  return (
    <div className="content-narrow">
      <BackLink to={`/app/courses/${course.id}`}>Volver al curso</BackLink>
      <PageHeader
        eyebrow={course.name}
        title={evaluation.name}
        description={`Actualizada ${formatDate(evaluation.updated_at)}`}
        actions={
          <>
            <Link className="button button--primary" to={`/app/evaluations/${evaluation.id}/chat`}><MessageSquareText size={17} aria-hidden="true" /> Abrir chat</Link>
            <button className="button button--quiet" type="button" onClick={() => setEditing(true)}><Edit3 size={16} aria-hidden="true" /> Editar</button>
            <button className="button button--quiet" type="button" onClick={archive}><Trash2 size={16} aria-hidden="true" /> Archivar</button>
          </>
        }
      />
      <div className="detail-grid">
        {evaluation.unit && <section className="detail-card"><p className="eyebrow">Unidad analizada</p><h2>{evaluation.unit.title}</h2>{evaluation.unit.description && <p>{evaluation.unit.description}</p>}<p className="muted">La IA usa el contenido completo de esta unidad para construir y revisar la rúbrica.</p></section>}
        <section className="detail-card"><p className="eyebrow">Niveles de logro</p><div className="chip-list">{evaluation.achievement_levels.map((level) => <span className="chip" key={level}>{level}</span>)}</div></section>
        <section className="detail-card"><p className="eyebrow">Objetivos</p><ul className="plain-list">{evaluation.learning_outcomes.map((outcome) => <li key={outcome.id}>{outcome.description}</li>)}</ul></section>
        <section className="detail-card"><p className="eyebrow">Contenidos</p><ul className="plain-list">{evaluation.contents.map((content) => <li key={content.id}><strong>{content.title}</strong>{content.description && <span>{content.description}</span>}</li>)}</ul></section>
        {evaluation.source_document && <section className="detail-card"><p className="eyebrow">Documento de evaluación</p><p><strong>{evaluation.source_document.original_filename}</strong></p><p className="muted">La IA analizará este PDF al generar y refinar la rúbrica desde el chat.</p></section>}
        {evaluation.task_context && <section className="detail-card"><p className="eyebrow">Contexto de la tarea</p><p>{evaluation.task_context}</p></section>}
        {evaluation.additional_criteria && <section className="detail-card"><p className="eyebrow">Criterios adicionales</p><p>{evaluation.additional_criteria}</p></section>}
      </div>
      <Link className="next-step" to={`/app/evaluations/${evaluation.id}/chat`}><span><MessageSquareText size={20} aria-hidden="true" /><span><strong>Continúa en el chat</strong><small>Genera y refina una rúbrica con este contexto.</small></span></span><ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
  );
}
