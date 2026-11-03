import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AuthCard, AuthShell } from '../components/AuthLayout';
import { useLanguage } from '../i18n/LanguageContext';

export function ResetPasswordPage() {
    const { t } = useLanguage(); const [params] = useSearchParams(); const navigate = useNavigate();
    const [form, setForm] = useState({ email: params.get('email') || '', token: params.get('token') || '', password: '', confirm: '' }); const [message, setMessage] = useState({ error: '', success: '' });
    async function submit(event) {
        event.preventDefault(); setMessage({ error: '', success: '' });
        if (form.password.length < 8) return setMessage({ error: t.passwordLength, success: '' });
        if (form.password !== form.confirm) return setMessage({ error: t.passwordsMatch, success: '' });
        try { await api.post('/auth/reset-password', { email: form.email, token: form.token, password: form.password }); setMessage({ error: '', success: t.success }); setTimeout(() => navigate('/login'), 900); }
        catch (error) { setMessage({ error: error.response?.data?.message || t.genericError, success: '' }); }
    }
    return <AuthShell compact><AuthCard title={t.resetTitle} subtitle={t.resetSubtitle}><form className="auth-form" onSubmit={submit}>{message.error && <p className="form-message error" role="alert">{message.error}</p>}{message.success && <p className="form-message success" role="status">{message.success}</p>}<label>{t.email}<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>{t.resetToken}<input required value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} /></label><label>{t.newPassword}<input type="password" minLength="8" required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>{t.confirmPassword}<input type="password" minLength="8" required autoComplete="new-password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} /></label><button className="primary-button">{t.resetPassword}</button><Link className="form-link centered" to="/login">{t.backToLogin}</Link></form></AuthCard></AuthShell>;
}
