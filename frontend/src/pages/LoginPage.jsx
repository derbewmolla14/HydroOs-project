import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthCard, AuthShell } from '../components/AuthLayout';
import { useLanguage } from '../i18n/LanguageContext';

export function LoginPage() {
    const { user, login } = useAuth(); const { t } = useLanguage(); const navigate = useNavigate(); const location = useLocation();
    const [form, setForm] = useState({ email: localStorage.getItem('hydroos-remembered-email') || '', password: '' }); const [remember, setRemember] = useState(() => Boolean(localStorage.getItem('hydroos-remembered-email'))); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
    if (user) return <Navigate to="/dashboard" replace />;
    async function submit(event) {
        event.preventDefault(); setError(''); setBusy(true);
        try { if (remember && form.email) localStorage.setItem('hydroos-remembered-email', form.email); else localStorage.removeItem('hydroos-remembered-email'); await login(form.email, form.password); navigate(location.state?.from?.pathname || '/dashboard', { replace: true }); }
        catch (requestError) { setError(requestError.response?.data?.message || t.genericError); } finally { setBusy(false); }
    }
    return <AuthShell><AuthCard title={t.loginTitle} subtitle={t.loginSubtitle}><form className="auth-form" onSubmit={submit}>{error && <p className="form-message error" role="alert">{error}</p>}{location.state?.unauthorized && <p className="form-message error" role="alert">This workspace is available to authorized administrators only.</p>}{location.state?.registered && <p className="form-message success" role="status">{t.success}</p>}<label><span>{t.email}</span><div className="input-with-icon"><Mail size={17} /><input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div></label><label><span>{t.password}</span><div className="input-with-icon"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" className="input-action" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><div className="form-options"><label className="checkbox-label"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />{t.remember}</label><Link className="form-link" to="/forgot-password">{t.forgot}</Link></div><button className="primary-button" disabled={busy}>{busy ? t.signingIn : <>{t.signIn}<ArrowRight size={17} /></>}</button></form><div className="card-divider"><span>or</span></div><div className="card-links"><Link to="/accept-invitation">{t.invitation}</Link><Link to="/register">{t.createAccount}</Link></div></AuthCard></AuthShell>;
}
