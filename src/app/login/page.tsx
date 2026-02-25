"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      window.location.href = "/";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <LogIn className="mx-auto mb-3 text-brand-400" size={32} />
          <h1 className="text-2xl font-bold text-surface-100">
            {t("auth.loginTitle")}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {error && (
          <div className="bg-error-500/10 text-error-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="label">
              {t("auth.username")}
            </label>
            <input
              id="username"
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? t("auth.loggingIn") : t("auth.login")}
          </button>
        </form>

        <p className="text-center text-sm text-surface-400 mt-6">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="text-brand-400 hover:text-brand-300">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
