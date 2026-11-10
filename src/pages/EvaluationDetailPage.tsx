import { ArrowRight, ChevronDown, Edit3, FileText, MessageSquareText, Trash2 } from "lucide-react";
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
  if (editing) return <div className="content-narrow content-narrow--form"><BackLink to={`/app/courses/${course.id}`}>Volver al curso</BackLink><EvaluationForm course={course} initial={evaluation} loading={saving} submitLabel="Guardar cambios" onSubmit={update} onCancel={() => setEditing(false)} /></div>;
  return (
    <div className="content-narrow evaluation-detail-page">
      <BackLink to={"/app/courses/" + course.id}>Volver al curso</BackLink>
      <PageHeader
        eyebrow={course.name}
        title={evaluation.name}
        description={"Actualizada " + formatDate(evaluation.updated_at)}
        actions={
          <>
            <Link className="button button--primary" to={"/app/evaluations/" + evaluation.id + "/chat"}>
              <MessageSquareText size={17} aria-hidden="true" /> Continúa en el chat <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button className="button button--quiet" type="button" onClick={() => setEditing(true)}><Edit3 size={16} aria-hidden="true" /> Editar</button>
            <button className="button button--quiet" type="button" onClick={archive}><Trash2 size={16} aria-hidden="true" /> Archivar</button>
          </>
        }
      />

      <section className="evaluation-overview" aria-label="Resumen de la evaluación">
        <div className="evaluation-overview__context">
          <p className="eyebrow">{evaluation.unit ? "UNIDAD ANALIZADA" : "CURSO"}</p>
          <h2>{evaluation.unit?.title ?? course.name}</h2>
          <small>{evaluation.unit ? "Contexto de " + course.name : "Evaluación vinculada a este curso"}</small>
        </div>
        <div className="evaluation-overview__levels">
          <div className="evaluation-overview__levels-heading">
            <p className="eyebrow">NIVELES DE LOGRO</p>
          </div>
          {evaluation.achievement_levels.length > 0 ? (
            <div className="chip-list">{evaluation.achievement_levels.map((level) => <span className="chip" key={level}>{level}</span>)}</div>
          ) : <p className="muted evaluation-overview__empty">No hay niveles definidos.</p>}
        </div>
        <div className="evaluation-overview__stats" role="group" aria-label="Cantidades incluidas">
          <div><strong>{evaluation.learning_outcomes.length}</strong><span>{evaluation.learning_outcomes.length === 1 ? "objetivo" : "objetivos"}</span></div>
          <div><strong>{evaluation.contents.length}</strong><span>{evaluation.contents.length === 1 ? "contenido" : "contenidos"}</span></div>
          <div><strong>{evaluation.achievement_levels.length}</strong><span>{evaluation.achievement_levels.length === 1 ? "nivel" : "niveles"}</span></div>
        </div>
        {evaluation.source_document || evaluation.task_context ? (
          <div className="evaluation-overview__sources" role="group" aria-label="Material de evaluación">
            {evaluation.source_document ? (
              <div className="evaluation-overview__source">
                <FileText size={17} aria-hidden="true" />
                <span><small>PDF ADJUNTO</small><strong>{evaluation.source_document.original_filename}</strong></span>
              </div>
            ) : null}
            {evaluation.task_context ? (
              <div className="evaluation-overview__source">
                <MessageSquareText size={17} aria-hidden="true" />
                <span><small>CONTEXTO DE LA ACTIVIDAD</small><strong>Descripción disponible</strong></span>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="evaluation-detail-sections">
        {evaluation.unit ? (
          <details className="evaluation-disclosure">
            <summary className="evaluation-disclosure__summary">
              <span>Descripción de la unidad</span>
              <span className="evaluation-disclosure__hint">{evaluation.unit.description ? "Ver detalles" : "Sin descripción adicional"}</span>
              <ChevronDown className="evaluation-disclosure__chevron" size={17} aria-hidden="true" />
            </summary>
            <div className="evaluation-disclosure__content">
              <p>{evaluation.unit.description || "Esta unidad no tiene una descripción adicional."}</p>
              <p className="muted">La IA considera el contenido completo de la unidad para construir y revisar la rúbrica.</p>
            </div>
          </details>
        ) : null}

        <details className="evaluation-disclosure">
          <summary className="evaluation-disclosure__summary">
            <span>Objetivos de aprendizaje</span>
            <span className="evaluation-disclosure__count">{evaluation.learning_outcomes.length}</span>
            <ChevronDown className="evaluation-disclosure__chevron" size={17} aria-hidden="true" />
          </summary>
          <div className="evaluation-disclosure__content">
            {evaluation.learning_outcomes.length > 0 ? (
              <ul className="plain-list">{evaluation.learning_outcomes.map((outcome) => <li key={outcome.id}>{outcome.description}</li>)}</ul>
            ) : <p className="muted">Esta evaluación no tiene objetivos asociados.</p>}
          </div>
        </details>

        <details className="evaluation-disclosure">
          <summary className="evaluation-disclosure__summary">
            <span>Contenidos</span>
            <span className="evaluation-disclosure__count">{evaluation.contents.length}</span>
            <ChevronDown className="evaluation-disclosure__chevron" size={17} aria-hidden="true" />
          </summary>
          <div className="evaluation-disclosure__content">
            {evaluation.contents.length > 0 ? (
              <ul className="plain-list">{evaluation.contents.map((content) => <li key={content.id}><strong>{content.title}</strong>{content.description && <span>{content.description}</span>}</li>)}</ul>
            ) : <p className="muted">Esta evaluación no tiene contenidos asociados.</p>}
          </div>
        </details>

        {evaluation.source_document ? (
          <details className="evaluation-disclosure">
            <summary className="evaluation-disclosure__summary">
              <span>Sobre el documento de evaluación</span>
              <span className="evaluation-disclosure__hint">PDF</span>
              <ChevronDown className="evaluation-disclosure__chevron" size={17} aria-hidden="true" />
            </summary>
            <div className="evaluation-disclosure__content">
              <p>La IA analiza este PDF al generar y refinar la rúbrica desde el chat.</p>
            </div>
          </details>
        ) : null}

        {evaluation.task_context ? (
          <details className="evaluation-disclosure">
            <summary className="evaluation-disclosure__summary">
              <span>Descripción de la actividad</span>
              <span className="evaluation-disclosure__hint">Ver contexto</span>
              <ChevronDown className="evaluation-disclosure__chevron" size={17} aria-hidden="true" />
            </summary>
            <div className="evaluation-disclosure__content">
              <p className="evaluation-disclosure__task-context">{evaluation.task_context}</p>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
