import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import type { components } from "../api/generated";
import { ApiErrorMessage, FieldError } from "./common";

type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];
type EvaluationPayload = components["schemas"]["EvaluationCreate"];

const defaultLevels = ["Inicial", "En desarrollo", "Logrado", "Sobresaliente"];

export function EvaluationForm({ course, initial, loading, submitLabel, onSubmit, onCancel }: { course: Course; initial?: Evaluation; loading?: boolean; submitLabel: string; onSubmit: (payload: EvaluationPayload) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [levels, setLevels] = useState<string[]>(initial?.achievement_levels ?? defaultLevels);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>(initial?.learning_outcomes.map((item) => item.id) ?? []);
  const [selectedContents, setSelectedContents] = useState<string[]>(initial?.contents.map((item) => item.id) ?? []);
  const [taskContext, setTaskContext] = useState(initial?.task_context ?? "");
  const [additionalCriteria, setAdditionalCriteria] = useState(initial?.additional_criteria ?? "");
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);

  function toggle(values: string[], value: string, update: (next: string[]) => void) {
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSubmitted(true);
    const cleanLevels = levels.map((level) => level.trim()).filter(Boolean);
    if (name.trim().length < 1) { setError(new Error("Escribe un nombre para la evaluación.")); return; }
    if (cleanLevels.length < 2 || cleanLevels.length > 5) { setError(new Error("Usa entre 2 y 5 niveles de logro.")); return; }
    if (new Set(cleanLevels).size !== cleanLevels.length) { setError(new Error("Los niveles deben tener nombres distintos.")); return; }
    if (!selectedOutcomes.length) { setError(new Error("Selecciona al menos un objetivo de aprendizaje.")); return; }
    if (!selectedContents.length) { setError(new Error("Selecciona al menos un contenido.")); return; }
    try {
      await onSubmit({ name: name.trim(), achievement_levels: cleanLevels, learning_outcome_ids: selectedOutcomes, content_ids: selectedContents, task_context: taskContext.trim() || null, additional_criteria: additionalCriteria.trim() || null });
    } catch (submitError) {
      setError(submitError);
    }
  }

  return <form className="form-card form-stack" onSubmit={submit} noValidate>{error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}<label className="field"><span>Nombre de la evaluación</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ensayo argumentativo" /></label><fieldset className="selection-fieldset"><legend>Niveles de logro</legend><p className="fieldset-help">Define entre 2 y 5 niveles que aparecerán como columnas en la rúbrica.</p><div className="level-list">{levels.map((level, index) => <div className="level-row" key={`level-${index}`}><span className="level-row__number">{index + 1}</span><input value={level} onChange={(event) => setLevels((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} aria-label={`Nombre del nivel ${index + 1}`} /><button className="icon-button icon-button--danger" type="button" aria-label={`Eliminar nivel ${index + 1}`} disabled={levels.length <= 2} onClick={() => setLevels((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button></div>)}</div>{levels.length < 5 && <button className="button button--quiet button--small" type="button" onClick={() => setLevels((items) => [...items, `Nivel ${items.length + 1}`])}><Plus size={15} aria-hidden="true" /> Agregar nivel</button>}<FieldError message={submitted && (levels.length < 2 || levels.length > 5) ? "Elige entre 2 y 5 niveles." : undefined} /></fieldset><fieldset className="selection-fieldset"><legend>Objetivos de aprendizaje</legend><p className="fieldset-help">Selecciona los objetivos que esta evaluación observará.</p><div className="check-list">{course.learning_outcomes.map((outcome) => <label className={`check-option ${selectedOutcomes.includes(outcome.id) ? "check-option--selected" : ""}`} key={outcome.id}><input type="checkbox" checked={selectedOutcomes.includes(outcome.id)} onChange={() => toggle(selectedOutcomes, outcome.id, setSelectedOutcomes)} /><span className="check-option__box"><Check size={14} aria-hidden="true" /></span><span>{outcome.description}</span></label>)}</div>{course.learning_outcomes.length === 0 && <p className="muted">Este curso no tiene objetivos. Vuelve al curso para agregar alguno.</p>}<FieldError message={submitted && !selectedOutcomes.length ? "Selecciona al menos un objetivo." : undefined} /></fieldset><fieldset className="selection-fieldset"><legend>Contenidos</legend><p className="fieldset-help">Relaciona los contenidos que formarán parte de la tarea.</p><div className="check-list">{course.contents.map((content) => <label className={`check-option ${selectedContents.includes(content.id) ? "check-option--selected" : ""}`} key={content.id}><input type="checkbox" checked={selectedContents.includes(content.id)} onChange={() => toggle(selectedContents, content.id, setSelectedContents)} /><span className="check-option__box"><Check size={14} aria-hidden="true" /></span><span><strong>{content.title}</strong>{content.description && <small>{content.description}</small>}</span></label>)}</div>{course.contents.length === 0 && <p className="muted">Este curso no tiene contenidos. Vuelve al curso para agregar alguno.</p>}<FieldError message={submitted && !selectedContents.length ? "Selecciona al menos un contenido." : undefined} /></fieldset><label className="field"><span>Contexto de la tarea <small>(opcional)</small></span><textarea rows={4} value={taskContext} onChange={(event) => setTaskContext(event.target.value)} placeholder="Describe el producto, audiencia o condiciones de la actividad." /></label><label className="field"><span>Criterios adicionales <small>(opcional)</small></span><textarea rows={4} value={additionalCriteria} onChange={(event) => setAdditionalCriteria(event.target.value)} placeholder="Por ejemplo: incluir una fuente y una reflexión final." /></label><div className="form-actions"><button className="button button--secondary" type="button" onClick={onCancel}>Cancelar</button><button className="button button--primary" type="submit" disabled={loading}>{loading ? "Guardando…" : submitLabel}</button></div></form>;
}
