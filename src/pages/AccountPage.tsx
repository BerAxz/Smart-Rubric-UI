import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { authApi } from "../api/services";
import { ApiErrorMessage, BackLink, PageHeader } from "../components/common";
import { useAuth } from "../auth/AuthContext";

const schema = z.object({
  current_password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  new_password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128, "La contraseña es demasiado larga."),
  confirm_password: z.string().min(1, "Repite la nueva contraseña."),
}).refine((values) => values.new_password === values.confirm_password, { path: ["confirm_password"], message: "Las contraseñas no coinciden." });

type FormValues = z.infer<typeof schema>;

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  return <div className="content-narrow content-narrow--form"><BackLink to="/app">Volver al inicio</BackLink><PageHeader eyebrow="Cuenta" title="Preferencias de acceso" description={user?.email ?? "Gestiona tu cuenta"} /><section className="form-card"><h2>Cambiar contraseña</h2><p>El cambio revoca las sesiones activas para que vuelvas a entrar con la nueva credencial.</p>{error ? <div className="alert alert--error" role="alert"><ApiErrorMessage error={error} /></div> : null}{success && <div className="alert alert--success" role="status">{success}</div>}<form className="form-stack" onSubmit={handleSubmit(submit)} noValidate><label className="field"><span>Contraseña actual</span><span className="field__control"><LockKeyhole size={17} aria-hidden="true" /><input type="password" autoComplete="current-password" {...register("current_password")} /></span>{errors.current_password && <span className="field-error">{errors.current_password.message}</span>}</label><label className="field"><span>Nueva contraseña</span><span className="field__control"><LockKeyhole size={17} aria-hidden="true" /><input type="password" autoComplete="new-password" {...register("new_password")} /></span>{errors.new_password && <span className="field-error">{errors.new_password.message}</span>}</label><label className="field"><span>Repite la nueva contraseña</span><span className="field__control"><LockKeyhole size={17} aria-hidden="true" /><input type="password" autoComplete="new-password" {...register("confirm_password")} /></span>{errors.confirm_password && <span className="field-error">{errors.confirm_password.message}</span>}</label><div className="form-actions"><button className="button button--primary" type="submit" disabled={isSubmitting}><Save size={16} aria-hidden="true" /> {isSubmitting ? "Guardando…" : "Cambiar contraseña"}</button></div></form></section><section className="account-danger"><h2>Cerrar sesión</h2><p>Revoca tu sesión actual en este navegador.</p><button className="button button--quiet" type="button" onClick={() => void signOut()}>Cerrar sesión</button></section></div>;
}
