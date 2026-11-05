import { useEffect, useState } from 'react';
import { FileText, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { AdminLayout } from '../layouts/AdminLayout';

function dateValue(offsetDays = 0) {
    return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

export function ReportsPage() {
    const [tanks, setTanks] = useState([]);
    const [filters, setFilters] = useState({ tankId: '', from: dateValue(-30), to: dateValue(), readingStatus: '' });
    const [report, setReport] = useState({ readings: [], tank: null, loading: false, error: '' });

    useEffect(() => {
        api.get('/tanks', { params: { limit: 100 } }).then(({ data }) => setTanks(data.tanks)).catch(() => setTanks([]));
    }, []);

    async function loadHistory(event) {
        event?.preventDefault();
        if (!filters.tankId) return setReport({ readings: [], tank: null, loading: false, error: 'Select a tank first.' });
        setReport((current) => ({ ...current, loading: true, error: '' }));
        try {
            const { data } = await api.get('/exports/tank-history', { params: filters });
            setReport({ readings: data.readings, tank: data.tank, loading: false, error: '' });
        } catch (error) {
            setReport({ readings: [], tank: null, loading: false, error: error.response?.data?.message || 'Tank history could not be loaded.' });
        }
    }

    async function download(format) {
        if (!filters.tankId) return setReport((current) => ({ ...current, error: 'Select a tank first.' }));
        try {
            const response = await api.get('/exports/tank-history', { params: { ...filters, format }, responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${report.tank?.code || 'tank'}-history.${format}`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            setReport((current) => ({ ...current, error: error.response?.data?.message || 'The report could not be downloaded.' }));
        }
    }

    return <AdminLayout title="Reports"><section className="module-page">
        <div className="module-header"><div><p className="dashboard-kicker">HydroOS reporting</p><h1>Tank history export</h1><p>Review authorized tank readings and download a professional report.</p></div></div>
        <form className="monitoring-toolbar" onSubmit={loadHistory}><label>Tank<select required value={filters.tankId} onChange={(event) => setFilters({ ...filters, tankId: event.target.value })}><option value="">Select a tank</option>{tanks.map((tank) => <option key={tank._id} value={tank._id}>{tank.name} ({tank.code})</option>)}</select></label><label>Start date<input type="date" required value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>End date<input type="date" required value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><label>Reading status<select value={filters.readingStatus} onChange={(event) => setFilters({ ...filters, readingStatus: event.target.value })}><option value="">All readings</option><option value="normal">Normal</option><option value="critical">Critical</option><option value="unavailable">Unavailable level</option></select></label><button className="module-action-button" disabled={report.loading}>{report.loading ? <RefreshCw size={16} /> : 'View history'}</button></form>
        {report.error && <p className="form-message error" role="alert">{report.error}</p>}
        {report.tank && <section className="settings-section"><div className="module-header"><div><h2>{report.tank.name}</h2><p>{report.tank.code} · {report.tank.capacity.toLocaleString()} L · {report.readings.length} readings</p></div><div className="table-actions"><button title="Download Excel" onClick={() => download('xlsx')}><FileSpreadsheet size={18} /></button><button title="Download Word" onClick={() => download('docx')}><FileText size={18} /></button></div></div><div className="tank-table-wrap"><table className="tank-management-table"><thead><tr><th>Date and time</th><th>Water level</th><th>Water volume</th><th>Water %</th><th>Quality</th><th>Device</th><th>Status</th></tr></thead><tbody>{report.readings.map((reading, index) => <tr key={`${reading.date}-${index}`}><td>{new Date(reading.date).toLocaleString()}</td><td>{reading.waterLevel ?? '—'}</td><td>{reading.waterVolume ?? '—'} L</td><td>{reading.waterPercentage ?? '—'}%</td><td>{Object.entries(reading.waterQuality || {}).map(([key, value]) => `${key}: ${value}`).join(', ') || '—'}</td><td>{reading.deviceStatus}</td><td><span className={`status-pill ${reading.readingStatus === 'critical' ? 'suspended' : 'active'}`}>{reading.readingStatus}</span></td></tr>)}</tbody></table>{!report.readings.length && <div className="module-empty">No readings match the selected filters.</div>}</div></section>}
    </section></AdminLayout>;
}
