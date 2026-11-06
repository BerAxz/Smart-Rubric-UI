import { ArrowLeft, ArrowRight, Check, FileText, Plus, Upload, X } from "lucide-react";
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
const stepNames = ["Información", "Contenido", "Niveles"];

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
  const defaultUnitId = initial?.unit?.id ?? course.units[0]?.id ?? "";
  const initialUnitOutcomes = course.learning_outcomes.filter(
    (item) => !course.units.length || item.unit_id === null || item.unit_id === defaultUnitId,
  );
  const initialUnitContents = course.contents.filter(
    (item) => !course.units.length || item.unit_id === null || item.unit_id === defaultUnitId,
  );
  const initialOutcomeIds = initial?.learning_outcomes.map((item) => item.id)
    .filter((id) => initialUnitOutcomes.some((item) => item.id === id));
  const initialContentIds = initial?.contents.map((item) => item.id)
    .filter((id) => initialUnitContents.some((item) => item.id === id));
  const [name, setName] = useState(initial?.name ?? "");
  const [levels, setLevels] = useState<string[]>(initial?.achievement_levels ?? defaultLevels);
  const [selectedUnitId, setSelectedUnitId] = useState(defaultUnitId);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>(
    initialOutcomeIds?.length ? initialOutcomeIds : initialUnitOutcomes.map((item) => item.id),
  );
  const [selectedContents, setSelectedContents] = useState<string[]>(
    initialContentIds?.length ? initialContentIds : initialUnitContents.map((item) => item.id),
  );
  const [sourceMode, setSourceMode] = useState<"pdf" | "context">(
    initial ? (initial.source_document ? "pdf" : "context") : "context",
  );
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceDocumentId] = useState<string | null>(initial?.source_document?.id ?? null);
  const [taskContext, setTaskContext] = useState(initial?.task_context ?? "");
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);

  const selectedUnit = course.units.find((unit) => unit.id === selectedUnitId) ?? null;
  const scopedOutcomes = course.units.length
    ? course.learning_outcomes.filter((item) => item.unit_id === null || item.unit_id === selectedUnitId)
    : course.learning_outcomes;
  const scopedContents = course.units.length
    ? course.contents.filter((item) => item.unit_id === null || item.unit_id === selectedUnitId)
    : course.contents;

  function toggle(values: string[], value: string, update: (next: string[]) => void) {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function selectUnit(nextUnitId: string) {
    setSelectedUnitId(nextUnitId);
    if (course.units.length) {
      setSelectedOutcomes(course.learning_outcomes
        .filter((item) => item.unit_id === null || item.unit_id === nextUnitId)
        .map((item) => item.id));
      setSelectedContents(course.contents
        .filter((item) => item.unit_id === null || item.unit_id === nextUnitId)
        .map((item) => item.id));
    }
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

  function validateStep(current: number) {
    const cleanLevels = levels.map((level) => level.trim()).filter(Boolean);
    if (current === 0) {
      if (!name.trim()) return "Escribe un nombre para la evaluación.";
      if (sourceMode === "pdf" && !sourceFile && !sourceDocumentId) return "Sube el PDF de la evaluación para que la IA lo analice.";
      if (sourceMode === "context" && !taskContext.trim()) return "Describe qué se realizará como evaluación.";
    }
    if (current === 1) {
      if (course.units.length && !selectedUnitId) return "Selecciona la unidad que delimitará la evaluación.";
      if (scopedOutcomes.length && !selectedOutcomes.length) return "Selecciona al menos un objetivo de aprendizaje.";
      if (scopedContents.length && !selectedContents.length) return "Selecciona al menos un contenido.";
    }
    if (current === 2) {
      if (cleanLevels.length < 2 || cleanLevels.length > 5) return "Usa entre 2 y 5 niveles de logro.";
      if (new Set(cleanLevels).size !== cleanLevels.length) return "Los niveles deben tener nombres distintos.";
    }
    return null;
  }

  function continueStep() {
    setError(null);
    const validationMessage = validateStep(step);
    if (validationMessage) {
      setSubmitted(true);
      setError(new Error(validationMessage));
      return;
    }
    setSubmitted(false);
    setStep((current) => Math.min(2, current + 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitted(true);
    const validationMessage = validateStep(0) ?? validateStep(1) ?? validateStep(2);
    if (validationMessage) {
      setError(new Error(validationMessage));
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        achievement_levels: levels.map((level) => level.trim()).filter(Boolean),
        unit_id: selectedUnitId || null,
        learning_outcome_ids: selectedOutcomes,
        content_ids: selectedContents,
        task_context: sourceMode === "context" ? taskContext.trim() : null,
        additional_criteria: initial?.additional_criteria ?? null,
        source_document_id: sourceMode === "pdf" ? sourceDocumentId : null,
        sourceFile,
      });
    } catch (submitError) {
      setError(submitError);
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 2) continueStep();
    else void submit(event);
  }

  const currentStepTitle = ["Cuéntanos sobre tu evaluación", "Selecciona el contenido", "Define los niveles de logro"][step];
  const currentStepDescription = [
    "Agrega el nombre y la evaluación que la IA analizará.",
    "Elige la unidad, los objetivos de aprendizaje y los contenidos que se evaluarán.",
    "Define los niveles que tendrá la rúbrica.",
  ][step];

  return (
    <form className="form-stack evaluation-form" onSubmit={handleFormSubmit} noValidate>
      <div className="evaluation-wizard__topline">
        <span>{initial ? "EDITAR EVALUACIÓN" : "CREAR EVALUACIÓN"}</span>
        <span>Paso {step + 1} de 3</span>
      </div>
      <nav className="evaluation-stepper" aria-label="Progreso de la evaluación">
        {stepNames.map((stepName, index) => (
          <div
            className={"evaluation-stepper__item" + (index === step ? " evaluation-stepper__item--active" : index < step ? " evaluation-stepper__item--done" : "")}
            key={stepName}
          >
            <span>{index < step ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
            <strong>{stepName}</strong>
          </div>
        ))}
      </nav>

      <div className="wizard-section-intro">
        <p className="eyebrow">PASO {step + 1} · {stepNames[step].toLocaleUpperCase("es-CL")}</p>
        <h2>{currentStepTitle}</h2>
        <p>{currentStepDescription}</p>
      </div>

      {error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}

      {step === 0 ? <>
        <label className="field">
          <span>Nombre de la evaluación</span>
          <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Presentación sobre cambio climático" />
          <FieldError message={submitted && !name.trim() ? "Escribe un nombre para la evaluación." : undefined} />
        </label>
        <div className="source-tabs" role="tablist" aria-label="Tipo de evaluación">
          <button className={sourceMode === "context" ? "source-tabs__tab source-tabs__tab--active" : "source-tabs__tab"} type="button" role="tab" aria-selected={sourceMode === "context"} onClick={() => setSourceMode("context")}>Describir actividad</button>
          <button className={sourceMode === "pdf" ? "source-tabs__tab source-tabs__tab--active" : "source-tabs__tab"} type="button" role="tab" aria-selected={sourceMode === "pdf"} onClick={() => setSourceMode("pdf")}>Subir PDF</button>
        </div>
        {sourceMode === "context" ? (
          <label className="field source-context-field">
            <span>Describe la actividad</span>
            <textarea rows={6} value={taskContext} onChange={(event) => setTaskContext(event.target.value)} placeholder="Describe qué se realizará como evaluación, el producto esperado y las instrucciones para tus estudiantes." />
            <small>La IA analizará esta descripción junto con los objetivos y contenidos seleccionados.</small>
            <FieldError message={submitted && !taskContext.trim() ? "Describe qué se realizará como evaluación." : undefined} />
          </label>
        ) : (
          <section className="source-upload-block" aria-labelledby="source-upload-title">
            <div className="source-upload-block__intro">
              <h3 id="source-upload-title">Adjunta la evaluación</h3>
              <p>Sube la consigna o instrucciones de la actividad que se evaluará.</p>
            </div>
            <label className={"file-drop" + (sourceFile || initial?.source_document ? " file-drop--selected" : "")}>
              <input type="file" accept="application/pdf,.pdf" onChange={handleFile} />
              <FileText size={24} aria-hidden="true" />
              <strong>{sourceFile?.name ?? initial?.source_document?.original_filename ?? "Arrastra tu PDF aquí"}</strong>
              <small>{sourceFile ? `${Math.round(sourceFile.size / 1024)} KB · listo para analizar` : initial?.source_document ? "PDF actual · selecciona otro para reemplazarlo" : "Formato PDF · máximo 10 MB"}</small>
              <span className="button button--secondary button--small"><Upload size={15} aria-hidden="true" /> Seleccionar PDF</span>
            </label>
            {fileError ? <FieldError message={fileError} /> : null}
            {submitted && !sourceFile && !sourceDocumentId ? <FieldError message="Sube el PDF de la evaluación para que la IA lo analice." /> : null}
          </section>
        )}
      </> : null}

      {step === 1 ? <>
        {course.units.length ? (
          <label className="field unit-select-field">
            <span>Unidad del curso</span>
            <select value={selectedUnitId} onChange={(event) => selectUnit(event.target.value)} aria-label="Unidad del curso">
              {course.units.map((unit) => <option value={unit.id} key={unit.id}>{unit.title}</option>)}
            </select>
            {selectedUnit?.description ? <small>{selectedUnit.description}</small> : null}
          </label>
        ) : <p className="muted">Este curso no tiene unidades identificadas; se usará todo su contenido.</p>}
        <fieldset className="selection-fieldset">
          <legend>Objetivos de aprendizaje <span className="fieldset-count">{selectedOutcomes.length}</span></legend>
          <div className="check-list">
            {scopedOutcomes.map((outcome) => (
              <label className={"check-option" + (selectedOutcomes.includes(outcome.id) ? " check-option--selected" : "")} key={outcome.id}>
                <input type="checkbox" checked={selectedOutcomes.includes(outcome.id)} onChange={() => toggle(selectedOutcomes, outcome.id, setSelectedOutcomes)} />
                <span className="check-option__box"><Check size={14} aria-hidden="true" /></span>
                <span>{outcome.description}</span>
              </label>
            ))}
          </div>
          {!scopedOutcomes.length ? <p className="muted">Este curso no tiene objetivos de aprendizaje.</p> : null}
          <FieldError message={submitted && scopedOutcomes.length > 0 && !selectedOutcomes.length ? "Selecciona al menos un objetivo." : undefined} />
        </fieldset>
        <fieldset className="selection-fieldset">
          <legend>Contenidos de la unidad <span className="fieldset-count">{selectedContents.length}</span></legend>
          <div className="check-list">
            {scopedContents.map((content) => (
              <label className={"check-option" + (selectedContents.includes(content.id) ? " check-option--selected" : "")} key={content.id}>
                <input type="checkbox" checked={selectedContents.includes(content.id)} onChange={() => toggle(selectedContents, content.id, setSelectedContents)} />
                <span className="check-option__box"><Check size={14} aria-hidden="true" /></span>
                <span><strong>{content.title}</strong>{content.description ? <small>{content.description}</small> : null}</span>
              </label>
            ))}
          </div>
          {!scopedContents.length ? <p className="muted">Este curso no tiene contenidos registrados.</p> : null}
          <FieldError message={submitted && scopedContents.length > 0 && !selectedContents.length ? "Selecciona al menos un contenido." : undefined} />
        </fieldset>
      </> : null}

      {step === 2 ? (
        <fieldset className="selection-fieldset levels-fieldset">
          <legend>Niveles de logro <span className="fieldset-count">{levels.length}</span></legend>
          <p className="fieldset-help">Personaliza los nombres de los niveles que aparecerán en la rúbrica.</p>
          <div className="level-list">
            {levels.map((level, index) => (
              <label className="level-row" key={`level-${index}`}>
                <span className="level-row__number">{index + 1}</span>
                <span className="level-row__field"><span>Nombre del nivel {index + 1}</span><input value={level} onChange={(event) => setLevels((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} aria-label={`Nombre del nivel ${index + 1}`} /></span>
                <button className="icon-button icon-button--danger" type="button" aria-label={`Eliminar nivel ${index + 1}`} disabled={levels.length <= 2} onClick={() => setLevels((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button>
              </label>
            ))}
          </div>
          {levels.length < 5 ? <button className="button button--quiet button--small add-level-button" type="button" onClick={() => setLevels((items) => [...items, `Nivel ${items.length + 1}`])}><Plus size={15} aria-hidden="true" /> Agregar nivel</button> : null}
          <FieldError message={submitted && (levels.length < 2 || levels.length > 5) ? "Elige entre 2 y 5 niveles." : undefined} />
        </fieldset>
      ) : null}

      <div className="form-actions evaluation-form__actions">
        <button
          className="button button--secondary"
          type="button"
          onClick={() => {
            if (step === 0) onCancel();
            else { setError(null); setSubmitted(false); setStep((current) => current - 1); }
          }}
        >
          {step === 0 ? "Cancelar" : <><ArrowLeft size={16} aria-hidden="true" /> Anterior</>}
        </button>
        {step < 2 ? (
          <button className="button button--primary" type="button" onClick={(event) => { event.preventDefault(); continueStep(); }}>Continuar <ArrowRight size={16} aria-hidden="true" /></button>
        ) : (
          <button className="button button--primary" type="submit" disabled={loading}>
            {loading ? "Guardando…" : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
