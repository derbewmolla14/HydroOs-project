import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity, AlertCircle, Battery, Cpu, Droplets, Gauge, Plus, Radio, RefreshCw, Thermometer, UserPlus, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { AdminLayout } from '../layouts/AdminLayout';
import { StatCard, icons } from '../components/dashboard/DashboardComponents';

function MetricChart({ points, field, color = '#2c9b82', label }) {
    const values = points.map((point) => point[field]).filter((value) => value !== null && value !== undefined);
    if (!values.length) return <div className="telemetry-empty">No stored {label.toLowerCase()} readings in this range.</div>;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const width = 560;
    const height = 150;
    const path = values.map((value, index) => {
        const x = values.length === 1 ? width / 2 : index / (values.length - 1) * width;
        const y = height - ((value - min) / Math.max(max - min, 1)) * (height - 20) - 10;
        return `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return <div className="telemetry-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} trend`}><path d={`M 0 ${height - 10} H ${width}`} className="chart-axis" /><path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="chart-range"><span>{label}</span><strong>{values[values.length - 1]}</strong></div></div>;
}

function dateInputValue(date) {
    return new Date(date).toISOString().slice(0, 10);
}

export function DashboardPage() {
    const { user } = useAuth();
    const [overview, setOverview] = useState(null);
    const [history, setHistory] = useState({ points: [], loading: true, error: '' });
    const [filters, setFilters] = useState({ tankId: '', granularity: 'hour', from: dateInputValue(Date.now() - 24 * 60 * 60 * 1000), to: dateInputValue(Date.now()) });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function loadOverview() {
        try { const { data } = await api.get('/monitoring/overview'); setOverview(data); setError(''); }
        catch (requestError) { setError(requestError.response?.data?.message || 'Monitoring data could not be loaded.'); }
        finally { setLoading(false); }
    }
    async function loadHistory() {
        setHistory((current) => ({ ...current, loading: true, error: '' }));
        try { const { data } = await api.get('/monitoring/history', { params: filters }); setHistory({ points: data.points, loading: false, error: '' }); }
        catch (requestError) { setHistory({ points: [], loading: false, error: requestError.response?.data?.message || 'Historical telemetry could not be loaded.' }); }
    }
    useEffect(() => { loadOverview(); const socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] }); const refresh = () => { loadOverview(); loadHistory(); }; socket.on('telemetry:reading', refresh); socket.on('tank:water-level', refresh); socket.on('device:heartbeat', refresh); return () => { socket.off('telemetry:reading', refresh); socket.off('tank:water-level', refresh); socket.off('device:heartbeat', refresh); socket.disconnect(); }; }, []);
    useEffect(() => { loadHistory(); }, [filters.tankId, filters.granularity, filters.from, filters.to]);
    const summary = overview?.summary || {};
    const points = history.points;
    const quality = overview?.latestReadings?.find((reading) => reading.ph !== null || reading.turbidity !== null || reading.electricalConductivity !== null);
    return <AdminLayout title="Dashboard"><section className="dashboard-page monitoring-page">
        {user?.role === 'SUPER_ADMIN' && <section className="owner-actions" aria-label="Owner controls"><div><strong>Owner controls</strong><span>Manage accounts and tank access from one place.</span></div><div><Link className="secondary-button" to="/users"><UserPlus size={16} /> Create new user</Link><Link className="secondary-button" to="/tanks"><Plus size={16} /> Create water tank</Link><Link className="owner-control-link" to="/users">Manage users</Link><Link className="owner-control-link" to="/tanks">Manage all tanks</Link></div></section>}
        <div className="dashboard-welcome"><div><p className="dashboard-kicker"><Activity size={16} /> HydroOS live telemetry</p><h1>Water monitoring command center</h1><p>Live measurements from authenticated devices and registered tanks.</p></div><div className="welcome-orbit"><Droplets size={46} /></div></div>
        {loading && <div className="dashboard-loading">Loading verified telemetry…</div>}{error && <div className="dashboard-error"><AlertCircle size={18} />{error}</div>}
        <div className="dashboard-scope-note"><Radio size={15} /> Live updates are delivered through organization-scoped Socket.IO events.</div>
        <div className="stats-grid"><StatCard label="Monitored tanks" value={summary.monitoredTanks ?? '—'} detail={`${summary.tanks ?? 0} total tanks`} icon={icons.tanks} /><StatCard label="Connected devices" value={summary.connectedDevices ?? '—'} detail={`${summary.offlineDevices ?? 0} offline`} icon={icons.devices} tone="cyan" /><StatCard label="Average water level" value={summary.averageWaterLevel == null ? '—' : `${summary.averageWaterLevel}%`} detail="Current stored measurements" icon={icons.level} tone="blue" /><StatCard label="Water availability" value={summary.waterAvailabilityLiters == null ? '—' : `${Math.round(summary.waterAvailabilityLiters).toLocaleString()} L`} detail="Across monitored tanks" icon={icons.usage} tone="green" /><StatCard label="24h flow volume" value={summary.waterConsumptionLiters == null ? '—' : `${Math.round(summary.waterConsumptionLiters).toLocaleString()} L`} detail="Calculated from stored flow" icon={<Waves size={20} />} tone="purple" /><StatCard label="Last communication" value={summary.lastReadingAt ? new Date(summary.lastReadingAt).toLocaleTimeString() : '—'} detail={summary.lastReadingAt ? new Date(summary.lastReadingAt).toLocaleDateString() : 'No readings'} icon={<RefreshCw size={20} />} tone="amber" /></div>
        <div className="monitoring-toolbar"><label>Tank<select value={filters.tankId} onChange={(event) => setFilters((current) => ({ ...current, tankId: event.target.value }))}><option value="">All assigned tanks</option>{(overview?.tanks || []).map((tank) => <option key={tank._id} value={tank._id}>{tank.name} ({tank.code})</option>)}</select></label><label>From<input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} /></label><label>To<input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} /></label><label>Grouping<select value={filters.granularity} onChange={(event) => setFilters((current) => ({ ...current, granularity: event.target.value }))}><option value="hour">Hourly</option><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></label></div>
        {history.error && <div className="dashboard-error"><AlertCircle size={18} />{history.error}</div>}{history.loading ? <div className="module-empty">Loading historical telemetry…</div> : <div className="monitoring-chart-grid"><article className="chart-card"><div className="chart-heading"><div><h3>Water level trend</h3><p>Actual stored sensor measurements</p></div><Gauge size={20} /></div><MetricChart points={points} field="waterLevel" label="Water level" /></article><article className="chart-card"><div className="chart-heading"><div><h3>Flow and consumption</h3><p>Flow rate and calculated usage</p></div><Waves size={20} /></div><MetricChart points={points} field="flowRate" color="#487fc2" label="Flow rate" /></article><article className="chart-card"><div className="chart-heading"><div><h3>Temperature</h3><p>Stored water temperature</p></div><Thermometer size={20} /></div><MetricChart points={points} field="temperature" color="#d58b4f" label="Temperature" /></article><article className="chart-card"><div className="chart-heading"><div><h3>Water quality</h3><p>pH, turbidity and conductivity</p></div><Droplets size={20} /></div><div className="quality-metrics"><span><strong>{quality?.ph ?? '—'}</strong>pH</span><span><strong>{quality?.turbidity ?? '—'}</strong>Turbidity</span><span><strong>{quality?.electricalConductivity ?? '—'}</strong>µS/cm</span></div><MetricChart points={points} field="ph" color="#9b67bf" label="pH" /></article></div>}
        <div className="monitoring-lower-grid"><article className="chart-card"><div className="chart-heading"><div><h3>Device connection status</h3><p>Online only after a recent heartbeat</p></div><Cpu size={20} /></div><div className="monitoring-device-list">{(overview?.devices || []).map((device) => <div className="monitoring-device" key={device._id}><span className={`connection-dot ${device.connectionStatus}`} /><div><strong>{device.name}</strong><small>{device.tankId?.name || 'Unassigned'} · {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never communicated'}</small></div><Battery size={16} /></div>)}</div>{!overview?.devices?.length && <div className="telemetry-empty">No devices in the authorized monitoring scope.</div>}</article><article className="chart-card"><div className="chart-heading"><div><h3>Latest sensor readings</h3><p>Newest authenticated measurements</p></div><Activity size={20} /></div><div className="monitoring-reading-list">{(overview?.latestReadings || []).slice(0, 8).map((reading) => <div className="monitoring-device" key={reading._id}><div><strong>{reading.waterVolume ?? reading.waterLevel ?? '—'} L</strong><small>{reading.flowRate == null ? 'No flow' : `${reading.flowRate} L/min`} · {new Date(reading.measuredAt).toLocaleString()}</small></div><span>{reading.batteryLevel == null ? '—' : `${reading.batteryLevel}%`}</span></div>)}</div></article></div>
    </section></AdminLayout>;
}
