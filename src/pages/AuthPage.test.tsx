import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { AuthPage } from "./AuthPage";
import { authApi } from "../api/services";

vi.mock("../api/services", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
  courseApi: {},
  evaluationApi: {},
  chatApi: {},
}));

const mockedAuthApi = vi.mocked(authApi);

function renderLogin() {
  return render(<ThemeProvider><MemoryRouter initialEntries={["/login"]}><AuthProvider><Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/app" element={<p>Dashboard</p>} /></Routes></AuthProvider></MemoryRouter></ThemeProvider>);
}

function renderRegister() {
  return render(<ThemeProvider><MemoryRouter initialEntries={["/register"]}><AuthProvider><Routes><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/app" element={<p>Dashboard</p>} /></Routes></AuthProvider></MemoryRouter></ThemeProvider>);
}

describe("AuthPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedAuthApi.login.mockResolvedValue({ accessToken: "access", refreshToken: "refresh", expiresIn: 1800, user: { id: "user-1", full_name: null, email: "docente@example.com", created_at: "2026-01-01T00:00:00Z" } });
  });

  it("logs in and navigates to the dashboard", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText("Correo electrónico"), "docente@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correct-horse");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(mockedAuthApi.login).toHaveBeenCalledWith({ email: "docente@example.com", password: "correct-horse" });
  });

  it("shows client-side validation before calling the API", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    expect(await screen.findByText("Escribe un correo válido.")).toBeInTheDocument();
    expect(mockedAuthApi.login).not.toHaveBeenCalled();
  });

  it("registers with a full name and keeps it as a compatibility fallback", async () => {
    const user = userEvent.setup();
    mockedAuthApi.register.mockResolvedValue({ accessToken: "access", refreshToken: "refresh", expiresIn: 1800, user: { id: "user-2", full_name: "Ana Pérez", email: "ana@example.com", created_at: "2026-01-01T00:00:00Z" } });
    renderRegister();
    await user.type(screen.getByLabelText("Nombre completo"), "Ana Pérez");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "correct-horse");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "correct-horse");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(mockedAuthApi.register).toHaveBeenCalledWith({ full_name: "Ana Pérez", email: "ana@example.com", password: "correct-horse" });
    expect(localStorage.getItem("smart-rubric-display-name:ana@example.com")).toBe("Ana Pérez");
  });
});
