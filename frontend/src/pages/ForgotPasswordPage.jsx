import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AuthCard, AuthShell } from '../components/AuthLayout';
import { useLanguage } from '../i18n/LanguageContext';

export function ForgotPasswordPage() {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [state, setState] = useState({ error: '', success: '' });
    async function submit(event) {
        event.preventDefault(); setState({ error: '', success: '' });
        try { const { data } = await api.post('/auth/forgot-password', { email }); setState({ error: '', success: data.message || t.success }); }
        catch (error) { setState({ error: error.response?.data?.message || t.genericError, success: '' }); }
    }
    return <AuthShell compact><AuthCard title={t.forgotTitle} subtitle={t.forgotSubtitle}><form className="auth-form" onSubmit={submit}>{state.error && <p className="form-message error" role="alert">{state.error}</p>}{state.success && <p className="form-message success" role="status">{state.success}</p>}<label>{t.email}<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="primary-button">{t.sendReset}</button><Link className="form-link centered" to="/login">{t.backToLogin}</Link></form></AuthCard></AuthShell>;
}
