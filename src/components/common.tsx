import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function LoadingState({ label = "Cargando…", fullPage = false }: { label?: string; fullPage?: boolean }) {
  return (
    <div className={`state ${fullPage ? "state--full-page" : ""}`} role="status" aria-live="polite">
      <LoaderCircle className="spin" aria-hidden="true" size={22} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">○</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: ReactNode; onRetry?: () => void }) {
  return (
    <div className="alert alert--error" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <button className="button button--quiet button--small" type="button" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  );
}

export function SuccessState({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert--success" role="status">
      <CheckCircle2 size={19} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error" role="alert">{message}</p> : null;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function BackLink({ to, children = "Volver" }: { to: string; children?: ReactNode }) {
  return <Link className="back-link" to={to}>← {children}</Link>;
}

export function ApiErrorMessage({ error, fallback = "No pudimos completar la operación." }: { error: unknown; fallback?: string }) {
  if (error instanceof Error && error.message) return <>{error.message}</>;
  return <>{fallback}</>;
}
