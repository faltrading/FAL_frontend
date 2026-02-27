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

    const url = `${API_URL}${path}`;
    console.debug(`[API] ${method} ${path}`);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      console.error(`[API] Network error — ${method} ${path}:`, networkErr);
      throw networkErr;
    }

    if (res.status === 401) {
      console.warn(`[API] 401 Unauthorized — ${method} ${path} — redirecting to login`);
      if (typeof window !== "undefined") {
        localStorage.removeItem("fal_token");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Request failed" }));
      const msg = err.detail || `HTTP ${res.status}`;
      console.error(`[API] ${method} ${path} → ${res.status}:`, msg);
      throw new Error(msg);
    }

    console.debug(`[API] ${method} ${path} → ${res.status} OK`);
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
