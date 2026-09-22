import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthContext";
import { AuthPage } from "./AuthPage";
import { authApi } from "../api/services";

vi.mock("../api/services", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
  courseApi: {},
  evaluationApi: {},
  chatApi: {},
}));

const mockedAuthApi = vi.mocked(authApi);

function renderLogin() {
  return render(<MemoryRouter initialEntries={["/login"]}><AuthProvider><Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/app" element={<p>Dashboard</p>} /></Routes></AuthProvider></MemoryRouter>);
}

describe("AuthPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedAuthApi.login.mockResolvedValue({ accessToken: "access", refreshToken: "refresh", expiresIn: 1800, user: { id: "user-1", email: "docente@example.com", created_at: "2026-01-01T00:00:00Z" } });
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
});
