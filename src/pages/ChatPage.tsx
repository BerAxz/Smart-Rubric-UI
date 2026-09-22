import { Download, FileSpreadsheet, FileText, LoaderCircle, MessageSquareText, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import type { components } from "../api/generated";
import { chatApi } from "../api/services";
import { ApiErrorMessage, BackLink, ErrorState, LoadingState } from "../components/common";
import {
  downloadRubricExcel,
  downloadRubricMarkdown,
  downloadRubricPdf,
  isRubricPayload,
  type RubricPayload,
} from "../utils/rubric";

type Message = components["schemas"]["ChatMessageRead"];

const firstPrompt = "Genera una primera versión de la rúbrica y considera toda la información disponible en esta evaluación.";

function RubricInChat({
  rubric,
  evaluationName,
  summary,
  showExport,
  exporting,
  onExport,
}: {
  rubric: RubricPayload;
  evaluationName: string;
  summary: string;
  showExport: boolean;
  exporting: string | null;
  onExport: (type: "markdown" | "pdf" | "excel") => void;
}) {
  const levels = rubric.criteria[0] ? Object.keys(rubric.criteria[0].levels) : [];
  return (
    <div className="rubric-chat-card">
      <div className="rubric-chat-card__header">
        <div>
          <p className="eyebrow">Rúbrica generada</p>
          <h2>{rubric.title || `Rúbrica: ${evaluationName}`}</h2>
          <p className="rubric-meta">{summary}</p>
        </div>
        <Sparkles size={21} aria-hidden="true" />
      </div>
      {rubric.instructions ? (
        <div className="rubric-instructions">
          <strong>Instrucciones</strong>
          <p>{rubric.instructions}</p>
        </div>
      ) : null}
      <div className="rubric-table-wrap">
        <table className="rubric-table">
          <thead>
            <tr>
              <th scope="col">Criterio</th>
              <th scope="col">Qué observar</th>
              {levels.map((level) => <th scope="col" key={level}>{level}</th>)}
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((criterion) => (
              <tr key={`${criterion.criterion}-${criterion.description}`}>
                <th scope="row">{criterion.criterion}</th>
                <td>{criterion.description}</td>
                {levels.map((level) => <td key={level}>{criterion.levels[level] ?? ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rubric.suggestions?.length ? (
        <div className="rubric-suggestions">
          <strong>Sugerencias para revisarla</strong>
          <ul>{rubric.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul>
        </div>
      ) : null}
      {showExport ? (
        <div className="export-actions">
          <span>Exportar desde este chat</span>
          <button className="button button--quiet button--small" type="button" disabled={Boolean(exporting)} onClick={() => onExport("markdown")}>
            <Download size={14} aria-hidden="true" /> Markdown
          </button>
          <button className="button button--quiet button--small" type="button" disabled={Boolean(exporting)} onClick={() => onExport("pdf")}>
            <FileText size={14} aria-hidden="true" /> PDF
          </button>
          <button className="button button--quiet button--small" type="button" disabled={Boolean(exporting)} onClick={() => onExport("excel")}>
            <FileSpreadsheet size={14} aria-hidden="true" /> Excel
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ChatPage() {
  const { evaluationId = "" } = useParams();
  const [history, setHistory] = useState<components["schemas"]["ChatHistoryRead"] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await chatApi.history(evaluationId);
      setHistory(response);
      setMessages(response.messages);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [evaluationId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, sending]);

  const latestRubricMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant" && isRubricPayload(message.structured_payload)),
    [messages],
  );
  const latestRubric = latestRubricMessage && isRubricPayload(latestRubricMessage.structured_payload)
    ? latestRubricMessage.structured_payload
    : null;
  const rubricSummary = latestRubric
    ? `${latestRubric.criteria.length} criterios · ${Object.keys(latestRubric.criteria[0]?.levels ?? {}).length} niveles`
    : "";

  async function send(message = draft) {
    const cleanMessage = message.trim();
    if (!cleanMessage || sending) return;
    setSending(true);
    setError(null);
    setDraft("");
    try {
      const response = await chatApi.send(evaluationId, { message: cleanMessage });
      setMessages((items) => [...items, response.user_message, response.assistant_message]);
    } catch (sendError) {
      setError(sendError);
      setDraft(message);
    } finally {
      setSending(false);
    }
  }

  async function exportFile(type: "markdown" | "pdf" | "excel") {
    if (!latestRubric || !history) return;
    setExporting(type);
    try {
      if (type === "markdown") downloadRubricMarkdown(latestRubric, history.evaluation_name);
      if (type === "pdf") await downloadRubricPdf(latestRubric, history.evaluation_name);
      if (type === "excel") await downloadRubricExcel(latestRubric, history.evaluation_name);
    } catch (exportError) {
      setError(exportError);
    } finally {
      setExporting(null);
    }
  }

  const hasMessages = messages.length > 0;

  if (loading) return <LoadingState label="Cargando conversación…" />;
  if (error && !history) {
    return <div className="content-narrow"><BackLink to="/app" /><ErrorState message={<ApiErrorMessage error={error} />} onRetry={() => void load()} /></div>;
  }
  if (!history) return null;

  return (
    <div className="chat-layout chat-layout--solo">
      <div className="chat-main chat-main--solo">
        <BackLink to={`/app/evaluations/${history.evaluation_id}`}>Volver a la evaluación</BackLink>
        <div className="chat-heading">
          <div>
            <p className="eyebrow">{history.course_name}</p>
            <h1>{history.evaluation_name}</h1>
            <p>
              {history.source_document_name
                ? `La IA analizará ${history.source_document_name} y podrás ajustar la rúbrica aquí mismo.`
                : "Conversa con la IA para crear y ajustar tu rúbrica aquí mismo."}
            </p>
          </div>
          <MessageSquareText size={26} aria-hidden="true" />
        </div>

        <div className="chat-thread" aria-live="polite">
          {!hasMessages ? (
            <div className="chat-welcome">
              <div className="chat-welcome__icon"><Sparkles size={22} aria-hidden="true" /></div>
              <h2>Empieza una conversación</h2>
              <p>
                {history.source_document_name
                  ? "La IA leerá tu PDF, lo contrastará con el curso y propondrá una rúbrica editable."
                  : "La IA usará tu contexto, objetivos, contenidos y niveles para proponer una rúbrica."}
              </p>
              <button className="button button--secondary" type="button" onClick={() => void send(firstPrompt)} disabled={sending}>
                <Sparkles size={16} aria-hidden="true" /> Generar primera versión
              </button>
            </div>
          ) : null}

          {messages.map((message) => {
            const messageRubric = message.role === "assistant" && isRubricPayload(message.structured_payload)
              ? message.structured_payload
              : null;
            return (
              <article className={`chat-message chat-message--${message.role === "user" ? "user" : "assistant"} ${messageRubric ? "chat-message--rubric" : ""}`} key={message.id}>
                <div className="chat-message__label">{message.role === "user" ? "Tú" : "Smart Rubric"}</div>
                {messageRubric ? (
                  <>
                    <p className="rubric-message-intro">He preparado una versión de la rúbrica. Revísala y dime qué quieres ajustar.</p>
                    <RubricInChat
                      rubric={messageRubric}
                      evaluationName={history.evaluation_name}
                      summary={message.id === latestRubricMessage?.id ? rubricSummary : `${messageRubric.criteria.length} criterios`}
                      showExport={message.id === latestRubricMessage?.id}
                      exporting={exporting}
                      onExport={(type) => void exportFile(type)}
                    />
                  </>
                ) : message.role === "assistant" ? (
                  <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>
                ) : (
                  <p>{message.content}</p>
                )}
              </article>
            );
          })}

          {sending ? (
            <article className="chat-message chat-message--assistant">
              <div className="chat-message__label">Smart Rubric</div>
              <div className="typing"><LoaderCircle className="spin" size={17} aria-hidden="true" /> Generando una respuesta…</div>
            </article>
          ) : null}
          <div ref={endRef} />
        </div>

        {error ? <ErrorState message={<ApiErrorMessage error={error} />} /> : null}
        {!hasMessages && !sending ? <p className="chat-hint">También puedes escribir una instrucción concreta abajo.</p> : null}
        <form
          className="chat-composer"
          onSubmit={(event) => { event.preventDefault(); void send(); }}
        >
          <label htmlFor="chat-message" className="sr-only">Mensaje para la conversación</label>
          <textarea
            id="chat-message"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Pide un ajuste, una sugerencia o una nueva versión…"
            disabled={sending}
          />
          <button className="button button--primary" type="submit" disabled={sending || !draft.trim()}>
            <Send size={17} aria-hidden="true" /> Enviar
          </button>
          <small>Enter para enviar · Shift + Enter para una nueva línea</small>
        </form>
      </div>
    </div>
  );
}
