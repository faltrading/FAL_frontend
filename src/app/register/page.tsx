"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { calculateAge } from "@/lib/utils";

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
  });

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptData, setAcceptData] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.dateOfBirth) {
      const age = calculateAge(new Date(formData.dateOfBirth));
      if (age < 18) {
        setError(t("auth.ageError"));
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (!acceptTerms || !acceptPrivacy || !acceptData) {
      setError(t("auth.consentRequired"));
      return;
    }

    setLoading(true);
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phone,
      });
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950">
        <div className="card max-w-lg w-full text-center">
          <div className="bg-success-500/10 text-success-400 rounded-lg px-4 py-3 mb-4">
            {t("auth.registrationSuccess")}
          </div>
          <Link href="/login" className="text-brand-400 hover:text-brand-300 text-sm">
            {t("auth.login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-950">
      <div className="card max-w-lg w-full">
        <div className="text-center mb-6">
          <UserPlus className="mx-auto mb-3 text-brand-400" size={32} />
          <h1 className="text-2xl font-bold text-surface-100">
            {t("auth.registerTitle")}
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            {t("auth.registerSubtitle")}
          </p>
        </div>

        {error && (
          <div className="bg-error-500/10 text-error-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="label">
                {t("auth.username")}
              </label>
              <input
                id="username"
                type="text"
                className="input-field"
                value={formData.username}
                onChange={(e) => updateField("username", e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="label">
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                className="input-field"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                {t("auth.confirmPassword")}
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input-field"
                value={formData.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="label">
                {t("auth.firstName")}
              </label>
              <input
                id="firstName"
                type="text"
                className="input-field"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="lastName" className="label">
                {t("auth.lastName")}
              </label>
              <input
                id="lastName"
                type="text"
                className="input-field"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="label">
                {t("auth.phone")}
              </label>
              <input
                id="phone"
                type="tel"
                className="input-field"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="label">
                {t("auth.dateOfBirth")}
              </label>
              <input
                id="dateOfBirth"
                type="date"
                className="input-field"
                value={formData.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-2 text-sm text-surface-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 accent-brand-500"
              />
              <span>
                {t("auth.acceptTermsPrefix")}{" "}
                <Link href="/terms" className="text-brand-400 hover:text-brand-300 underline">
                  {t("auth.termsOfService")}
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-surface-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5 accent-brand-500"
              />
              <span>
                {t("auth.acceptPrivacyPrefix")}{" "}
                <Link href="/privacy" className="text-brand-400 hover:text-brand-300 underline">
                  {t("auth.privacyPolicy")}
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-surface-300 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptData}
                onChange={(e) => setAcceptData(e.target.checked)}
                className="mt-0.5 accent-brand-500"
              />
              <span>{t("auth.acceptData")}</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? t("auth.registering") : t("auth.register")}
          </button>
        </form>

        <p className="text-center text-sm text-surface-400 mt-6">
          {t("auth.hasAccount")}{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
