import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthCard, AuthShell } from "../components/AuthLayout";
import { useLanguage } from "../i18n/LanguageContext";

function dashboardForRole(user) {
  const role = user.systemRole || user.role;
  return role === "OPERATOR" || role === "user" ? "/home" : "/dashboard";
}

export function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
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
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() ||
        !form.phoneNumber.trim() || !form.password) {
      setError("Please complete all required fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (form.role === "admin" && !form.inviteCode.trim()) {
      setError("Invitation Code is required for Admin registration.");
      return;
    }

    setBusy(true);
    try {
      const registeredUser = await register(form);
      navigate(dashboardForRole(registeredUser), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell compact>
      <AuthCard title="Create Account" subtitle="Create your HydroOS account">
        <form className="auth-form" onSubmit={submit}>
          {error && <p className="form-message error" role="alert">{error}</p>}
          <div className="form-grid">
            <label>
              First Name
              <input required autoComplete="given-name" value={form.firstName}
                onChange={(event) => update("firstName", event.target.value)} />
            </label>
            <label>
              Last Name
              <input required autoComplete="family-name" value={form.lastName}
                onChange={(event) => update("lastName", event.target.value)} />
            </label>
          </div>
          <label>
            Email
            <input type="email" required autoComplete="email" value={form.email}
              onChange={(event) => update("email", event.target.value)} />
          </label>
          <label>
            Phone Number
            <input type="tel" required autoComplete="tel" value={form.phoneNumber}
              onChange={(event) => update("phoneNumber", event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" minLength="8" required autoComplete="new-password"
              value={form.password} onChange={(event) => update("password", event.target.value)} />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(event) => update("role", event.target.value)} required>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {form.role === "admin" && (
            <label>
              Invitation Code
              <input type="password" required autoComplete="off" value={form.inviteCode}
                onChange={(event) => update("inviteCode", event.target.value)}
                placeholder="Enter your Admin invitation code" />
            </label>
          )}
          <button className="primary-button" disabled={busy}>
            {busy ? "Creating account…" : "Create Account"}
          </button>
          <Link className="form-link centered" to="/login">Already have an account? Login</Link>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
