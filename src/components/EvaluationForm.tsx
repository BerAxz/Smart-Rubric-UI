import { Check, FileText, MessageSquareText, Plus, Upload, X } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { components } from "../api/generated";
import { ApiErrorMessage, FieldError } from "./common";

type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];
type EvaluationCreate = components["schemas"]["EvaluationCreate"];

export type EvaluationFormPayload = Omit<EvaluationCreate, "source_document_id"> & {
  source_document_id?: string | null;
  sourceFile?: File | null;
};

const defaultLevels = ["Inicial", "En desarrollo", "Logrado", "Sobresaliente"];
const maxPdfBytes = Number(import.meta.env.VITE_MAX_PDF_BYTES ?? 10_485_760);

export function EvaluationForm({
  course,
  initial,
  loading,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  course: Course;
  initial?: Evaluation;
  loading?: boolean;
  submitLabel: string;
  onSubmit: (payload: EvaluationFormPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [levels, setLevels] = useState<string[]>(initial?.achievement_levels ?? defaultLevels);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>(
    initial?.learning_outcomes.map((item) => item.id) ?? [],
  );
  const [selectedContents, setSelectedContents] = useState<string[]>(
    initial?.contents.map((item) => item.id) ?? [],
  );
  const [sourceMode, setSourceMode] = useState<"pdf" | "context">("pdf");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceDocumentId] = useState<string | null>(initial?.source_document?.id ?? null);
  const [taskContext, setTaskContext] = useState(initial?.task_context ?? "");
  const [additionalCriteria, setAdditionalCriteria] = useState(initial?.additional_criteria ?? "");
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);

  function toggle(values: string[], value: string, update: (next: string[]) => void) {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFileError(null);
    if (!nextFile) {
      setSourceFile(null);
      return;
    }
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setSourceFile(null);
      setFileError("Selecciona un archivo PDF.");
      return;
    }
    if (nextFile.size > maxPdfBytes) {
      setSourceFile(null);
      setFileError(`El PDF supera el límite de ${Math.round(maxPdfBytes / 1_048_576)} MB.`);
      return;
    }
    setSourceMode("pdf");
    setSourceFile(nextFile);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitted(true);
    const cleanLevels = levels.map((level) => level.trim()).filter(Boolean);
    const cleanContext = taskContext.trim();
    if (name.trim().length < 1) {
      setError(new Error("Escribe un nombre para la evaluación."));
      return;
    }
    if (cleanLevels.length < 2 || cleanLevels.length > 5) {
      setError(new Error("Usa entre 2 y 5 niveles de logro."));
      return;
    }
    if (new Set(cleanLevels).size !== cleanLevels.length) {
      setError(new Error("Los niveles deben tener nombres distintos."));
      return;
    }
    if (!selectedOutcomes.length) {
      setError(new Error("Selecciona al menos un objetivo de aprendizaje."));
      return;
    }
    if (!selectedContents.length) {
      setError(new Error("Selecciona al menos un contenido."));
      return;
    }
    if (sourceMode === "pdf" && !sourceFile && !sourceDocumentId) {
      setError(new Error("Sube el PDF de la evaluación para que la IA lo analice."));
      return;
    }
    if (sourceMode === "context" && !cleanContext) {
      setError(new Error("Describe qué quieres evaluar para orientar a la IA."));
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        achievement_levels: cleanLevels,
        learning_outcome_ids: selectedOutcomes,
        content_ids: selectedContents,
        task_context: sourceMode === "context" ? cleanContext : null,
        additional_criteria: additionalCriteria.trim() || null,
        source_document_id: sourceMode === "pdf" ? sourceDocumentId : null,
        sourceFile,
      });
    } catch (submitError) {
      setError(submitError);
    }
  }

  return (
    <form className="form-card form-stack" onSubmit={submit} noValidate>
      {error ? (
        <div className="alert alert--error" role="alert">
          <ApiErrorMessage error={error} />
        </div>
      ) : null}

      <label className="field">
        <span>Nombre de la evaluación</span>
        <input
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Presentación sobre cambio climático"
        />
      </label>

      <fieldset className="selection-fieldset">
        <legend>¿Cómo quieres definir la evaluación?</legend>
        <p className="fieldset-help">
          Sube la evaluación que ya tienes para que la IA la analice, o describe la actividad que
          quieres crear.
        </p>
        <div className="source-choice-grid" role="radiogroup" aria-label="Fuente de la evaluación">
          <label className={`source-choice ${sourceMode === "pdf" ? "source-choice--selected" : ""}`}>
            <input
              type="radio"
              name="evaluation-source"
              checked={sourceMode === "pdf"}
              onChange={() => setSourceMode("pdf")}
            />
            <Upload size={19} aria-hidden="true" />
            <span>
              <strong>Subir evaluación en PDF</strong>
              <small>La IA usará tu consigna y sus indicaciones como fuente principal.</small>
            </span>
          </label>
          <label className={`source-choice ${sourceMode === "context" ? "source-choice--selected" : ""}`}>
            <input
              type="radio"
              name="evaluation-source"
              checked={sourceMode === "context"}
              onChange={() => setSourceMode("context")}
            />
            <MessageSquareText size={19} aria-hidden="true" />
            <span>
              <strong>Escribir un contexto</strong>
              <small>Cuéntale a la IA qué producto, audiencia o desempeño quieres evaluar.</small>
            </span>
          </label>
        </div>

        {sourceMode === "pdf" ? (
          <div className="source-upload-block">
            <label className={`file-drop ${sourceFile ? "file-drop--selected" : ""}`}>
              <input type="file" accept="application/pdf,.pdf" onChange={handleFile} />
              <FileText size={21} aria-hidden="true" />
              <strong>
                {sourceFile?.name ?? initial?.source_document?.original_filename ?? "Selecciona un PDF"}
              </strong>
              <small>
                {sourceFile
                  ? `${Math.round(sourceFile.size / 1024)} KB · listo para analizar`
                  : initial?.source_document
                    ? "PDF actual · selecciona otro para reemplazarlo"
                    : "Hasta 10 MB · se guarda en almacenamiento privado"}
              </small>
            </label>
            {fileError ? <FieldError message={fileError} /> : null}
            {sourceFile ? (
              <button className="file-clear" type="button" onClick={() => setSourceFile(null)}>
                <X size={14} aria-hidden="true" /> Quitar archivo
              </button>
            ) : null}
          </div>
        ) : (
          <label className="field source-context-field">
            <span>Contexto de la actividad</span>
            <textarea
              rows={5}
              value={taskContext}
              onChange={(event) => setTaskContext(event.target.value)}
              placeholder="Quiero que mi evaluación sea para una presentación sobre el cambio climático. El estudiantado debe explicar causas, evidencias y propuestas a una audiencia general."
            />
            <small>Incluye el producto, la audiencia, las condiciones y lo que esperas observar.</small>
          </label>
        )}
        <FieldError
          message={
            submitted && sourceMode === "pdf" && !sourceFile && !sourceDocumentId
              ? "Sube el PDF de la evaluación."
              : submitted && sourceMode === "context" && !taskContext.trim()
                ? "Escribe un contexto para orientar la generación."
                : undefined
          }
        />
      </fieldset>

      <fieldset className="selection-fieldset">
        <legend>Niveles de logro</legend>
        <p className="fieldset-help">Define entre 2 y 5 niveles que aparecerán en la rúbrica.</p>
        <div className="level-list">
          {levels.map((level, index) => (
            <div className="level-row" key={`level-${index}`}>
              <span className="level-row__number">{index + 1}</span>
              <input
                value={level}
                onChange={(event) =>
                  setLevels((items) =>
                    items.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                  )
                }
                aria-label={`Nombre del nivel ${index + 1}`}
              />
              <button
                className="icon-button icon-button--danger"
                type="button"
                aria-label={`Eliminar nivel ${index + 1}`}
                disabled={levels.length <= 2}
                onClick={() => setLevels((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        {levels.length < 5 ? (
          <button
            className="button button--quiet button--small"
            type="button"
            onClick={() => setLevels((items) => [...items, `Nivel ${items.length + 1}`])}
          >
            <Plus size={15} aria-hidden="true" /> Agregar nivel
          </button>
        ) : null}
        <FieldError message={submitted && (levels.length < 2 || levels.length > 5) ? "Elige entre 2 y 5 niveles." : undefined} />
      </fieldset>

      <fieldset className="selection-fieldset">
        <legend>Objetivos de aprendizaje</legend>
        <p className="fieldset-help">Selecciona los objetivos que esta evaluación observará.</p>
        <div className="check-list">
          {course.learning_outcomes.map((outcome) => (
            <label
              className={`check-option ${selectedOutcomes.includes(outcome.id) ? "check-option--selected" : ""}`}
              key={outcome.id}
            >
              <input
                type="checkbox"
                checked={selectedOutcomes.includes(outcome.id)}
                onChange={() => toggle(selectedOutcomes, outcome.id, setSelectedOutcomes)}
              />
              <span className="check-option__box"><Check size={14} aria-hidden="true" /></span>
              <span>{outcome.description}</span>
            </label>
          ))}
        </div>
        {course.learning_outcomes.length === 0 ? (
          <p className="muted">Este curso no tiene objetivos. Vuelve al curso para agregar alguno.</p>
        ) : null}
        <FieldError message={submitted && !selectedOutcomes.length ? "Selecciona al menos un objetivo." : undefined} />
      </fieldset>

      <fieldset className="selection-fieldset">
        <legend>Contenidos</legend>
        <p className="fieldset-help">Relaciona los contenidos que formarán parte de la tarea.</p>
        <div className="check-list">
          {course.contents.map((content) => (
            <label
              className={`check-option ${selectedContents.includes(content.id) ? "check-option--selected" : ""}`}
              key={content.id}
            >
              <input
                type="checkbox"
                checked={selectedContents.includes(content.id)}
                onChange={() => toggle(selectedContents, content.id, setSelectedContents)}
              />
              <span className="check-option__box"><Check size={14} aria-hidden="true" /></span>
              <span>
                <strong>{content.title}</strong>
                {content.description ? <small>{content.description}</small> : null}
              </span>
            </label>
          ))}
        </div>
        {course.contents.length === 0 ? (
          <p className="muted">Este curso no tiene contenidos. Vuelve al curso para agregar alguno.</p>
        ) : null}
        <FieldError message={submitted && !selectedContents.length ? "Selecciona al menos un contenido." : undefined} />
      </fieldset>

      <label className="field">
        <span>Criterios adicionales <small>(opcional)</small></span>
        <textarea
          rows={4}
          value={additionalCriteria}
          onChange={(event) => setAdditionalCriteria(event.target.value)}
          placeholder="Por ejemplo: incluir una fuente, una reflexión final o una defensa oral."
        />
      </label>

      <div className="form-actions">
        <button className="button button--secondary" type="button" onClick={onCancel}>Cancelar</button>
        <button className="button button--primary" type="submit" disabled={loading}>
          {sourceMode === "pdf" ? <Upload size={17} aria-hidden="true" /> : <MessageSquareText size={17} aria-hidden="true" />}
          {loading ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
