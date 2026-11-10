import { ArrowLeft, ArrowRight, FileText, Upload, X } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { courseApi, sourceDocumentApi } from "../api/services";
import { ApiErrorMessage, FieldError, PageHeader } from "../components/common";

type SourceMode = "choose" | "pdf" | "text";
const maxPdfBytes = Number(import.meta.env.VITE_MAX_PDF_BYTES ?? 10_485_760);

export function CourseCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFileError(null);
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setFileError("Selecciona un archivo PDF.");
      return;
    }
    if (nextFile.size > maxPdfBytes) {
      setFile(null);
      setFileError("El PDF supera el límite de " + Math.round(maxPdfBytes / 1_048_576) + " MB.");
      return;
    }
    setFile(nextFile);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const cleanName = name.trim();
    const cleanText = sourceText.trim();
    if (cleanName.length < 3) { setError(new Error("El nombre debe tener al menos 3 caracteres.")); return; }
    if (sourceMode === "pdf" && !file) { setError(new Error("Selecciona el PDF del programa.")); return; }
    if (sourceMode === "text" && !cleanText) { setError(new Error("Pega el contenido del programa.")); return; }
    if (cleanText.length > 200_000) { setError(new Error("El texto supera el límite de 200.000 caracteres.")); return; }
    setLoading(true);
    try {
      const document = sourceMode === "pdf" && file ? await sourceDocumentApi.uploadFile(file) : null;
      const course = await courseApi.create({
        name: cleanName,
        source_document_id: document?.id ?? null,
        source_text: sourceMode === "text" ? cleanText : null,
      });
      navigate("/app/courses/" + course.id + "?review=1");
    } catch (submitError) {
      setError(submitError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-narrow content-narrow--form course-create-page">
      <button className="text-back" type="button" onClick={() => sourceMode === "choose" ? navigate("/app") : setSourceMode("choose")}><ArrowLeft size={16} aria-hidden="true" /> Volver</button>
      <PageHeader title={sourceMode === "choose" ? "Crear curso" : sourceMode === "pdf" ? "Subir el programa" : "Pegar contenido"} description={sourceMode === "choose" ? "Organiza los objetivos y contenidos de un curso." : sourceMode === "pdf" ? "Selecciona el programa desde tu equipo." : "Pega el programa del curso para organizar unidades y objetivos."} />
      <form className="form-card course-create-card" onSubmit={submit} noValidate>
        <div className="stepper" role="list" aria-label="Progreso de creación del curso">
          <div className="stepper__item stepper__item--active" role="listitem" aria-current="step"><span aria-hidden="true">1</span><strong>Curso</strong></div>
          <div className="stepper__line" aria-hidden="true" />
          <div className="stepper__item" role="listitem"><span aria-hidden="true">2</span><strong>Revisión</strong></div>
        </div>
        {error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}
        <label className="field">
          <span>Nombre del curso</span>
          <input required minLength={3} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Biología · 2° medio" />
          <small>Entre 3 y 100 caracteres.</small>
        </label>
        {sourceMode === "choose" ? (
          <fieldset className="source-fieldset">
            <legend>FUENTE DEL PROGRAMA</legend>
            <div className="source-choice-grid">
              <button className="source-choice" type="button" onClick={() => setSourceMode("pdf")}><span className="source-choice__icon"><Upload size={20} /></span><strong>Subir un PDF</strong><small>Selecciona el programa desde tu equipo.</small><ArrowRight size={16} /></button>
              <button className="source-choice" type="button" onClick={() => setSourceMode("text")}><span className="source-choice__icon"><FileText size={20} /></span><strong>Pegar texto</strong><small>Usa contenido copiado del programa.</small><ArrowRight size={16} /></button>
            </div>
          </fieldset>
        ) : sourceMode === "pdf" ? (
          <div className="field">
            <span>Documento del programa</span>
            <label className={file ? "file-drop file-drop--selected" : "file-drop"}>
              <input type="file" accept="application/pdf,.pdf" onChange={handleFile} />
              <Upload size={22} aria-hidden="true" />
              <strong>{file?.name ?? "Selecciona un archivo PDF"}</strong>
              <small>{file ? Math.round(file.size / 1024) + " KB · listo para continuar" : "PDF · hasta 10 MB"}</small>
            </label>
            {fileError ? <FieldError message={fileError} /> : null}
            {file ? <button className="file-clear" type="button" onClick={() => setFile(null)}><X size={14} /> Quitar archivo</button> : null}
          </div>
        ) : (
          <label className="field">
            <span>Texto del programa</span>
            <textarea rows={9} maxLength={200_000} value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="Pega aquí el contenido del programa…" />
            <small>{sourceText.length.toLocaleString("es-CL")} / 200.000 caracteres. Los títulos y objetivos podrán revisarse en el paso siguiente.</small>
          </label>
        )}
        <div className="form-actions">
          <button className="button button--secondary" type="button" onClick={() => navigate("/app")}>Cancelar</button>
          {sourceMode !== "choose" ? <button className="button button--primary" type="submit" disabled={loading}>{loading ? "Organizando…" : "Continuar"} <ArrowRight size={16} aria-hidden="true" /></button> : null}
        </div>
      </form>
    </div>
  );
}
