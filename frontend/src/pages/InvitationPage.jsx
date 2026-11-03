import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AuthCard, AuthShell } from '../components/AuthLayout';
import { useLanguage } from '../i18n/LanguageContext';

export function InvitationPage() {
    const { t } = useLanguage(); const navigate = useNavigate(); const [form, setForm] = useState({ email: '', token: '', password: '' }); const [message, setMessage] = useState({ error: '', success: '' });
    async function submit(event) {
        event.preventDefault(); setMessage({ error: '', success: '' }); if (form.password.length < 8) return setMessage({ error: t.passwordLength, success: '' });
        try { await api.post('/organizations/invitations/accept', form); setMessage({ error: '', success: t.success }); setTimeout(() => navigate('/login'), 900); } catch (error) { setMessage({ error: error.response?.data?.message || t.genericError, success: '' }); }
    }
    return <AuthShell compact><AuthCard title={t.invitationTitle} subtitle={t.invitationSubtitle}><form className="auth-form" onSubmit={submit}>{message.error && <p className="form-message error" role="alert">{message.error}</p>}{message.success && <p className="form-message success" role="status">{message.success}</p>}<label>{t.email}<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>{t.invitationToken}<input required value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} /></label><label>{t.password}<input type="password" minLength="8" required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button className="primary-button">{t.activate}</button><Link className="form-link centered" to="/login">{t.backToLogin}</Link></form></AuthCard></AuthShell>;
}
