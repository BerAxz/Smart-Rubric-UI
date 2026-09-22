import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BookOpen, Mail, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/services";
import { ApiErrorMessage } from "../components/common";
import { useAuth } from "../auth/AuthContext";

const schema = z.object({
  email: z.string().email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128, "La contraseña es demasiado larga."),
  confirmPassword: z.string().optional(),
}).superRefine((values, context) => {
  if (values.confirmPassword !== undefined && values.password !== values.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Las contraseñas no coinciden." });
  }
});

type FormValues = z.infer<typeof schema>;

function AuthLayout({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return (
    <main className="auth-page">
      <section className="auth-aside">
        <Link className="brand brand--light" to="/"><span className="brand__mark"><BookOpen size={17} /></span><span>Smart Rubric</span></Link>
        <div className="auth-aside__content">
          <p className="eyebrow eyebrow--light">Evaluar mejor, con menos trabajo</p>
          <h1>Convierte tus objetivos en rúbricas claras.</h1>
          <p>Organiza tus cursos, diseña evaluaciones y conversa con una IA que mantiene el contexto pedagógico.</p>
        </div>
        <p className="auth-aside__footer">Una herramienta para el trabajo docente.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__content">
          <p className="eyebrow">Smart Rubric</p>
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
  const isRegister = mode === "register";
  const notice = (location.state as { notice?: string } | null)?.notice;
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: isRegister ? "" : undefined },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      if (isRegister) await registerUser(values.email, values.password);
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
      title={isRegister ? "Crea tu cuenta" : "Bienvenido de vuelta"}
      description={isRegister ? "Empieza a organizar tus evaluaciones en un solo lugar." : "Ingresa para continuar con tus cursos y rúbricas."}
    >
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        {notice && <div className="alert alert--success" role="status">{notice}</div>}
        {submitError ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={submitError} /></div> : null}
        <label className="field">
          <span>Correo electrónico</span>
          <span className="field__control"><Mail size={17} aria-hidden="true" /><input type="email" autoComplete="email" placeholder="docente@ejemplo.com" {...register("email")} /></span>
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>
        <label className="field">
          <span>Contraseña</span>
          <span className="field__control"><LockKeyhole size={17} aria-hidden="true" /><input type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Mínimo 8 caracteres" {...register("password")} /></span>
          {errors.password && <span className="field-error">{errors.password.message}</span>}
        </label>
        {isRegister && (
          <label className="field">
            <span>Repite la contraseña</span>
            <span className="field__control"><LockKeyhole size={17} aria-hidden="true" /><input type="password" autoComplete="new-password" {...register("confirmPassword")} /></span>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}
          </label>
        )}
        {!isRegister && <div className="form-row form-row--end"><Link to="/forgot-password">¿Olvidaste tu contraseña?</Link></div>}
        <button className="button button--primary button--large" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Procesando…" : isRegister ? "Crear cuenta" : "Iniciar sesión"} <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>
      <p className="auth-switch">
        {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"} {" "}
        <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Inicia sesión" : "Regístrate"}</Link>
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
      <form className="form-stack" onSubmit={submit} noValidate>
        {error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}
        {message && <div className="alert alert--success" role="status">{message}</div>}
        <label className="field"><span>Correo electrónico</span><span className="field__control"><Mail size={17} aria-hidden="true" /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="docente@ejemplo.com" /></span></label>
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
      <form className="form-stack" onSubmit={submit} noValidate>
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
