import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { courseApi, evaluationApi } from "../api/services";
import type { components } from "../api/generated";
import logoLight from "../assets/figma/sidebar-logo-light.svg";
import logoDark from "../assets/figma/sidebar-logo-dark.svg";
import plusLight from "../assets/figma/icon-plus-light.svg";
import plusDark from "../assets/figma/icon-plus-dark.svg";
import chatLight from "../assets/figma/icon-chat-light.svg";
import chatDark from "../assets/figma/icon-chat-dark.svg";
import settingsLight from "../assets/figma/icon-settings-light.svg";
import settingsDark from "../assets/figma/icon-settings-dark.svg";
import mobileMenuIcon from "../assets/figma/mobile-menu-icon.svg";
import { useTheme } from "../theme/ThemeContext";

type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];

function initials(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("es-CL") ?? "").join("") || "SR";
}

function displayName(fullName?: string | null, email?: string | null) {
  if (fullName?.trim()) return fullName.trim();
  try {
    const localName = email
      ? localStorage.getItem(`smart-rubric-display-name:${email.trim().toLowerCase()}`)?.trim()
      : null;
    if (localName) return localName;
  } catch {
    // Fall back to the authenticated email.
  }
  return email?.split("@")[0]?.replace(/[._-]+/g, " ") || "Docente";
}

function readSidebarCollapsed() {
  try {
    return localStorage.getItem("smart-rubric-sidebar-collapsed") === "true";
  } catch {
    return false;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [courses, setCourses] = useState<Course[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const name = useMemo(() => displayName(user?.full_name, user?.email), [user?.email, user?.full_name]);
  const avatar = initials(name);
  const dark = theme === "dark";

  useEffect(() => {
    let active = true;
    Promise.all([courseApi.list(), evaluationApi.list()])
      .then(([courseResponse, evaluationResponse]) => {
        if (!active) return;
        setCourses(courseResponse.items);
        setEvaluations(evaluationResponse.items);
      })
      .catch(() => {
        if (active) {
          setCourses([]);
          setEvaluations([]);
        }
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem("smart-rubric-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      // The sidebar preference still applies for this session without storage.
    }
  }, [sidebarCollapsed]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const courseLinks = courses.slice(0, 3);
  const chatLinks = evaluations.slice(0, 3);
  const sidebar = (
    <div className="sidebar__inner">
      <div className="sidebar__brand-row">
        <Link className="sidebar__brand" to="/app" aria-label="Smart Rubric, inicio">
          <img src={dark ? logoDark : logoLight} alt="" />
          <span>Smart Rubric</span>
        </Link>
        <button
          className="icon-button sidebar__collapse"
          type="button"
          aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Compactar barra lateral"}
          aria-controls="app-sidebar"
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Expandir barra lateral" : "Compactar barra lateral"}
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
        >
          {sidebarCollapsed ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
        </button>
        <button className="icon-button sidebar__close" type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>×</button>
      </div>

      <Link className="sidebar__create" to="/app/courses/new" aria-label="Crear curso" title="Crear curso">
        <img src={dark ? plusDark : plusLight} alt="" />
        <span>Crear curso</span>
      </Link>

      <section className="sidebar-section" aria-label="Cursos">
        <div className="sidebar-section__heading">
          <span>CURSOS</span>
          <Link to="/app/courses">Ver todos</Link>
        </div>
        <div className="sidebar-link-list">
          {courseLinks.map((course) => (
            <NavLink className="sidebar-course" to={`/app/courses/${course.id}`} key={course.id} aria-label={course.name} title={course.name}>
              <span className="sidebar-course__mark">{course.name.slice(0, 1).toLocaleUpperCase("es-CL")}</span>
              <span className="sidebar-course__text">
                <strong>{course.name}</strong>
                <small>{course.learning_outcomes.length} objetivos · {course.contents.length} contenidos</small>
              </span>
            </NavLink>
          ))}
        </div>
        {courses.length > 3 ? <Link className="sidebar__more" to="/app/courses">＋ Ver todos los cursos</Link> : null}
      </section>

      <section className="sidebar-section sidebar-section--chats" aria-label="Chats recientes">
        <div className="sidebar-section__heading"><span>CHATS RECIENTES</span></div>
        <div className="sidebar-link-list">
          {chatLinks.map((evaluation) => (
            <Link className="sidebar-chat" to={`/app/evaluations/${evaluation.id}/chat`} key={evaluation.id} aria-label={evaluation.name} title={evaluation.name}>
              <img src={dark ? chatDark : chatLight} alt="" />
              <span className="sidebar-chat__text">
                <strong>{evaluation.name}</strong>
                <small>{courses.find((course) => course.id === evaluation.course_id)?.name ?? "Evaluación"}</small>
              </span>
            </Link>
          ))}
        </div>
        <Link className="sidebar__more sidebar__more--chats" to="/app/chats">Ver todos los chats ↓</Link>
      </section>

      <div className="sidebar__footer">
        <NavLink className="sidebar__settings" to="/app/settings" aria-label="Configuración" title="Configuración">
          <img src={dark ? settingsDark : settingsLight} alt="" />
          <span>Configuración</span>
        </NavLink>
        <button className="sidebar__profile" type="button" onClick={() => navigate("/app/settings")} title={name}>
          <span className="avatar">{avatar}</span>
          <span><strong>{name}</strong><small>Docente</small></span>
        </button>
        <button className="sidebar__logout" type="button" onClick={() => void handleLogout()} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={15} aria-hidden="true" /><span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={"app-shell" + (sidebarCollapsed ? " app-shell--sidebar-collapsed" : "")}>
      <header className="mobile-topbar">
        <button className="mobile-topbar__menu" type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <img src={mobileMenuIcon} alt="" />
        </button>
        <Link to="/app" className="mobile-topbar__brand">Smart Rubric</Link>
        <button className="avatar mobile-topbar__avatar" type="button" onClick={() => navigate("/app/settings")} aria-label="Abrir configuración">{avatar}</button>
      </header>
      {menuOpen ? <button className="sidebar-scrim" type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} /> : null}
      <aside id="app-sidebar" className={`app-sidebar ${menuOpen ? "app-sidebar--open" : ""}`} aria-label="Navegación">
        {sidebar}
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
