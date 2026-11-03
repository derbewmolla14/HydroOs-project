import { useEffect, useMemo, useState } from 'react';
import { Check, Link2, Pencil, Plus, Search, ShieldCheck, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { AdminLayout } from '../layouts/AdminLayout';

const initialForm = { firstname: '', lastname: '', username: '', email: '', phone: '', role: 'OPERATOR', organizationId: '' };
const roles = ['ORGANIZATION_ADMIN', 'SUB_ADMIN', 'OPERATOR'];

export function UserManagementPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [tanks, setTanks] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [form, setForm] = useState(null);
    const [assignmentIds, setAssignmentIds] = useState([]);
    const [message, setMessage] = useState({ error: '', success: '', token: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const requests = [api.get('/users', { params: { search } }), api.get('/tanks', { params: { limit: 100 } })];
            if (user?.role === 'SUPER_ADMIN') requests.push(api.get('/dashboard/overview'));
            const [userResponse, tankResponse, overviewResponse] = await Promise.all(requests);
            setUsers(userResponse.data.users); setTanks(tankResponse.data.tanks); setOrganizations(overviewResponse?.data.organizations || []);
        } catch (error) { setMessage({ error: error.response?.data?.message || 'User records could not be loaded.', success: '', token: '' }); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [search, user?.role]);

    const selected = useMemo(() => users.find((item) => item.id === selectedId), [users, selectedId]);
    function openCreate() { setForm({ ...initialForm, organizationId: user?.role === 'SUPER_ADMIN' ? '' : user?.organizationId || '' }); setMessage({ error: '', success: '', token: '' }); }
    function openEdit(item) { setForm({ ...initialForm, ...item, organizationId: item.organizationId || '' }); setMessage({ error: '', success: '', token: '' }); }
    function select(item) { setSelectedId(item.id); setAssignmentIds(item.assignedTanks.map((tank) => tank._id)); }
    function updateForm(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
    async function saveUser(event) {
        event.preventDefault(); setSaving(true); setMessage({ error: '', success: '', token: '' });
        try {
            if (form.id) await api.patch(`/users/${form.id}`, form);
            else {
                const { data } = await api.post('/users', form);
                setMessage({ error: '', success: 'Invitation created. The user must set their password through the secure invitation flow.', token: data.invitation?.token || '' });
            }
            setForm(null); await load();
        } catch (error) { setMessage({ error: error.response?.data?.message || 'User could not be saved.', success: '', token: '' }); }
        finally { setSaving(false); }
    }
    async function saveAssignments() {
        if (!selected) return;
        setSaving(true); setMessage({ error: '', success: '', token: '' });
        try { await api.patch(`/users/${selected.id}/assignments`, { tankIds: assignmentIds }); setMessage({ error: '', success: 'Tank access updated.', token: '' }); await load(); }
        catch (error) { setMessage({ error: error.response?.data?.message || 'Assignments could not be updated.', success: '', token: '' }); }
        finally { setSaving(false); }
    }
    function toggleTank(id) { setAssignmentIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

    return <AdminLayout title="Users"><section className="module-page user-management-page">
        <div className="module-header"><div><p className="dashboard-kicker"><ShieldCheck size={16} /> Owner-controlled access</p><h1>User and access management</h1><p>Create accounts, assign tanks, and revoke access without editing the database.</p></div><div className="module-header-actions"><Link className="secondary-button" to="/tanks"><Plus size={16} /> Create water tank</Link><button className="module-action-button" onClick={openCreate}><UserPlus size={16} /> Create new user</button></div></div>
        {message.error && <p className="form-message error">{message.error}</p>}{message.success && <p className="form-message success">{message.success}{message.token && <code className="invitation-token">{message.token}</code>}</p>}
        <label className="user-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username, full name, email or user ID" /></label>
        {loading ? <div className="module-empty">Loading authorized users…</div> : <div className="user-management-grid"><div className="user-table-wrap"><table className="user-management-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Assigned tanks</th><th>Actions</th></tr></thead><tbody>{users.map((item) => <tr key={item.id} className={selectedId === item.id ? 'selected' : ''}><td><button className="user-row-button" onClick={() => select(item)}><strong>{[item.firstname, item.lastname].filter(Boolean).join(' ') || item.username || 'Unnamed user'}</strong><small>{item.email}<br />ID: {item.id}</small></button></td><td>{item.role}</td><td><span className={`status-pill ${item.status}`}>{item.status}</span></td><td>{item.assignedTanks.length ? item.assignedTanks.map((tank) => tank.code).join(', ') : 'None'}</td><td><button className="table-action-link" onClick={() => openEdit(item)}><Pencil size={15} /> Edit</button></td></tr>)}</tbody></table>{!users.length && <div className="module-empty">No users match this search.</div>}</div><aside className="assignment-panel"><div className="panel-heading"><div><p className="dashboard-kicker">Tank access</p><h2>{selected ? `${selected.firstname || selected.username || selected.email}'s tanks` : 'Select a user'}</h2></div>{selected && <Link2 size={20} />}</div>{selected ? <><p className="helper-text">Only selected tanks will be visible to this user after their next request.</p><div className="assignment-list">{tanks.filter((tank) => !selected.organizationId ||         String(tank.organizationId) === String(selected.organizationId)).map((tank) => <label key={tank._id} className="assignment-item"><input type="checkbox" checked={assignmentIds.includes(tank._id)} onChange={() => toggleTank(tank._id)} /><span><strong>{tank.name}</strong><small>{tank.code} · {tank.capacity.toLocaleString()} L</small></span>{assignmentIds.includes(tank._id) && <Check size={16} />}</label>)}</div><button className="primary-button" disabled={saving} onClick={saveAssignments}>Save tank access</button></> : <div className="module-empty">Choose a user to view and edit assigned tanks.</div>}</aside></div>}
        {form && <div className="modal-backdrop" role="presentation"><div className="tank-modal user-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="dashboard-kicker">Secure account setup</p><h2>{form.id ? 'Edit user' : 'Create new user'}</h2></div><button onClick={() => setForm(null)} aria-label="Close"><X size={18} /></button></div><form className="form-grid" onSubmit={saveUser}><label>First name<input name="firstname" required value={form.firstname} onChange={updateForm} /></label><label>Last name<input name="lastname" value={form.lastname} onChange={updateForm} /></label><label>Username<input name="username" value={form.username} onChange={updateForm} /></label><label>Email<input type="email" required name="email" value={form.email} onChange={updateForm} disabled={Boolean(form.id)} /></label><label>Phone<input name="phone" value={form.phone} onChange={updateForm} /></label><label>Role<select name="role" value={form.role} onChange={updateForm}>{roles.filter((role) => user?.role === 'SUPER_ADMIN' || role !== 'ORGANIZATION_ADMIN').map((role) => <option key={role}>{role}</option>)}</select></label>{user?.role === 'SUPER_ADMIN' && !form.id && <label className="form-span-two">Organization<select name="organizationId" required value={form.organizationId} onChange={updateForm}><option value="">Select organization</option>{organizations.map((organization) => <option key={organization._id} value={organization._id}>{organization.name} ({organization.code})</option>)}</select></label>}<div className="form-actions form-span-two"><button type="button" className="secondary-button" onClick={() => setForm(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Create invitation'}</button></div></form></div></div>}
    </section></AdminLayout>;
}
