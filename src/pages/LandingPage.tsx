import { ArrowRight, BookOpenCheck, Check, Grid2X2, ListChecks, Menu, Rows3, Sparkles, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../theme/ThemeContext";
import landingLogoLight from "../assets/figma/landing-logo-light.svg";
import landingLogoDark from "../assets/figma/landing-logo-dark.svg";
import previewLogoLight from "../assets/figma/preview-logo-light.svg";
import previewLogoDark from "../assets/figma/preview-logo-dark.svg";
import assistantLogoLight from "../assets/figma/assistant-logo-light.svg";
import assistantLogoDark from "../assets/figma/assistant-logo-dark.svg";
import dotRed from "../assets/figma/landing-dot-red.svg";
import dotYellow from "../assets/figma/landing-dot-yellow.svg";
import dotGreen from "../assets/figma/landing-dot-green.svg";
import mobileLogo from "../assets/figma/mobile-landing-logo.svg";
import mobileDotRed from "../assets/figma/mobile-landing-dot-red.svg";
import mobileDotYellow from "../assets/figma/mobile-landing-dot-yellow.svg";
import mobileDotGreen from "../assets/figma/mobile-landing-dot-green.svg";

const rubricStages = [
  {
    icon: BookOpenCheck,
    number: "01",
    title: "Parte desde tu contexto",
    description: "Elige el curso y los objetivos que quieres evaluar. La rúbrica comienza con lo que ya enseñas.",
  },
  {
    icon: Target,
    number: "02",
    title: "Aterriza cada criterio",
    description: "Convierte los objetivos en criterios observables, redactados para que todos sepan qué se espera.",
  },
  {
    icon: ListChecks,
    number: "03",
    title: "Describe los niveles",
    description: "Completa niveles de logro claros y graduales. Tú revisas cada propuesta y decides qué conservar.",
  },
  {
    icon: Check,
    number: "04",
    title: "Lista para revisar y compartir",
    description: "Ajusta, guarda y exporta la matriz. El resultado sigue tus decisiones pedagógicas.",
  },
];

const rubricRows = [
  { title: "Comprensión de conceptos", description: "Explica relaciones entre los elementos.", level: "Logrado" },
  { title: "Uso de evidencia", description: "Sustenta sus ideas con ejemplos del curso.", level: "En progreso" },
  { title: "Comunicación científica", description: "Organiza y comunica sus conclusiones.", level: "Logrado" },
  { title: "Propuesta de solución", description: "Propone acciones coherentes con el análisis.", level: "Por revisar" },
];

function RubricBuildStory() {
  const [activeStage, setActiveStage] = useState(0);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setActiveStage(rubricStages.length - 1);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length === 0) return;

      const viewportMiddle = window.innerHeight / 2;
      const current = visible.reduce((closest, entry) => {
        const entryMiddle = (entry.boundingClientRect.top + entry.boundingClientRect.bottom) / 2;
        const closestMiddle = (closest.boundingClientRect.top + closest.boundingClientRect.bottom) / 2;
        return Math.abs(entryMiddle - viewportMiddle) < Math.abs(closestMiddle - viewportMiddle) ? entry : closest;
      });
      const index = Number((current.target as HTMLElement).dataset.stageIndex);
      if (Number.isInteger(index)) setActiveStage(index);
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });

    stageRefs.current.forEach((stage) => {
      if (stage) observer.observe(stage);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="landing-process landing-build" id="how-it-works">
      <div className="landing-build__intro">
        <p className="eyebrow">DE LA IDEA A UNA RÚBRICA CLARA</p>
        <h2>La ves tomar forma<br />mientras avanzas.</h2>
        <p>Un proceso guiado que parte por tus objetivos y termina en criterios que puedes revisar, ajustar y compartir.</p>
      </div>
      <div className="landing-build__layout">
        <div className="landing-build__steps">
          {rubricStages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <article
                className={"landing-build-step" + (activeStage === index ? " is-active" : "")}
                data-stage-index={index}
                key={stage.number}
                ref={(node) => { stageRefs.current[index] = node; }}
                aria-current={activeStage === index ? "step" : undefined}
              >
                <span className="landing-build-step__icon"><Icon size={17} aria-hidden="true" /></span>
                <div>
                  <small>{stage.number} / 04</small>
                  <h3>{stage.title}</h3>
                  <p>{stage.description}</p>
                </div>
              </article>
            );
          })}
        </div>
        <div className="landing-build__visual" data-stage={activeStage} aria-hidden="true">
          <div className="landing-build__window">
            <div className="landing-build__chrome">
              <span><i /><i /><i /></span>
              <small>SMART RUBRIC <b>/</b> NUEVA EVALUACIÓN</small>
              <Sparkles size={15} />
            </div>
            <div className="landing-build__document">
              <div className="landing-build__document-meta">
                <span>BIOLOGÍA · 2° MEDIO</span>
                <b>{activeStage === rubricStages.length - 1 ? "LISTA PARA REVISAR" : "EN CONSTRUCCIÓN"}</b>
              </div>
              <h3>Relaciones en el ecosistema</h3>
              <p>Rúbrica de evaluación · Unidad 3</p>
              <div className="landing-build__progress-track"><span /></div>
              <div className="landing-build__table-head"><span>CRITERIO</span><span>NIVEL DE LOGRO</span></div>
              <div className="landing-build__rows">
                {rubricRows.map((row, index) => {
                  const visible = index <= activeStage;
                  return (
                    <div className={"landing-build__row" + (visible ? " is-visible" : "")} key={row.title}>
                      <span className="landing-build__row-check"><Check size={13} /></span>
                      <span className="landing-build__row-copy"><strong>{row.title}</strong><small>{row.description}</small></span>
                      <b className={"landing-build__level landing-build__level--" + (index % 2 === 0 ? "ready" : "draft")}>{visible ? row.level : "Por definir"}</b>
                    </div>
                  );
                })}
              </div>
              <div className="landing-build__document-foot">
                <span><i /> Cambios guardados</span>
                <small>{String(activeStage + 1).padStart(2, "0")} de 04 pasos</small>
              </div>
            </div>
          </div>
          <span className="landing-build__float-tag"><Check size={14} /> Tu criterio, siempre al centro</span>
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const dark = theme === "dark";
  const brand = dark ? landingLogoDark : landingLogoLight;
  const previewBrand = dark ? previewLogoDark : previewLogoLight;
  const assistantBrand = dark ? assistantLogoDark : assistantLogoLight;

  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/"><img src={brand} alt="" /><span>Smart Rubric</span></Link>
        <button className="landing-menu-button" type="button" aria-label="Abrir navegación" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={20} /></button>
        <nav className={menuOpen ? "landing-nav landing-nav--open" : "landing-nav"} aria-label="Navegación principal">
          <a href="#features" onClick={() => setMenuOpen(false)}>Funciones</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
          <a href="#for-teachers" onClick={() => setMenuOpen(false)}>Para docentes</a>
          <Link className="landing-login" to="/login">Ingresar</Link>
          <Link className="button button--primary landing-header__cta" to="/register">Crear cuenta</Link>
        </nav>
      </header>
      <div className="landing-container">
        <section className="landing-hero" id="for-teachers">
          <div className="landing-hero__copy">
            <span className="landing-kicker">HECHO PARA DOCENTES</span>
            <h1>Evalúa con claridad.<br />Mantén tu criterio.</h1>
            <p>Organiza tus cursos, define criterios de evaluación y prepara rúbricas con apoyo de IA. Todo en un espacio pensado para tu trabajo docente.</p>
            <div className="landing-hero__actions"><Link className="button button--primary" to="/register">Crear cuenta</Link><a className="button button--secondary" href="#features">Conocer funciones</a></div>
            <small className="landing-hero__note">Tus criterios siguen siendo el punto de partida.</small>
          </div>
          <div className="product-preview" aria-label="Vista previa de Smart Rubric">
            <div className="product-preview__bar"><span className="product-preview__dots"><img src={dotRed} alt="" /><img src={dotYellow} alt="" /><img src={dotGreen} alt="" /></span><small>smart rubric / espacio de trabajo</small></div>
            <div className="product-preview__body">
              <aside className="product-preview__sidebar"><div className="product-preview__brand"><img src={previewBrand} alt="" /><strong>Smart Rubric</strong></div><small>CURSOS</small><span className="product-preview__active">Biología</span><span>Historia</span><span>Lenguaje</span><small>CHATS</small><span>Ecosistemas</span></aside>
              <div className="product-preview__main"><small className="product-preview__eyebrow">BIOLOGÍA · 2° MEDIO</small><h2>Evaluación: Ecosistemas</h2><p>Criterios de evaluación</p>
                <div className="preview-rubric"><div className="preview-rubric__head"><span>Criterio</span><span>Nivel</span></div><div className="preview-rubric__row"><span>Comprende los conceptos</span><b>Logrado</b></div><div className="preview-rubric__row"><span>Relaciona ideas y ejemplos</span><b>En progreso</b></div></div>
                <div className="preview-assistant"><img src={assistantBrand} alt="" /><span><strong>¿Necesitas ajustar un criterio?</strong><small>Consulta al asistente sin salir de tu curso.</small></span></div>
              </div>
            </div>
          </div>
          <div className="product-preview-mobile" aria-label="Vista previa de una evaluación">
            <div className="product-preview-mobile__bar"><span><img src={mobileDotRed} alt="" /><img src={mobileDotYellow} alt="" /><img src={mobileDotGreen} alt="" /></span><small>smart rubric / evaluación</small></div>
            <div className="product-preview-mobile__body"><div className="product-preview-mobile__brand"><img src={mobileLogo} alt="" /><span>BIOLOGÍA</span></div><h2>Ecosistemas</h2><div className="mobile-preview-rubric"><strong>Criterios de evaluación</strong><div><span>Comprensión</span><b>✓</b></div><div><span>Relación de ideas</span><b>~</b></div><div><span>Ejemplos</span><b>✓</b></div></div><div className="mobile-preview-assistant"><img src={mobileLogo} alt="" /><span><strong>Asistente</strong><small>Revisa y ajusta criterios.</small></span></div></div>
          </div>
        </section>
        <section className="landing-features" id="features">
          <div className="landing-section-heading"><p className="eyebrow">UN ESPACIO, TODO TU PROCESO</p><h2>Desde la planificación hasta la rúbrica.</h2><p>Herramientas claras para organizar el trabajo, sin añadir complejidad.</p></div>
          <div className="landing-feature-grid">
            <article className="landing-feature-card"><span><Grid2X2 size={22} aria-hidden="true" /></span><h3>Cursos organizados</h3><p>Mantén objetivos, contenidos y evaluaciones juntos, en un mismo lugar.</p></article>
            <article className="landing-feature-card"><span><Rows3 size={22} aria-hidden="true" /></span><h3>Contexto para cada evaluación</h3><p>Adjunta un PDF o describe lo que vas a evaluar para partir con la información correcta.</p></article>
            <article className="landing-feature-card"><span><Check size={22} aria-hidden="true" /></span><h3>Asistencia con criterio</h3><p>Explora propuestas y ajusta cada rúbrica de acuerdo con tu enfoque pedagógico.</p></article>
          </div>
        </section>
        <RubricBuildStory />
        <section className="landing-bottom-cta"><div><h2>Tu próximo curso, más organizado.</h2><p>Empieza con tus propios criterios y contenidos.</p></div><Link className="button button--primary" to="/register">Crear cuenta <ArrowRight size={16} aria-hidden="true" /></Link></section>
        <footer className="landing-footer"><strong>Smart Rubric</strong><span>Herramientas para docentes, con criterio humano.</span></footer>
      </div>
    </main>
  );
}
