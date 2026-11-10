import { ArrowDown, ArrowRight, ArrowUp, BookOpen, ChevronDown, Download, Edit3, FilePlus2, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { components } from "../api/generated";
import { courseApi, evaluationApi, sourceDocumentApi } from "../api/services";
import { ApiErrorMessage, BackLink, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/common";
import { formatDate } from "../utils/format";

type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];
type OutcomeDraft = components["schemas"]["LearningOutcomeInput"];
type ContentDraft = components["schemas"]["ContentInput"];

export function CourseDetailPage() {
  const { courseId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "1";
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [editingStructure, setEditingStructure] = useState(false);
  const [outcomes, setOutcomes] = useState<OutcomeDraft[]>([]);
  const [contents, setContents] = useState<ContentDraft[]>([]);
  const [courseName, setCourseName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true); setError(null);
    try {
      const [nextCourse, evaluationResponse] = await Promise.all([courseApi.get(courseId), evaluationApi.listForCourse(courseId)]);
      setCourse(nextCourse); setCourseName(nextCourse.name); setEvaluations(evaluationResponse.items);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  function startEditing() {
    if (!course) return;
    setOutcomes(course.learning_outcomes.map(({ id, unit_id, description }) => ({ id, unit_id, description })));
    setContents(course.contents.map(({ id, unit_id, title, description }) => ({ id, unit_id, title, description })));
    setActionError(null); setEditingStructure(true);
  }

  async function saveStructure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setActionError(null);
    const cleanOutcomes = outcomes.map((item) => ({ ...item, description: item.description.trim() })).filter((item) => item.description);
    const cleanContents = contents.map((item) => ({ ...item, title: item.title.trim(), description: item.description?.trim() || null })).filter((item) => item.title);
    try {
      const updated = await courseApi.updateStructure(courseId, { learning_outcomes: cleanOutcomes, contents: cleanContents });
      setCourse(updated); setEditingStructure(false);
    } catch (saveError) {
      setActionError(saveError);
    } finally {
      setSaving(false);
    }
  }

  async function renameCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (courseName.trim().length < 3) { setActionError(new Error("El nombre debe tener al menos 3 caracteres.")); return; }
    setRenaming(true); setActionError(null);
    try { setCourse(await courseApi.rename(courseId, { name: courseName.trim() })); }
    catch (renameError) { setActionError(renameError); }
    finally { setRenaming(false); }
  }

  async function archiveCourse() {
    if (!window.confirm("¿Archivar este curso? Sus evaluaciones y chat dejarán de estar disponibles.")) return;
    setActionError(null);
    try { await courseApi.archive(courseId); navigate("/app"); }
    catch (archiveError) { setActionError(archiveError); }
  }

  async function downloadSourceDocument() {
    setActionError(null); setDownloading(true);
    try {
      const response = await sourceDocumentApi.downloadForCourse(courseId);
      window.open(response.download_url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setActionError(downloadError);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <LoadingState label="Cargando curso…" />;
  if (error || !course) return <div className="content-narrow"><BackLink to="/app" />{error ? <ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /> : <ErrorState message="No encontramos este curso." />}</div>;

  return (
    <div className="content-narrow">
      <BackLink to="/app/courses">Volver a cursos</BackLink>
      <PageHeader
        eyebrow={reviewMode ? "PASO 2 DE 2 · REVISIÓN DEL CURSO" : "Curso"}
        title={reviewMode ? "Revisa el contenido" : course.name}
        description={reviewMode ? "Confirma unidades, objetivos y contenidos antes de crear tu primera evaluación." : `Actualizado ${formatDate(course.updated_at)}`}
        actions={!reviewMode ? <>
          <Link className="button button--primary" to={`/app/courses/${course.id}/evaluations/new`}><FilePlus2 size={17} aria-hidden="true" /> Nueva evaluación <ArrowRight size={16} aria-hidden="true" /></Link>
          <button className="button button--quiet" type="button" onClick={archiveCourse}><Trash2 size={16} aria-hidden="true" /> Archivar</button>
        </> : undefined}
      />
      {reviewMode ? <div className="review-banner"><span className="review-banner__step">2</span><span><strong>Tu curso ya está organizado</strong><small>Revisa los elementos detectados. Puedes ajustar objetivos y contenidos antes de avanzar.</small></span></div> : null}
      {actionError ? <ErrorState message={<ApiErrorMessage error={actionError} />} /> : null}
      {!reviewMode ? <section className="form-card course-name-form"><form onSubmit={renameCourse}><label className="field"><span>Nombre del curso</span><input value={courseName} onChange={(event) => setCourseName(event.target.value)} maxLength={100} /></label><button className="button button--secondary" type="submit" disabled={renaming}>{renaming ? "Guardando…" : "Renombrar"}</button></form></section> : null}
      {!reviewMode && course.source_document && <section className="form-card source-document-card"><div><p className="eyebrow">Material de referencia</p><h2>{course.source_document.original_filename}</h2><p className="muted">PDF validado y guardado de forma privada.</p></div><button className="button button--secondary" type="button" onClick={downloadSourceDocument} disabled={downloading}><Download size={16} aria-hidden="true" /> {downloading ? "Preparando…" : "Abrir PDF"}</button></section>}
      <section className="section-block section-block--tight">
        <div className="section-heading"><div><p className="eyebrow">{reviewMode ? "CONTENIDO DETECTADO" : "Contexto estructurado"}</p><h2>{reviewMode ? "Unidades, objetivos y contenidos" : "Objetivos y contenidos"}</h2></div>{!editingStructure && <button className="button button--secondary button--small" type="button" onClick={startEditing}><Edit3 size={15} aria-hidden="true" /> Editar estructura</button>}</div>
        {editingStructure ? <StructureEditor outcomes={outcomes} contents={contents} setOutcomes={setOutcomes} setContents={setContents} saving={saving} onCancel={() => setEditingStructure(false)} onSubmit={saveStructure} /> : <StructureView course={course} />}
      </section>
      {!reviewMode ? <section className="section-block section-block--tight"><div className="section-heading"><div><p className="eyebrow">Trabajo del curso</p><h2>Evaluaciones</h2></div>{evaluations.length > 0 && <span className="count-badge">{evaluations.length}</span>}</div>{evaluations.length === 0 ? <EmptyState title="Crea la primera evaluación" description="Selecciona objetivos y contenidos para iniciar una conversación sobre la rúbrica." action={<Link className="button button--secondary" to={`/app/courses/${course.id}/evaluations/new`}><Plus size={16} aria-hidden="true" /> Nueva evaluación</Link>} /> : <div className="evaluation-list">{evaluations.map((evaluation) => <Link className="evaluation-card" key={evaluation.id} to={`/app/evaluations/${evaluation.id}`}><div className="evaluation-card__icon"><BookOpen size={18} aria-hidden="true" /></div><div><h3>{evaluation.name}</h3><p>{evaluation.learning_outcomes.length} objetivos · {evaluation.contents.length} contenidos · {evaluation.achievement_levels.length} niveles</p><small>Actualizada {formatDate(evaluation.updated_at)}</small></div></Link>)}</div>}</section> : <div className="review-bottom-action"><p>Cuando estés conforme, continúa y crea la primera evaluación de este curso.</p><Link className="button button--primary" to={`/app/courses/${course.id}/evaluations/new`}>Crear evaluación <ArrowRight size={16} aria-hidden="true" /></Link></div>}
    </div>
  );
}

function StructureView({ course }: { course: Course }) {
  const globalOutcomes = course.learning_outcomes.filter((item) => item.unit_id === null);
  const globalContents = course.contents.filter((item) => item.unit_id === null);
  const outcomeLabel = (count: number) => count + " " + (count === 1 ? "objetivo" : "objetivos");
  const contentLabel = (count: number) => count + " " + (count === 1 ? "contenido" : "contenidos");
  const hasUnits = course.units.length > 0;
  const courseOutcomes = hasUnits ? globalOutcomes : course.learning_outcomes;
  const courseContents = hasUnits ? globalContents : course.contents;

  return (
    <div className="structure-grid">
      {hasUnits && (globalOutcomes.length > 0 || globalContents.length > 0) ? (
        <details className="structure-panel structure-disclosure structure-disclosure--global">
          <summary className="structure-disclosure__summary">
            <span className="structure-disclosure__main">
              <strong>Información general del curso</strong>
              <small>Objetivos y contenidos compartidos entre unidades</small>
            </span>
            <span className="structure-disclosure__counts">
              <span>{outcomeLabel(globalOutcomes.length)}</span>
              <span>{contentLabel(globalContents.length)}</span>
            </span>
            <ChevronDown className="structure-disclosure__chevron" size={18} aria-hidden="true" />
          </summary>
          <div className="structure-disclosure__content">
            {globalOutcomes.length > 0 ? (
              <section className="structure-detail-group">
                <h4>Objetivos generales</h4>
                <ol className="numbered-list">{globalOutcomes.map((outcome) => <li key={outcome.id}>{outcome.description}</li>)}</ol>
              </section>
            ) : null}
            {globalContents.length > 0 ? (
              <section className="structure-detail-group">
                <h4>Contenidos generales</h4>
                <ol className="numbered-list">{globalContents.map((content) => <li key={content.id}><strong>{content.title}</strong>{content.description && <span>{content.description}</span>}</li>)}</ol>
              </section>
            ) : null}
          </div>
        </details>
      ) : null}

      {hasUnits ? course.units.map((unit) => {
        const unitOutcomes = course.learning_outcomes.filter((item) => item.unit_id === unit.id);
        const unitContents = course.contents.filter((item) => item.unit_id === unit.id);
        return (
          <details className="structure-panel structure-disclosure" key={unit.id}>
            <summary className="structure-disclosure__summary">
              <span className="structure-disclosure__main"><strong>{unit.title}</strong></span>
              <span className="structure-disclosure__counts">
                <span>{outcomeLabel(unitOutcomes.length)}</span>
                <span>{contentLabel(unitContents.length)}</span>
              </span>
              <ChevronDown className="structure-disclosure__chevron" size={18} aria-hidden="true" />
            </summary>
            <div className="structure-disclosure__content">
              {unit.description ? <p className="structure-unit-description">{unit.description}</p> : null}
              <section className="structure-detail-group">
                <h4>Objetivos de aprendizaje</h4>
                {unitOutcomes.length > 0 ? (
                  <ol className="numbered-list">{unitOutcomes.map((outcome) => <li key={outcome.id}>{outcome.description}</li>)}</ol>
                ) : (
                  <p className="structure-inline-note">
                    {globalOutcomes.length > 0 ? "Se aplican los objetivos generales del curso." : "No hay objetivos específicos registrados para esta unidad."}
                  </p>
                )}
              </section>
              <section className="structure-detail-group">
                <h4>Contenidos</h4>
                {unitContents.length > 0 ? (
                  <ol className="numbered-list">{unitContents.map((content) => <li key={content.id}><strong>{content.title}</strong>{content.description && <span>{content.description}</span>}</li>)}</ol>
                ) : <p className="structure-inline-note">No hay contenidos guardados para esta unidad.</p>}
              </section>
            </div>
          </details>
        );
      }) : (
        <>
          <details className="structure-panel structure-disclosure">
            <summary className="structure-disclosure__summary">
              <span className="structure-disclosure__main"><strong>Objetivos de aprendizaje</strong></span>
              <span className="structure-disclosure__counts"><span>{outcomeLabel(courseOutcomes.length)}</span></span>
              <ChevronDown className="structure-disclosure__chevron" size={18} aria-hidden="true" />
            </summary>
            <div className="structure-disclosure__content">
              {courseOutcomes.length > 0 ? <ol className="numbered-list">{courseOutcomes.map((outcome) => <li key={outcome.id}>{outcome.description}</li>)}</ol> : <p className="structure-inline-note">No hay objetivos guardados.</p>}
            </div>
          </details>
          <details className="structure-panel structure-disclosure">
            <summary className="structure-disclosure__summary">
              <span className="structure-disclosure__main"><strong>Contenidos</strong></span>
              <span className="structure-disclosure__counts"><span>{contentLabel(courseContents.length)}</span></span>
              <ChevronDown className="structure-disclosure__chevron" size={18} aria-hidden="true" />
            </summary>
            <div className="structure-disclosure__content">
              {courseContents.length > 0 ? <ol className="numbered-list">{courseContents.map((content) => <li key={content.id}><strong>{content.title}</strong>{content.description && <span>{content.description}</span>}</li>)}</ol> : <p className="structure-inline-note">No hay contenidos guardados.</p>}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function StructureEditor({ outcomes, contents, setOutcomes, setContents, saving, onCancel, onSubmit }: { outcomes: OutcomeDraft[]; contents: ContentDraft[]; setOutcomes: React.Dispatch<React.SetStateAction<OutcomeDraft[]>>; setContents: React.Dispatch<React.SetStateAction<ContentDraft[]>>; saving: boolean; onCancel: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  function move<T>(items: T[], index: number, direction: -1 | 1, update: React.Dispatch<React.SetStateAction<T[]>>) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  return (
    <form className="form-card form-stack structure-editor" onSubmit={onSubmit}>
      <div className="editor-column">
        <div className="editor-heading">
          <h3>Objetivos</h3>
          <button className="button button--quiet button--small" type="button" onClick={() => setOutcomes((items) => [...items, { description: "" }])}>
            <Plus size={15} aria-hidden="true" /> Agregar
          </button>
        </div>
        {outcomes.map((outcome, index) => (
          <div className="editor-row editor-row--outcome" key={outcome.id ?? "outcome-" + index}>
            <span className="editor-row__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className="editor-row__fields">
              <textarea
                rows={2}
                value={outcome.description}
                onChange={(event) => setOutcomes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))}
                aria-label={"Objetivo " + (index + 1)}
              />
            </div>
            <div className="editor-row__actions">
              <button className="icon-button" type="button" aria-label={"Subir objetivo " + (index + 1)} disabled={index === 0} onClick={() => move(outcomes, index, -1, setOutcomes)}><ArrowUp size={15} aria-hidden="true" /></button>
              <button className="icon-button" type="button" aria-label={"Bajar objetivo " + (index + 1)} disabled={index === outcomes.length - 1} onClick={() => move(outcomes, index, 1, setOutcomes)}><ArrowDown size={15} aria-hidden="true" /></button>
              <button className="icon-button icon-button--danger" type="button" aria-label={"Eliminar objetivo " + (index + 1)} onClick={() => setOutcomes((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={15} aria-hidden="true" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="editor-column">
        <div className="editor-heading">
          <h3>Contenidos</h3>
          <button className="button button--quiet button--small" type="button" onClick={() => setContents((items) => [...items, { title: "", description: null }])}>
            <Plus size={15} aria-hidden="true" /> Agregar
          </button>
        </div>
        {contents.map((content, index) => (
          <div className="editor-row editor-row--content" key={content.id ?? "content-" + index}>
            <span className="editor-row__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className="editor-row__fields editor-row__fields--content">
              <input
                value={content.title}
                onChange={(event) => setContents((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}
                aria-label={"Título del contenido " + (index + 1)}
                placeholder="Título del contenido"
              />
              <textarea
                rows={2}
                value={content.description ?? ""}
                onChange={(event) => setContents((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))}
                aria-label={"Descripción del contenido " + (index + 1)}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="editor-row__actions">
              <button className="icon-button" type="button" aria-label={"Subir contenido " + (index + 1)} disabled={index === 0} onClick={() => move(contents, index, -1, setContents)}><ArrowUp size={15} aria-hidden="true" /></button>
              <button className="icon-button" type="button" aria-label={"Bajar contenido " + (index + 1)} disabled={index === contents.length - 1} onClick={() => move(contents, index, 1, setContents)}><ArrowDown size={15} aria-hidden="true" /></button>
              <button className="icon-button icon-button--danger" type="button" aria-label={"Eliminar contenido " + (index + 1)} onClick={() => setContents((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={15} aria-hidden="true" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button className="button button--secondary" type="button" onClick={onCancel}><X size={16} aria-hidden="true" /> Cancelar</button>
        <button className="button button--primary" type="submit" disabled={saving}><Save size={16} aria-hidden="true" /> {saving ? "Guardando…" : "Guardar estructura"}</button>
      </div>
    </form>
  );
}
