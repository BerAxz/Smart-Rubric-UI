import { ArrowRight, BookOpenCheck, Check, Download, FileText, Grid2X2, ListChecks, Menu, MessageSquareText, Rows3, Sparkles } from "lucide-react";
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
    icon: FileText,
    number: "01",
    title: "Describe la evaluación",
    description: "Cuenta qué harán tus estudiantes o adjunta la consigna en PDF para darle contexto a la rúbrica.",
  },
  {
    icon: BookOpenCheck,
    number: "02",
    title: "Conéctala con tu curso",
    description: "Elige la unidad, los objetivos de aprendizaje y los contenidos que quieres considerar.",
  },
  {
    icon: ListChecks,
    number: "03",
    title: "Define los niveles de logro",
    description: "Configura la escala y los puntajes que tienen sentido para esta evaluación.",
  },
  {
    icon: MessageSquareText,
    number: "04",
    title: "Revisa y ajusta en el chat",
    description: "Conversa sobre los criterios, afina los descriptores y exporta la matriz cuando esté lista.",
  },
];

const rubricRows = [
  {
    criterion: "Explica las interacciones",
    descriptors: [
      "Relaciona factores y anticipa sus efectos.",
      "Describe relaciones con apoyo.",
      "Nombra elementos sin relacionarlos.",
    ],
  },
  {
    criterion: "Usa evidencia científica",
    descriptors: [
      "Interpreta datos pertinentes.",
      "Incluye ejemplos con explicación parcial.",
      "Presenta ideas sin evidencia.",
    ],
  },
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
        <p className="eyebrow">TU PROCESO, PASO A PASO</p>
        <h2>Del contexto del curso<br />a una matriz útil.</h2>
        <p>Smart Rubric reúne la actividad, los objetivos y los niveles de logro en una rúbrica que puedes revisar criterio por criterio.</p>
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
        <div className="landing-build__visual" data-stage={activeStage} role="img" aria-label="Ejemplo de una rúbrica de evaluación">
          <div className="landing-build__window">
            <div className="landing-build__chrome">
              <span><i /><i /><i /></span>
              <small>SMART RUBRIC <b>/</b> EVALUACIÓN</small>
              <Sparkles size={15} />
            </div>
            <div className="landing-build__document">
              <div className="landing-build__document-meta">
                <span>BIOLOGÍA · 2° MEDIO</span>
                <b>RÚBRICA DE EJEMPLO</b>
              </div>
              <div className="landing-build__stage">
                <span>{rubricStages[activeStage].number}</span>
                <small>{rubricStages[activeStage].title}</small>
              </div>
              <h3>Relaciones en el ecosistema</h3>
              <p>Evaluación · Unidad 3 · Ciencias naturales</p>
              <div className="landing-build__context">
                <span>OBJETIVOS Y CONTENIDOS</span>
                <small>Interacciones · equilibrio del ecosistema</small>
              </div>
              <div className="landing-build__progress-track"><span /></div>
              <div className="landing-build__table-head">
                <span>CRITERIO</span><span>AVANZADO<br />3 PTS</span><span>LOGRADO<br />2 PTS</span><span>INICIAL<br />1 PT</span>
              </div>
              <div className="landing-build__rows">
                {rubricRows.map((row) => (
                  <div className="landing-build__row" key={row.criterion}>
                    <strong>{row.criterion}</strong>
                    {row.descriptors.map((descriptor, index) => (
                      <span className={"landing-build__descriptor landing-build__descriptor--" + index} key={descriptor}>{descriptor}</span>
                    ))}
                  </div>
                ))}
              </div>
              <div className="landing-build__chat">
                <div className="landing-build__chat-heading"><span className="landing-build__chat-icon"><Sparkles size={14} aria-hidden="true" /></span><span><strong>Ajuste en el chat</strong><small>Una conversación, una rúbrica que evoluciona</small></span></div>
                <p>“Diferencia mejor el nivel logrado del inicial.”</p>
                <span className="landing-build__chat-response"><Check size={12} aria-hidden="true" /> Descriptor actualizado</span>
              </div>
              <div className="landing-build__document-foot">
                <span><i /> Criterios, descriptores y puntajes</span>
                <div className="landing-build__exports"><b>XLSX</b><b>PDF</b><b>MD</b></div>
              </div>
            </div>
          </div>
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
            <span className="landing-kicker">RÚBRICAS CON TU CONTEXTO</span>
            <h1>De tu curso<br />a rúbricas claras.</h1>
            <p>Organiza cursos y unidades, conecta objetivos de aprendizaje y crea rúbricas que puedes revisar y ajustar en conversación.</p>
            <div className="landing-hero__actions"><Link className="button button--primary" to="/register">Crear cuenta</Link><a className="button button--secondary" href="#features">Conocer funciones</a></div>
            <small className="landing-hero__note">La IA propone. Tú decides qué queda en la rúbrica.</small>
          </div>
          <div className="product-preview" role="img" aria-label="Vista previa de una rúbrica con niveles de logro, puntajes y ajustes por chat">
            <div className="product-preview__bar"><span className="product-preview__dots"><img src={dotRed} alt="" /><img src={dotYellow} alt="" /><img src={dotGreen} alt="" /></span><small>smart rubric / espacio de trabajo</small></div>
            <div className="product-preview__body">
              <aside className="product-preview__sidebar"><div className="product-preview__brand"><img src={previewBrand} alt="" /><strong>Smart Rubric</strong></div><small>CURSOS</small><span className="product-preview__active">Biología</span><span>Historia</span><span>Lenguaje</span><small>CHATS</small><span>Ecosistemas</span></aside>
              <div className="product-preview__main">
                <div className="product-preview__topline"><small className="product-preview__eyebrow">BIOLOGÍA · 2° MEDIO</small><span><Download size={11} aria-hidden="true" /> XLSX</span></div>
                <h2>Relaciones en el ecosistema</h2><p>Evaluación · Unidad 3 · Ciencias naturales</p>
                <div className="preview-context"><small>OBJETIVOS Y CONTENIDOS</small><span>Interacciones · equilibrio del ecosistema</span></div>
                <div className="preview-rubric">
                  <div className="preview-rubric__head"><span>Criterio</span><span>Avanzado<br />3 pts</span><span>Logrado<br />2 pts</span><span>Inicial<br />1 pt</span></div>
                  <div className="preview-rubric__row"><strong>Explica las interacciones</strong><span>Relaciona factores y anticipa efectos.</span><span>Describe relaciones con apoyo.</span><span>Nombra elementos sin relacionarlos.</span></div>
                  <div className="preview-rubric__row"><strong>Usa evidencia científica</strong><span>Interpreta datos pertinentes.</span><span>Incluye ejemplos parciales.</span><span>Presenta ideas sin evidencia.</span></div>
                </div>
                <div className="preview-assistant"><img src={assistantBrand} alt="" /><span><small>AJUSTE EN EL CHAT</small><strong>“Haz más observable este criterio.”</strong><small>El descriptor se actualiza en la rúbrica.</small></span><Check size={14} aria-hidden="true" /></div>
              </div>
            </div>
          </div>
          <div className="product-preview-mobile" role="img" aria-label="Vista de una rúbrica con niveles de logro y ajustes por chat">
            <div className="product-preview-mobile__bar"><span><img src={mobileDotRed} alt="" /><img src={mobileDotYellow} alt="" /><img src={mobileDotGreen} alt="" /></span><small>smart rubric / evaluación</small></div>
            <div className="product-preview-mobile__body"><div className="product-preview-mobile__brand"><img src={mobileLogo} alt="" /><span>BIOLOGÍA · UNIDAD 3</span></div><h2>Relaciones en el ecosistema</h2><div className="mobile-preview-rubric"><strong>CRITERIO · NIVELES DE LOGRO</strong><div><span>Explica las interacciones</span><b>Avanzado · 3 pts</b></div><div><span>Usa evidencia científica</span><b>Logrado · 2 pts</b></div></div><div className="mobile-preview-assistant"><img src={mobileLogo} alt="" /><span><strong>Ajusta la rúbrica en el chat</strong><small>Criterios, descriptores y puntajes.</small></span></div></div>
          </div>
        </section>
        <section className="landing-features" id="features">
          <div className="landing-section-heading"><p className="eyebrow">UN FLUJO PENSADO PARA RÚBRICAS</p><h2>Del curso a una evaluación revisable.</h2><p>El contexto que ya tienes se convierte en criterios claros, niveles de logro y puntajes.</p></div>
          <div className="landing-feature-grid">
            <article className="landing-feature-card"><span><Grid2X2 size={22} aria-hidden="true" /></span><h3>Curso, unidad y objetivos</h3><p>Organiza objetivos de aprendizaje y contenidos para mantener el contexto de cada evaluación.</p></article>
            <article className="landing-feature-card"><span><Rows3 size={22} aria-hidden="true" /></span><h3>Contexto para cada rúbrica</h3><p>Describe la actividad o adjunta sus instrucciones en PDF. Elige la unidad, los objetivos y los contenidos a evaluar.</p></article>
            <article className="landing-feature-card"><span><MessageSquareText size={22} aria-hidden="true" /></span><h3>Una matriz que puedes ajustar</h3><p>Revisa criterios, descriptores y puntajes en el chat. Descarga la rúbrica en Excel, PDF o Markdown.</p></article>
          </div>
        </section>
        <RubricBuildStory />
        <section className="landing-bottom-cta"><div><h2>Una rúbrica clara empieza con tu curso.</h2><p>Organiza el contexto y ajusta cada criterio a tu manera de enseñar.</p></div><Link className="button button--primary" to="/register">Crear cuenta <ArrowRight size={16} aria-hidden="true" /></Link></section>
        <footer className="landing-footer"><strong>Smart Rubric</strong><span>Herramientas para docentes, con criterio humano.</span></footer>
      </div>
    </main>
  );
}
