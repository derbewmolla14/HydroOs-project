import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AuthCard, AuthShell } from '../components/AuthLayout';
import { useLanguage } from '../i18n/LanguageContext';

export function RegisterPage() {
    const { t } = useLanguage(); const navigate = useNavigate(); const [form, setForm] = useState({ firstname: '', lastname: '', email: '', password: '' }); const [error, setError] = useState('');
    async function submit(event) {
        event.preventDefault(); setError('');
        if (!form.firstname || !form.email || !form.password) return setError(t.required);
        if (form.password.length < 8) return setError(t.passwordLength);
        try { await api.post('/auth/register', form); navigate('/login', { state: { registered: true } }); } catch (requestError) { setError(requestError.response?.data?.message || t.genericError); }
    }
    return <AuthShell compact><AuthCard title={t.registerTitle} subtitle={t.registerSubtitle}><form className="auth-form" onSubmit={submit}>{error && <p className="form-message error" role="alert">{error}</p>}<div className="form-grid"><label>{t.firstName}<input required value={form.firstname} onChange={(event) => setForm({ ...form, firstname: event.target.value })} /></label><label>{t.lastName}<input value={form.lastname} onChange={(event) => setForm({ ...form, lastname: event.target.value })} /></label></div><label>{t.email}<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>{t.password}<input type="password" minLength="8" required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><p className="helper-text">{t.noPublicOrg}</p><button className="primary-button">{t.register}</button><Link className="form-link centered" to="/login">{t.backToLogin}</Link></form></AuthCard></AuthShell>;
}
