import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, authStorage } from "./client";

const user = { id: "00000000-0000-0000-0000-000000000001", full_name: null, email: "docente@example.com", created_at: "2026-01-01T00:00:00Z" };

describe("apiRequest", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("attaches the access token", async () => {
    authStorage.write({ accessToken: "access", refreshToken: "refresh", expiresIn: 1800, user });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ total: 0, items: [] }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await apiRequest("/api/v1/courses");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: expect.any(Headers) });
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer access");
  });

  it("refreshes once after an expired access token", async () => {
    authStorage.write({ accessToken: "expired", refreshToken: "refresh", expiresIn: 1800, user });
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "token_expired", message: "expired" } }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh", token_type: "bearer", expires_in: 1800 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 0, items: [] }), { status: 200 }));

    const result = await apiRequest<{ total: number }>("/api/v1/courses");
    expect(result.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(authStorage.read()?.accessToken).toBe("new-access");
  });

  it("exposes the backend error contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "course_not_found", message: "Course not found." } }), { status: 404 }),
    );
    await expect(apiRequest("/api/v1/courses/unknown")).rejects.toEqual(
      expect.objectContaining({ status: 404, code: "course_not_found", message: "Course not found." }),
    );
  });
});
