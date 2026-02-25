const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("fal_token");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("fal_token");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  upload<T>(path: string, formData: FormData) {
    return this.request<T>("POST", path, formData);
  }
}

export const api = new ApiClient();
