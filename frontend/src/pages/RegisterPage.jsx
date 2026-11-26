import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthCard, AuthShell } from "../components/AuthLayout";
import { useLanguage } from "../i18n/LanguageContext";

export function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    role: "user",
    inviteCode: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!form.firstname || !form.email || !form.password)
      return setError(t.required);
    if (form.password.length < 8) return setError(t.passwordLength);
    if (form.role === "admin" && !form.inviteCode.trim())
      return setError("Admin Invite Code is required for admin registration.");

    setBusy(true);
    try {
      const registeredUser = await register(form);
      const destination = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"].includes(registeredUser.role)
        ? "/dashboard"
        : "/dashboard";
      navigate(destination, { replace: true, state: { registered: true } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell compact>
      <AuthCard title={t.registerTitle} subtitle={t.registerSubtitle}>
        <form className="auth-form" onSubmit={submit}>
          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}
          <div className="form-grid">
            <label>
              {t.firstName}
              <input
                required
                autoComplete="given-name"
                value={form.firstname}
                onChange={(event) => update("firstname", event.target.value)}
              />
            </label>
            <label>
              {t.lastName}
              <input
                autoComplete="family-name"
                value={form.lastname}
                onChange={(event) => update("lastname", event.target.value)}
              />
            </label>
          </div>
          <label>
            {t.email}
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
          <label>
            {t.password}
            <input
              type="password"
              minLength="8"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
            />
          </label>
          <label>
            Account role
            <select
              value={form.role}
              onChange={(event) => update("role", event.target.value)}
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {form.role === "admin" && (
            <label>
              Admin Invite Code
              <input
                type="password"
                required
                autoComplete="off"
                value={form.inviteCode}
                onChange={(event) => update("inviteCode", event.target.value)}
                placeholder="Enter your administrator invite code"
              />
            </label>
          )}
          <p className="helper-text">
            Admin registration requires an invite code issued by a HydroOS administrator.
          </p>
          <button className="primary-button" disabled={busy}>
            {busy ? "Creating account…" : t.register}
          </button>
          <Link className="form-link centered" to="/login">
            {t.backToLogin}
          </Link>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
