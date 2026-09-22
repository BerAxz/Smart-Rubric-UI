import { FileText, Upload, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { courseApi, sourceDocumentApi } from "../api/services";
import { ApiErrorMessage, BackLink, FieldError, PageHeader } from "../components/common";

export function CourseCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile); setFileError(null); setSourceText("");
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setFileError("Selecciona un archivo PDF.");
      return;
    }
    const maxBytes = Number(import.meta.env.VITE_MAX_PDF_BYTES ?? 10_485_760);
    if (nextFile.size > maxBytes) {
      setFile(null);
      setFileError(`El PDF supera el límite de ${Math.round(maxBytes / 1_048_576)} MB.`);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const cleanName = name.trim();
    const cleanText = sourceText.trim();
    if (cleanName.length < 3) { setError(new Error("El nombre debe tener al menos 3 caracteres.")); return; }
    if (!file && !cleanText) { setError(new Error("Carga un PDF o pega el contenido del curso.")); return; }
    if (file && cleanText) { setError(new Error("Usa el PDF o el texto pegado, no ambos a la vez.")); return; }
    if (cleanText.length > 200_000) { setError(new Error("El texto supera el límite de 200.000 caracteres.")); return; }
    setLoading(true); setUploading(Boolean(file));
    try {
      let course;
      if (file) {
        const document = await sourceDocumentApi.uploadFile(file);
        course = await courseApi.create({ name: cleanName, source_document_id: document.id });
      } else {
        course = await courseApi.create({ name: cleanName, source_text: cleanText });
      }
      navigate(`/app/courses/${course.id}`);
    } catch (submitError) {
      setError(submitError);
    } finally {
      setLoading(false); setUploading(false);
    }
  }

  return (
    <div className="content-narrow content-narrow--form">
      <BackLink to="/app">Volver al inicio</BackLink>
      <PageHeader eyebrow="Nuevo curso" title="Carga el contexto de tu curso" description="Usaremos el contenido para ayudarte a identificar objetivos y contenidos evaluables." />
      <form className="form-card form-stack" onSubmit={submit} noValidate>
        {error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}
        <label className="field"><span>Nombre del curso</span><input required minLength={3} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Lenguaje 8° básico" /><small>Entre 3 y 100 caracteres.</small></label>
        <div className="field"><span>Material de referencia</span><label className={`file-drop ${file ? "file-drop--selected" : ""}`}><input type="file" accept="application/pdf,.pdf" onChange={handleFile} /><Upload size={21} aria-hidden="true" /><strong>{file ? file.name : "Selecciona un PDF"}</strong><small>{file ? `${Math.round(file.size / 1024)} KB · ${uploading ? "guardando y procesando…" : "listo para subir"}` : "Hasta 10 MB · se guarda en almacenamiento privado"}</small></label>{fileError && <FieldError message={fileError} />}{file && <button className="file-clear" type="button" onClick={() => { setFile(null); setSourceText(""); }}><X size={14} aria-hidden="true" /> Quitar archivo</button>}</div>
        <label className="field"><span>Texto del curso (alternativa al PDF)</span><textarea rows={11} value={sourceText} onChange={(event) => { setSourceText(event.target.value); if (event.target.value) setFile(null); }} placeholder="Pega aquí el programa, objetivos o contenidos del curso." /><small>{sourceText.length.toLocaleString("es-CL")} / 200.000 caracteres</small></label>
        <div className="form-actions"><button className="button button--secondary" type="button" onClick={() => navigate("/app")}>Cancelar</button><button className="button button--primary" type="submit" disabled={loading}><FileText size={17} aria-hidden="true" />{loading ? "Creando…" : "Crear curso"}</button></div>
      </form>
    </div>
  );
}
