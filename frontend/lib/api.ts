import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("thinkr_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("thinkr_token");
      localStorage.removeItem("thinkr_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (data: { email: string; name: string; password: string; role: string }) =>
    apiClient.post("/auth/signup", data),
  login: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login", data),
};

// ─── Students ─────────────────────────────────────────────────────────────────

export const studentsApi = {
  getMyProfile: () => apiClient.get("/students/me"),
  updateMyProfile: (data: object) => apiClient.put("/students/me", data),
  ingestFreeText: (free_text: string) => {
    const form = new FormData();
    form.append("free_text", free_text);
    return apiClient.post("/students/ingest", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  ingestFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post("/students/ingest", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ─── Researchers ──────────────────────────────────────────────────────────────

export const researchersApi = {
  getMyProfile: () => apiClient.get("/researchers/me"),
  updateMyProfile: (data: object) => apiClient.put("/researchers/me", data),
  createProject: (data: object) => apiClient.post("/researchers/me/projects", data),
  listMyProjects: () => apiClient.get("/researchers/me/projects"),
  toggleProject: (projectId: string) =>
    apiClient.patch(`/researchers/me/projects/${projectId}/toggle`),
};

// ─── Discover ─────────────────────────────────────────────────────────────────

export const discoverApi = {
  getProjects: (params?: { remote_only?: boolean; domain?: string; max_hours?: number }) =>
    apiClient.get("/discover", { params }),
};

// ─── Matches ──────────────────────────────────────────────────────────────────

export const matchesApi = {
  swipe: (project_id: string, direction: "left" | "right") =>
    apiClient.post("/matches/swipe", { project_id, direction }),
  researcherSwipe: (match_id: string, direction: "left" | "right") =>
    apiClient.post("/matches/researcher-swipe", { match_id, direction }),
  listMatches: () => apiClient.get("/matches"),
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  getMessages: (matchId: string) => apiClient.get(`/messages/${matchId}`),
  sendMessage: (matchId: string, content: string) =>
    apiClient.post(`/messages/${matchId}`, { content }),
};
