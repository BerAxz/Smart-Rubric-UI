import { ArrowRight, BookOpen, Check, MessageSquareText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="brand" to="/"><span className="brand__mark"><BookOpen size={17} /></span><span>Smart Rubric</span></Link>
        <nav aria-label="Acciones de cuenta"><Link className="button button--quiet button--small" to="/login">Iniciar sesión</Link><Link className="button button--primary button--small" to="/register">Crear cuenta <ArrowRight size={15} aria-hidden="true" /></Link></nav>
      </header>
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="eyebrow">Diseño de evaluación asistido</p>
          <h1>Rúbricas que hacen visible el aprendizaje.</h1>
          <p className="landing-hero__lead">Centraliza tus cursos, elige los objetivos que quieres evaluar y conversa con una IA que te ayuda a convertirlos en criterios observables.</p>
          <div className="landing-hero__actions"><Link className="button button--primary button--large" to="/register">Empezar ahora <ArrowRight size={18} aria-hidden="true" /></Link><Link className="text-link" to="/login">Ya tengo una cuenta</Link></div>
          <div className="landing-proof"><span><Check size={15} aria-hidden="true" /> Contexto por curso</span><span><Check size={15} aria-hidden="true" /> Exportación simple</span><span><Check size={15} aria-hidden="true" /> Tu trabajo, en un solo lugar</span></div>
        </div>
        <div className="landing-hero__visual" aria-label="Vista previa de una rúbrica" role="img">
          <div className="visual-window">
            <div className="visual-window__top"><span /><span /><span /><small>Ensayo argumentativo</small></div>
            <div className="visual-window__body"><div className="visual-kicker">RÚBRICA · LENGUAJE 8° BÁSICO</div><h2>Argumentación y evidencia</h2><div className="visual-row visual-row--head"><span>Criterio</span><span>Inicial</span><span>Logrado</span><span>Sobresaliente</span></div><div className="visual-row"><strong>Uso de evidencia</strong><span>Presenta ideas...</span><span>Integra evidencia...</span><span>Integra y analiza...</span></div><div className="visual-row"><strong>Organización</strong><span>La estructura...</span><span>La estructura...</span><span>La estructura...</span></div><div className="visual-ai"><Sparkles size={15} aria-hidden="true" /><span>La IA sugiere precisar este criterio</span></div></div>
          </div>
        </div>
      </section>
      <section className="landing-features"><div><Sparkles size={20} aria-hidden="true" /><h2>Del contenido al criterio</h2><p>Parte de la información de tu curso y construye una evaluación con objetivos y contenidos seleccionados.</p></div><div><MessageSquareText size={20} aria-hidden="true" /><h2>Conversa con contexto</h2><p>Refina la propuesta en un chat que conserva los mensajes y la rúbrica resultante.</p></div><div><BookOpen size={20} aria-hidden="true" /><h2>Ordena tu práctica</h2><p>Encuentra cursos y evaluaciones en un espacio pequeño, claro y disponible desde cualquier pantalla.</p></div></section>
      <footer className="landing-footer">Smart Rubric · Herramientas para diseñar mejores evaluaciones</footer>
    </main>
  );
}
