import { useState } from 'react';
import { KeyRound, MailCheck } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { AdminLayout } from '../layouts/AdminLayout';

export function PasswordChangePage() {
    const { user, logout } = useAuth();
    const [codeRequested, setCodeRequested] = useState(false);
    const [form, setForm] = useState({ code: '', password: '', confirm: '' });
    const [message, setMessage] = useState({ error: '', success: '' });
    const [busy, setBusy] = useState(false);

    async function requestCode() {
        setBusy(true); setMessage({ error: '', success: '' });
        try { const { data } = await api.post('/auth/password-change/request'); setCodeRequested(true); setMessage({ error: '', success: data.message }); }
        catch (error) { setMessage({ error: error.response?.data?.message || 'The OTP could not be requested.', success: '' }); }
        finally { setBusy(false); }
    }

    async function confirm(event) {
        event.preventDefault(); setMessage({ error: '', success: '' });
        if (form.password !== form.confirm) return setMessage({ error: 'Passwords do not match.', success: '' });
        setBusy(true);
        try { const { data } = await api.post('/auth/password-change/confirm', { code: form.code, password: form.password }); await logout(); setMessage({ error: '', success: data.message }); }
        catch (error) { setMessage({ error: error.response?.data?.message || 'The password could not be changed.', success: '' }); }
        finally { setBusy(false); }
    }

    return <AdminLayout title="Change password"><section className="module-page settings-form"><div className="module-header"><div><p className="dashboard-kicker"><KeyRound size={16} /> Account security</p><h1>Change Super Admin password</h1><p>An OTP will be sent to <strong>{user?.email}</strong> before the password changes.</p></div></div>{message.error && <p className="form-message error" role="alert">{message.error}</p>}{message.success && <p className="form-message success" role="status">{message.success}</p>}<section className="settings-section"><h2>Verify your email</h2>{!codeRequested ? <button className="module-action-button" onClick={requestCode} disabled={busy}><MailCheck size={16} />{busy ? 'Requesting…' : 'Send OTP code'}</button> : <form className="form-grid" onSubmit={confirm}><label>Six-digit OTP<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label><label>New password<input type="password" minLength="8" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Confirm new password<input type="password" minLength="8" required value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} /></label><div className="form-actions form-span-two"><button className="primary-button" disabled={busy}>{busy ? 'Changing…' : 'Change password'}</button></div></form>}</section></section></AdminLayout>;
}
