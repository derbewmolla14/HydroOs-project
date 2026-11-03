import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { AdminLayout } from '../layouts/AdminLayout';

const severityClass = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' };

export function AlertsPage() {
    const [data, setData] = useState({ items: [], total: 0, pages: 0 });
    const [filters, setFilters] = useState({ status: '', severity: '', page: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    async function load() {
        setLoading(true);
        try { const response = await api.get('/alerts', { params: filters }); setData(response.data); setError(''); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load alerts.'); } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [filters.status, filters.severity, filters.page]);
    async function update(alert, action) {
        try { await api.patch(`/alerts/${alert._id}/${action}`, action === 'snooze' ? { minutes: 60 } : {}); await load(); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to update alert.'); }
    }
    return <AdminLayout title="Smart alerts"><section className="module-page alerts-page">
        <div className="module-header"><div><p className="eyebrow">Operational intelligence</p><h1>Smart alerts</h1><p>Real alerts generated from authenticated telemetry and device health.</p></div><button className="secondary-button" onClick={load}><RefreshCw size={16} />Refresh</button></div>
        <div className="filter-bar"><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">All statuses</option><option>ACTIVE</option><option>ACKNOWLEDGED</option><option>SNOOZED</option><option>RESOLVED</option></select><select value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value, page: 1 })}><option value="">All severities</option><option>CRITICAL</option><option>WARNING</option><option>INFO</option></select></div>
        {error && <div className="form-message error">{error}</div>}
        {loading ? <div className="module-empty">Loading alerts…</div> : <div className="alert-list">{data.items.map((alert) => <article className="alert-card" key={alert._id}><div className={`alert-icon ${severityClass[alert.severity]}`}><AlertTriangle size={18} /></div><div className="alert-content"><div className="alert-title-row"><h3>{alert.title}</h3><span className={`status-pill ${severityClass[alert.severity]}`}>{alert.severity}</span><span className="status-pill">{alert.status}</span></div><p>{alert.description}</p><small>{alert.tankId?.name || 'No tank'}{alert.deviceId ? ` · ${alert.deviceId.identifier}` : ''} · {new Date(alert.createdAt).toLocaleString()}</small></div><div className="alert-actions">{alert.status === 'ACTIVE' && <><button onClick={() => update(alert, 'acknowledge')} title="Acknowledge"><Check size={16} /></button><button onClick={() => update(alert, 'snooze')} title="Snooze"><Clock size={16} /></button></>}{alert.status !== 'RESOLVED' && <button onClick={() => update(alert, 'resolve')} title="Resolve">Resolve</button>}</div></article>)}{!data.items.length && <div className="module-empty">No alerts match the selected filters.</div>}</div>}
        {data.pages > 1 && <div className="pagination"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {filters.page} of {data.pages}</span><button disabled={filters.page >= data.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next</button></div>}
    </section></AdminLayout>;
}
