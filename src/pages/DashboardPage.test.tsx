import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { courseApi, evaluationApi } from "../api/services";

vi.mock("../api/services", () => ({
  courseApi: { list: vi.fn() },
  evaluationApi: { list: vi.fn() },
  authApi: {},
  chatApi: {},
}));

const mockedCourseApi = vi.mocked(courseApi);
const mockedEvaluationApi = vi.mocked(evaluationApi);

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCourseApi.list.mockResolvedValue({ items: [], total: 0 });
    mockedEvaluationApi.list.mockResolvedValue({ items: [], total: 0 });
  });

  it("shows the empty states returned by an empty backend", async () => {
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(await screen.findByText("Aún no tienes cursos")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay chats")).toBeInTheDocument();
  });
});
