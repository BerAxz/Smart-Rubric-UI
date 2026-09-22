import { Download, FileSpreadsheet, FileText, LoaderCircle, MessageSquareText, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import type { components } from "../api/generated";
import { chatApi } from "../api/services";
import { ApiErrorMessage, BackLink, ErrorState, LoadingState } from "../components/common";
import { isRubricPayload, downloadRubricExcel, downloadRubricMarkdown, downloadRubricPdf, type RubricPayload } from "../utils/rubric";

type Message = components["schemas"]["ChatMessageRead"];

const firstPrompt = "Genera una primera versión de la rúbrica con los niveles y criterios adecuados para esta evaluación.";

export function ChatPage() {
  const { evaluationId = "" } = useParams();
  const [history, setHistory] = useState<components["schemas"]["ChatHistoryRead"] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rubric, setRubric] = useState<RubricPayload | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await chatApi.history(evaluationId);
      setHistory(response); setMessages(response.messages);
      const latestRubric = [...response.messages].reverse().find((message) => isRubricPayload(message.structured_payload));
      setRubric(latestRubric && isRubricPayload(latestRubric.structured_payload) ? latestRubric.structured_payload : null);
    } catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }, [evaluationId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, sending]);

  async function send(message = draft) {
    const cleanMessage = message.trim();
    if (!cleanMessage || sending) return;
    setSending(true); setError(null); setDraft("");
    try {
      const response = await chatApi.send(evaluationId, { message: cleanMessage });
      setMessages((items) => [...items, response.user_message, response.assistant_message]);
      setRubric(response.rubric);
    } catch (sendError) {
      setError(sendError); setDraft(message);
    } finally { setSending(false); }
  }

  async function exportFile(type: "markdown" | "pdf" | "excel") {
    if (!rubric || !history) return;
    setExporting(type);
    try {
      if (type === "markdown") downloadRubricMarkdown(rubric, history.evaluation_name);
      if (type === "pdf") await downloadRubricPdf(rubric, history.evaluation_name);
      if (type === "excel") await downloadRubricExcel(rubric, history.evaluation_name);
    } catch (exportError) {
      setError(exportError);
    } finally { setExporting(null); }
  }

  const hasMessages = messages.length > 0;
  const rubricSummary = useMemo(() => rubric ? `${rubric.criteria.length} criterios · ${Object.keys(rubric.criteria[0]?.levels ?? {}).length} niveles` : null, [rubric]);

  if (loading) return <LoadingState label="Cargando conversación…" />;
  if (error && !history) return <div className="content-narrow"><BackLink to="/app" /><ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /></div>;
  if (!history) return null;

  return <div className="chat-layout"><div className="chat-main"><BackLink to={`/app/evaluations/${history.evaluation_id}`}>Volver a la evaluación</BackLink><div className="chat-heading"><div><p className="eyebrow">{history.course_name}</p><h1>{history.evaluation_name}</h1><p>Conversa sobre tu rúbrica y ajusta sus criterios.</p></div><MessageSquareText size={26} aria-hidden="true" /></div><div className="chat-thread" aria-live="polite">{!hasMessages && <div className="chat-welcome"><div className="chat-welcome__icon"><Sparkles size={22} aria-hidden="true" /></div><h2>Empieza una conversación</h2><p>La IA usará los objetivos, contenidos y niveles que definiste para proponer una rúbrica.</p><button className="button button--secondary" type="button" onClick={() => void send(firstPrompt)} disabled={sending}><Sparkles size={16} aria-hidden="true" /> Generar primera versión</button></div>}{messages.map((message) => <article className={`chat-message chat-message--${message.role === "user" ? "user" : "assistant"}`} key={message.id}><div className="chat-message__label">{message.role === "user" ? "Tú" : "Smart Rubric"}</div>{message.role === "assistant" ? <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div> : <p>{message.content}</p>}</article>)}{sending && <article className="chat-message chat-message--assistant"><div className="chat-message__label">Smart Rubric</div><div className="typing"><LoaderCircle className="spin" size={17} aria-hidden="true" /> Generando una respuesta…</div></article>}<div ref={endRef} /></div>{error ? <ErrorState message={<ApiErrorMessage error={error} />} /> : null}{!hasMessages && !sending && <p className="chat-hint">También puedes escribir una instrucción concreta abajo.</p>}<form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><label htmlFor="chat-message" className="sr-only">Mensaje para la conversación</label><textarea id="chat-message" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Pide un ajuste, una sugerencia o una nueva versión…" disabled={sending} /><button className="button button--primary" type="submit" disabled={sending || !draft.trim()}><Send size={17} aria-hidden="true" /> Enviar</button><small>Enter para enviar · Shift + Enter para una nueva línea</small></form></div><aside className="rubric-panel"><div className="rubric-panel__header"><div><p className="eyebrow">Resultado</p><h2>{rubric?.title ?? "Tu rúbrica"}</h2></div><Sparkles size={20} aria-hidden="true" /></div>{rubric ? <><p className="rubric-meta">{rubricSummary}</p>{rubric.instructions && <div className="rubric-instructions"><strong>Instrucciones</strong><p>{rubric.instructions}</p></div>}<div className="rubric-criteria">{rubric.criteria.map((criterion) => <article className="rubric-criterion" key={`${criterion.criterion}-${criterion.description}`}><h3>{criterion.criterion}</h3><p>{criterion.description}</p><dl>{Object.entries(criterion.levels).map(([level, description]) => <div key={level}><dt>{level}</dt><dd>{description}</dd></div>)}</dl></article>)}</div>{rubric.suggestions?.length ? <div className="rubric-suggestions"><strong>Sugerencias</strong><ul>{rubric.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div> : null}<div className="export-actions"><span>Exportar</span><button className="button button--quiet button--small" type="button" disabled={Boolean(exporting)} onClick={() => void exportFile("markdown")}><Download size={14} aria-hidden="true" /> Markdown</button><button className="button button--quiet button--small" type="button" disabled={Boolean(exporting)} onClick={() => void exportFile("pdf")}><FileText size={14} aria-hidden="true" /> PDF</button><button className="button button--quiet button--small" type="button" disabled={Boolean(exporting)} onClick={() => void exportFile("excel")}><FileSpreadsheet size={14} aria-hidden="true" /> Excel</button></div></> : <div className="rubric-empty"><Sparkles size={22} aria-hidden="true" /><p>La rúbrica aparecerá aquí después de la primera respuesta.</p></div>}</aside></div>;
}
