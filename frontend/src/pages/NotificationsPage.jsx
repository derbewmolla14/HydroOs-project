import { useEffect, useState } from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { AdminLayout } from '../layouts/AdminLayout';

export function NotificationsPage() {
    const [data, setData] = useState({ items: [], unread: 0, page: 1, pages: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    async function load(page = data.page) {
        setLoading(true);
        try { const response = await api.get('/notifications', { params: { page, limit: 15 } }); setData(response.data); setError(''); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load notifications.'); } finally { setLoading(false); }
    }
    useEffect(() => { load(1); }, []);
    async function markRead(id) { await api.patch(`/notifications/${id}/read`); await load(); }
    async function markAllRead() { await api.patch('/notifications/read-all'); await load(); }
    return <AdminLayout title="Notifications"><section className="module-page notifications-page">
        <div className="module-header"><div><p className="eyebrow">Alert delivery</p><h1>Notifications</h1><p>{data.unread || 0} unread notification{data.unread === 1 ? '' : 's'}</p></div><div className="module-header-actions"><button className="secondary-button" onClick={() => load()}><RefreshCw size={16} />Refresh</button><button className="module-action-button" onClick={markAllRead} disabled={!data.unread}><CheckCheck size={16} />Mark all read</button></div></div>
        {error && <div className="form-message error">{error}</div>}
        {loading ? <div className="module-empty">Loading notifications…</div> : <div className="notification-list">{data.items.map((notification) => <article className={`notification-card${notification.readAt ? '' : ' unread'}`} key={notification._id}><div className="alert-icon info"><Bell size={17} /></div><div className="alert-content"><h3>{notification.title}</h3><p>{notification.message}</p><small>{new Date(notification.createdAt).toLocaleString()}</small></div>{!notification.readAt && <button className="secondary-button" onClick={() => markRead(notification._id)}>Mark read</button>}</article>)}{!data.items.length && <div className="module-empty">No notifications yet.</div>}</div>}
        {data.pages > 1 && <div className="pagination"><button disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Previous</button><span>Page {data.page} of {data.pages}</span><button disabled={data.page >= data.pages} onClick={() => load(data.page + 1)}>Next</button></div>}
    </section></AdminLayout>;
}
