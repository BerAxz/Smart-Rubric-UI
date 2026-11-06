import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Eye, EyeOff, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/services";
import { ApiErrorMessage } from "../components/common";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import authLogoLight from "../assets/figma/auth-logo-light.svg";
import authLogoDark from "../assets/figma/auth-logo-dark.svg";

const schema = z.object({
  fullName: z.string().optional(),
  email: z.string().email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128, "La contraseña es demasiado larga."),
  confirmPassword: z.string().optional(),
}).superRefine((values, context) => {
  if (values.confirmPassword !== undefined) {
    if (values.password !== values.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Las contraseñas no coinciden." });
    }
    if (!values.fullName?.trim()) {
      context.addIssue({ code: "custom", path: ["fullName"], message: "Escribe tu nombre completo." });
    }
  }
});

type FormValues = z.infer<typeof schema>;

function AuthLayout({ children, title, description, isRegister = false }: { children: React.ReactNode; title: string; description: string; isRegister?: boolean }) {
  const { theme } = useTheme();
  const logo = theme === "dark" ? authLogoDark : authLogoLight;
  return (
    <main className="auth-page">
      <section className={"auth-aside" + (isRegister ? " auth-aside--register" : "")}>
        <Link className="auth-brand" to="/">
          <img src={logo} alt="" />
          <span>Smart Rubric</span>
        </Link>
        <div className="auth-aside__story">
          <div className="auth-aside__copy">
            <p className="eyebrow">UN ESPACIO PARA DOCENTES</p>
            <h1>{isRegister ? <>Tu próximo curso<br />empieza aquí.</> : <>La evaluación empieza<br />con tus criterios.</>}</h1>
            <p>{isRegister ? "Crea tu espacio docente, organiza tus evaluaciones y construye rúbricas con apoyo, a tu manera." : "Organiza tus cursos, prepara evaluaciones y construye rúbricas con el apoyo que necesitas, sin perder el control de tu trabajo."}</p>
          </div>
          <div className="auth-aside__preview">
            <div className="auth-aside__preview-heading">
              <small>TU ESPACIO DE TRABAJO</small>
              <span><Check size={14} aria-hidden="true" /> GUARDADO</span>
            </div>
            <strong>Biología · Ecosistemas</strong>
            <div className="auth-aside__bars" aria-hidden="true"><i /><i /><i /></div>
            <small className="auth-aside__preview-foot">3 criterios · En revisión</small>
          </div>
        </div>
        <p className="auth-aside__footer">Una herramienta que acompaña tu criterio.</p>
      </section>
      <section className={`auth-panel ${isRegister ? "auth-panel--register" : ""}`}>
        <Link className="auth-return" to="/">← <span>Volver al inicio</span></Link>
        <div className="auth-panel__content">
          <h2>{title}</h2>
          <p className="auth-panel__description">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isRegister = mode === "register";
  const notice = (location.state as { notice?: string } | null)?.notice;
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: isRegister ? "" : undefined },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (isRegister) await registerUser(values.fullName?.trim() ?? "", values.email, values.password);
      else await login(values.email, values.password);
      const destination = (location.state as { from?: string } | null)?.from ?? "/app";
      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      isRegister={isRegister}
      title={isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
      description={isRegister ? "Comienza a organizar tus cursos y evaluaciones." : "Inicia sesión para continuar con tus cursos y evaluaciones."}
    >
      <form className="form-stack auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {notice && <div className="alert alert--success" role="status">{notice}</div>}
        {submitError ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={submitError} /></div> : null}
        {isRegister && (
          <label className="field">
            <span>Nombre completo</span>
            <input autoComplete="name" placeholder="Escribe tu nombre" maxLength={100} {...register("fullName")} />
            {errors.fullName && <span className="field-error">{errors.fullName.message}</span>}
          </label>
        )}
        <label className="field">
          <span>Correo electrónico</span>
          <span className="field__control"><input type="email" autoComplete="email" placeholder="nombre@correo.com" {...register("email")} /><Mail size={16} aria-hidden="true" /></span>
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>
        <label className="field">
          <span>Contraseña</span>
          <span className="field__control">
            <input type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "Mínimo 8 caracteres" : "Ingresa tu contraseña"} {...register("password")} />
            <button className="password-toggle" type="button" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowPassword((show) => !show)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </span>
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>
        {isRegister && (
          <label className="field">
            <span>Confirmar contraseña</span>
            <span className="field__control">
              <input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repite tu contraseña" {...register("confirmPassword")} />
              <button className="password-toggle" type="button" aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShowConfirmPassword((show) => !show)}>{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </span>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}
          </label>
        )}
        {!isRegister && <div className="form-row form-row--end"><Link to="/forgot-password">¿Olvidaste tu contraseña?</Link></div>}
        <button className="button button--primary button--large auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Procesando…" : isRegister ? "Crear cuenta" : "Iniciar sesión"}
          {!isRegister && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </form>
      {isRegister ? <p className="auth-terms">Al continuar, revisa los términos de uso y privacidad del servicio.</p> : null}
      <p className="auth-switch">
        {isRegister ? "¿Ya tienes una cuenta?" : "¿Todavía no tienes cuenta?"}{" "}
        <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Inicia sesión" : "Crear cuenta"}</Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(null); setResetToken(null);
    try {
      const response = await authApi.forgotPassword({ email });
      setMessage(response.message);
      setResetToken(response.reset_token ?? null);
    } catch (submitError) {
      setError(submitError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Recupera tu contraseña" description="Te ayudaremos a volver a entrar a tu cuenta.">
      <form className="form-stack auth-form" onSubmit={submit} noValidate>
        {error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}
        {message && <div className="alert alert--success" role="status">{message}</div>}
        <label className="field"><span>Correo electrónico</span><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
        <button className="button button--primary button--large" disabled={loading} type="submit">{loading ? "Enviando…" : "Solicitar recuperación"}</button>
      </form>
      {resetToken && <div className="reset-dev-note"><p>Token disponible en este entorno:</p><code>{resetToken}</code><Link className="button button--secondary button--small" to={`/reset-password?token=${encodeURIComponent(resetToken)}`}>Continuar con el token</Link></div>}
      <p className="auth-switch"><Link to="/login">← Volver al inicio de sesión</Link></p>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) { setError(new Error("La contraseña debe tener al menos 8 caracteres.")); return; }
    if (password !== confirmPassword) { setError(new Error("Las contraseñas no coinciden.")); return; }
    setLoading(true);
    try {
      const response = await authApi.resetPassword({ reset_token: token, new_password: password });
      setMessage(response.message);
      setPassword(""); setConfirmPassword("");
    } catch (submitError) {
      setError(submitError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Define una nueva contraseña" description="Usa el token que recibiste para restablecer el acceso.">
      <form className="form-stack auth-form" onSubmit={submit} noValidate>
        {error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}
        {message && <div className="alert alert--success" role="status">{message} <Link to="/login">Inicia sesión.</Link></div>}
        <label className="field"><span>Token de recuperación</span><input required value={token} onChange={(event) => setToken(event.target.value)} /></label>
        <label className="field"><span>Nueva contraseña</span><input required type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label className="field"><span>Repite la contraseña</span><input required type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
        <button className="button button--primary button--large" disabled={loading} type="submit">{loading ? "Guardando…" : "Cambiar contraseña"}</button>
      </form>
      <p className="auth-switch"><Link to="/login">← Volver al inicio de sesión</Link></p>
    </AuthLayout>
  );
}
