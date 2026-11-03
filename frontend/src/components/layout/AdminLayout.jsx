import { useEffect, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, LogOut, Menu, Settings, ShieldCheck, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api';
import { io } from 'socket.io-client';

const navigation = [
    ['Dashboard', '/dashboard', '⌂'],
    ['Organizations', '/organizations', '◈', ['SUPER_ADMIN']],
    ['Users', '/users', '♙', ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN']],
    ['Water Tanks', '/tanks', '◉'],
    ['Irrigation Control', '/irrigation', '≈'],
    ['Soil Moisture', '/soil-moisture', '⌁'],
    ['Water Sources', '/water-sources', '◌'],
    ['Devices', '/devices', '▣'],
    ['Smart Alerts', '/alerts', '⚠'],
    ['Notifications', '/notifications', '♢'],
    ['Alert Settings', '/alert-settings', '⚙', ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'SUB_ADMIN']],
    ['Schedule', '/schedule', '◷'],
    ['Reports', '/reports', '▤'],
    ['Audit Logs', '/audit-logs', '▥'],
    ['Settings', '/settings', <Settings size={17} />]
];

const roleLabels = { SUPER_ADMIN: 'Super Admin', ORGANIZATION_ADMIN: 'Organization Admin', SUB_ADMIN: 'Sub-Admin', OPERATOR: 'Operator' };

export function AdminLayout({ children, title = 'Dashboard' }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const allowedNavigation = navigation.filter(([, , , roles]) => !roles || roles.includes(user?.role));
    useEffect(() => {
        api.get('/notifications').then(({ data }) => setUnread(data.unread)).catch(() => {});
        const socket = io('/', { withCredentials: true, transports: ['websocket', 'polling'] });
        const onNotification = () => setUnread((value) => value + 1);
        socket.on('notification:new', onNotification);
        return () => { socket.off('notification:new', onNotification); socket.disconnect(); };
    }, []);
    const organizationName = user?.organizationId ? 'Your organization' : 'Platform overview';
    async function signOut() { await logout(); navigate('/login', { replace: true }); }
    return <div className={`admin-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
        <aside className={`admin-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
            <div className="sidebar-brand"><span className="sidebar-logo">H</span>{!collapsed && <span>Hydro<span>OS</span></span>}<button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
            <div className="sidebar-section-label">{!collapsed && 'WORKSPACE'}</div>
            <nav className="admin-nav">{allowedNavigation.map(([label, path, icon]) => <NavLink key={path} to={path} end={path === '/dashboard'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} title={collapsed ? label : undefined}><span className="nav-glyph">{icon}</span>{!collapsed && <span>{label}</span>}</NavLink>)}</nav>
            <div className="sidebar-footer">{!collapsed && <div className="sidebar-help"><ShieldCheck size={17} /><span>Secure workspace<br /><small>Protected by HydroOS</small></span></div>}<button className="sidebar-logout" onClick={signOut}><LogOut size={17} />{!collapsed && 'Sign out'}</button></div>
        </aside>
        {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
        <div className="admin-content">
            <header className="admin-topbar"><button className="sidebar-toggle" onClick={() => window.innerWidth < 800 ? setMobileOpen(true) : setCollapsed((value) => !value)} aria-label="Toggle sidebar">{window.innerWidth < 800 ? <Menu size={21} /> : collapsed ? <ChevronRight size={21} /> : <ChevronLeft size={21} />}</button><div className="topbar-title"><span>{title}</span><small>{organizationName}</small></div><div className="topbar-actions"><NavLink className="topbar-icon" to="/notifications" aria-label="Notifications"><Bell size={19} />{unread > 0 && <i>{unread > 99 ? '99+' : unread}</i>}</NavLink>{user?.role === 'SUPER_ADMIN' && <NavLink className="topbar-icon" to="/change-password" aria-label="Change password"><Settings size={18} /></NavLink>}<div className="profile-menu"><span className="profile-avatar">{(user?.firstname || user?.email || 'H').charAt(0).toUpperCase()}</span><div className="profile-copy"><strong>{user?.firstname || user?.email?.split('@')[0]}</strong><small>{roleLabels[user?.role] || user?.role}</small></div><button className="profile-button" onClick={signOut} aria-label="Sign out"><LogOut size={16} /></button></div></div></header>
            <main className="admin-main">{children}</main>
        </div>
    </div>;
}
