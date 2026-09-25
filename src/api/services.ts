import type { components } from "./generated";
import { apiRequest, authStorage, type StoredAuth } from "./client";

type AuthResponse = components["schemas"]["AuthResponse"];
type Course = components["schemas"]["CourseRead"];
type Evaluation = components["schemas"]["EvaluationRead"];
type SourceDocument = components["schemas"]["SourceDocumentRead"];

function saveAuth(response: AuthResponse): StoredAuth {
  const auth: StoredAuth = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
    user: response.user,
  };
  authStorage.write(auth);
  return auth;
}

export const authApi = {
  async register(input: components["schemas"]["RegisterRequest"]) {
    return saveAuth(
      await apiRequest<AuthResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(input) }, { auth: false }),
    );
  },
  async login(input: components["schemas"]["LoginRequest"]) {
    return saveAuth(
      await apiRequest<AuthResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(input) }, { auth: false }),
    );
  },
  async me() {
    return apiRequest<components["schemas"]["UserRead"]>("/api/v1/auth/me");
  },
  async logout() {
    const current = authStorage.read();
    try {
      if (current) {
        await apiRequest<components["schemas"]["AuthMessageResponse"]>(
          "/api/v1/auth/logout",
          { method: "POST", body: JSON.stringify({ refresh_token: current.refreshToken }) },
        );
      }
    } finally {
      authStorage.clear();
    }
  },
  async changePassword(input: components["schemas"]["PasswordChangeRequest"]) {
    return apiRequest<components["schemas"]["AuthMessageResponse"]>(
      "/api/v1/auth/password/change",
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  async forgotPassword(input: components["schemas"]["PasswordForgotRequest"]) {
    return apiRequest<components["schemas"]["PasswordForgotResponse"]>(
      "/api/v1/auth/password/forgot",
      { method: "POST", body: JSON.stringify(input) },
      { auth: false },
    );
  },
  async resetPassword(input: components["schemas"]["PasswordResetRequest"]) {
    return apiRequest<components["schemas"]["AuthMessageResponse"]>(
      "/api/v1/auth/password/reset",
      { method: "POST", body: JSON.stringify(input) },
      { auth: false },
    );
  },
};

export const courseApi = {
  list: () => apiRequest<components["schemas"]["CourseListResponse"]>("/api/v1/courses"),
  get: (courseId: string) => apiRequest<Course>(`/api/v1/courses/${courseId}`),
  create: (input: components["schemas"]["CourseCreate"]) =>
    apiRequest<Course>("/api/v1/courses", { method: "POST", body: JSON.stringify(input) }),
  rename: (courseId: string, input: components["schemas"]["CourseRename"]) =>
    apiRequest<Course>(`/api/v1/courses/${courseId}`, { method: "PATCH", body: JSON.stringify(input) }),
  updateStructure: (courseId: string, input: components["schemas"]["CourseStructureUpdate"]) =>
    apiRequest<Course>(`/api/v1/courses/${courseId}/structure`, { method: "PUT", body: JSON.stringify(input) }),
  archive: (courseId: string) =>
    apiRequest<components["schemas"]["MessageResponse"]>(`/api/v1/courses/${courseId}`, { method: "DELETE" }),
};

async function sha256File(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const sourceDocumentApi = {
  async createUploadIntent(input: components["schemas"]["SourceDocumentUploadIntentRequest"]) {
    return apiRequest<components["schemas"]["SourceDocumentUploadIntentResponse"]>(
      "/api/v1/source-documents/upload-intents",
      { method: "POST", body: JSON.stringify(input) },
    );
  },
  async upload(uploadUrl: string, headers: Record<string, string>, file: File) {
    try {
      const response = await fetch(uploadUrl, { method: "PUT", headers, body: file });
      if (response.ok) return;
    } catch {
      // A local S3-compatible endpoint may not expose browser CORS. Use the authenticated API fallback.
    }
    throw new Error("direct-upload-failed");
  },
  async uploadViaApi(documentId: string, file: File) {
    const form = new FormData();
    form.append("file", file, file.name);
    return apiRequest<SourceDocument>(`/api/v1/source-documents/${documentId}/upload`, {
      method: "POST",
      body: form,
    });
  },
  async complete(documentId: string, input: components["schemas"]["SourceDocumentCompleteRequest"]) {
    return apiRequest<SourceDocument>(`/api/v1/source-documents/${documentId}/complete`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  async uploadFile(file: File) {
    const checksum = await sha256File(file);
    const intent = await this.createUploadIntent({
      original_filename: file.name,
      size_bytes: file.size,
      sha256: checksum,
    });
    try {
      await this.upload(intent.upload_url, intent.upload_headers ?? {}, file);
    } catch (uploadError) {
      if (uploadError instanceof Error && uploadError.message === "direct-upload-failed") {
        await this.uploadViaApi(intent.document.id, file);
      } else {
        throw uploadError;
      }
    }
    return this.complete(intent.document.id, { sha256: checksum });
  },
  async get(documentId: string) {
    return apiRequest<SourceDocument>(`/api/v1/source-documents/${documentId}`);
  },
  async downloadForCourse(courseId: string) {
    return apiRequest<components["schemas"]["SourceDocumentDownloadResponse"]>(
      `/api/v1/courses/${courseId}/source-document/download-url`,
      { method: "POST" },
    );
  },
  checksum: sha256File,
};

export const evaluationApi = {
  list: () => apiRequest<components["schemas"]["EvaluationListResponse"]>("/api/v1/evaluations"),
  listForCourse: (courseId: string) =>
    apiRequest<components["schemas"]["EvaluationListResponse"]>(`/api/v1/courses/${courseId}/evaluations`),
  get: (evaluationId: string) => apiRequest<Evaluation>(`/api/v1/evaluations/${evaluationId}`),
  create: (courseId: string, input: components["schemas"]["EvaluationCreate"]) =>
    apiRequest<Evaluation>(`/api/v1/courses/${courseId}/evaluations`, { method: "POST", body: JSON.stringify(input) }),
  update: (evaluationId: string, input: components["schemas"]["EvaluationUpdate"]) =>
    apiRequest<Evaluation>(`/api/v1/evaluations/${evaluationId}`, { method: "PATCH", body: JSON.stringify(input) }),
  archive: (evaluationId: string) =>
    apiRequest<components["schemas"]["MessageResponse"]>(`/api/v1/evaluations/${evaluationId}`, { method: "DELETE" }),
};

export const chatApi = {
  history: (evaluationId: string) =>
    apiRequest<components["schemas"]["ChatHistoryRead"]>(`/api/v1/evaluations/${evaluationId}/chat`),
  send: (evaluationId: string, input: components["schemas"]["ChatMessageCreate"]) =>
    apiRequest<components["schemas"]["ChatMessageResponse"]>(
      `/api/v1/evaluations/${evaluationId}/chat/messages`,
      { method: "POST", body: JSON.stringify(input) },
    ),
};
