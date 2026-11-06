import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LockKeyhole, LogOut, Moon, Save, Sun } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/services";
import { ApiErrorMessage, BackLink, PageHeader } from "../components/common";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";

const schema = z.object({
  current_password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  new_password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128, "La contraseña es demasiado larga."),
  confirm_password: z.string().min(1, "Repite la nueva contraseña."),
}).refine((values) => values.new_password === values.confirm_password, { path: ["confirm_password"], message: "Las contraseñas no coinciden." });

type FormValues = z.infer<typeof schema>;

function cachedName(email?: string | null) {
  if (!email) return "";
  try { return localStorage.getItem("smart-rubric-display-name:" + email.trim().toLowerCase()) ?? ""; }
  catch { return ""; }
}

export function AccountPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fullName, setFullName] = useState(() => user?.full_name ?? cachedName(user?.email));
  const [profileError, setProfileError] = useState<unknown>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function submit(values: FormValues) {
    setError(null); setSuccess(null);
    try {
      const response = await authApi.changePassword({ current_password: values.current_password, new_password: values.new_password });
      setSuccess(response.message); reset();
      await logout();
      navigate("/login", { replace: true, state: { notice: response.message } });
    } catch (submitError) { setError(submitError); }
  }

  async function signOut() { await logout(); navigate("/login", { replace: true }); }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    const cleanedName = fullName.trim();
    if (!cleanedName) { setProfileError(new Error("Escribe tu nombre completo.")); return; }
    if (cleanedName.length > 100) { setProfileError(new Error("El nombre no puede superar los 100 caracteres.")); return; }
    setProfileSaving(true);
    try {
      const updated = await authApi.updateProfile({ full_name: cleanedName });
      setFullName(updated.full_name ?? cleanedName);
      setProfileSuccess("Tu nombre se guardó correctamente.");
      await refreshUser();
    } catch (submitError) {
      setProfileError(submitError);
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="settings-page content-narrow">
      <BackLink to="/app">Volver al inicio</BackLink>
      <PageHeader eyebrow="PREFERENCIAS" title="Configuración" description="Personaliza Smart Rubric para que se adapte a tu forma de trabajar." />

      <section className="settings-section">
        <div className="settings-section__heading"><div><span className="settings-section__icon"><Sun size={18} aria-hidden="true" /></span><div><h2>Apariencia</h2><p>Elige cómo se ve tu espacio de trabajo.</p></div></div></div>
        <div className="theme-options" role="group" aria-label="Tema de la aplicación">
          <button className={"theme-option" + (theme === "light" ? " theme-option--selected" : "")} type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
            <span className="theme-option__preview theme-option__preview--light"><span /><i /><i /><i /></span>
            <span className="theme-option__label"><Sun size={16} aria-hidden="true" /><strong>Claro</strong></span>
            {theme === "light" ? <Check size={16} aria-hidden="true" /> : null}
          </button>
          <button className={"theme-option" + (theme === "dark" ? " theme-option--selected" : "")} type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
            <span className="theme-option__preview theme-option__preview--dark"><span /><i /><i /><i /></span>
            <span className="theme-option__label"><Moon size={16} aria-hidden="true" /><strong>Oscuro</strong></span>
            {theme === "dark" ? <Check size={16} aria-hidden="true" /> : null}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__heading"><div><span className="settings-section__icon"><LockKeyhole size={18} aria-hidden="true" /></span><div><h2>Cuenta y seguridad</h2><p>Administra el acceso a tu cuenta.</p></div></div></div>
        <form className="settings-profile-form" onSubmit={submitProfile} noValidate>
          <label className="field"><span>Nombre completo</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={100} placeholder="Escribe tu nombre" /></label>
          <div className="form-actions"><button className="button button--secondary" type="submit" disabled={profileSaving}><Save size={15} aria-hidden="true" /> {profileSaving ? "Guardando…" : "Guardar nombre"}</button></div>
          {profileError ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={profileError} /></div> : null}
          {profileSuccess ? <div className="alert alert--success" role="status">{profileSuccess}</div> : null}
        </form>
        <div className="settings-account"><div><small>Correo electrónico</small><strong>{user?.email ?? "—"}</strong></div><span className="settings-account__badge">Cuenta activa</span></div>
        <div className="settings-security">
          <div className="settings-security__intro"><h3>Cambiar contraseña</h3><p>Por seguridad, al cambiarla tendrás que iniciar sesión de nuevo.</p></div>
          {error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}
          {success ? <div className="alert alert--success" role="status">{success}</div> : null}
          <form className="settings-password-form" onSubmit={handleSubmit(submit)} noValidate>
            <label className="field"><span>Contraseña actual</span><span className="field__control"><LockKeyhole size={16} aria-hidden="true" /><input type="password" autoComplete="current-password" {...register("current_password")} /></span>{errors.current_password && <span className="field-error">{errors.current_password.message}</span>}</label>
            <div className="settings-password-form__row">
              <label className="field"><span>Nueva contraseña</span><span className="field__control"><LockKeyhole size={16} aria-hidden="true" /><input type="password" autoComplete="new-password" {...register("new_password")} /></span>{errors.new_password && <span className="field-error">{errors.new_password.message}</span>}</label>
              <label className="field"><span>Repite la nueva contraseña</span><span className="field__control"><LockKeyhole size={16} aria-hidden="true" /><input type="password" autoComplete="new-password" {...register("confirm_password")} /></span>{errors.confirm_password && <span className="field-error">{errors.confirm_password.message}</span>}</label>
            </div>
            <div className="form-actions"><button className="button button--primary" type="submit" disabled={isSubmitting}><Save size={16} aria-hidden="true" /> {isSubmitting ? "Guardando…" : "Cambiar contraseña"}</button></div>
          </form>
        </div>
      </section>

      <section className="settings-logout"><div><h2>Cerrar sesión</h2><p>Termina tu sesión en este dispositivo.</p></div><button className="button button--secondary" type="button" onClick={() => void signOut()}><LogOut size={16} aria-hidden="true" /> Cerrar sesión</button></section>
    </div>
  );
}
