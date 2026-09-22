import { BookOpen, LogOut, Menu, Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <NavLink to="/app" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand__mark" aria-hidden="true"><BookOpen size={17} /></span>
            <span>Smart Rubric</span>
          </NavLink>
          <button
            className="icon-button topbar__menu"
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <nav className={`topnav ${menuOpen ? "topnav--open" : ""}`} aria-label="Navegación principal">
            <NavLink to="/app" end className={({ isActive }) => `topnav__link ${isActive ? "is-active" : ""}`} onClick={() => setMenuOpen(false)}>Inicio</NavLink>
            <NavLink to="/app/evaluations" className={({ isActive }) => `topnav__link ${isActive ? "is-active" : ""}`} onClick={() => setMenuOpen(false)}>Evaluaciones</NavLink>
            <NavLink to="/app/courses/new" className={({ isActive }) => `topnav__link ${isActive ? "is-active" : ""}`} onClick={() => setMenuOpen(false)}><Plus size={16} aria-hidden="true" /> Nuevo curso</NavLink>
            <div className="topnav__account">
              <NavLink className="topnav__email" to="/app/account" onClick={() => setMenuOpen(false)} title={user?.email}>{user?.email}</NavLink>
              <button className="button button--quiet button--small" type="button" onClick={handleLogout}><LogOut size={15} aria-hidden="true" /> Salir</button>
            </div>
          </nav>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
