import { Activity, AlertTriangle, CheckCircle2, Droplets, Gauge, MapPin, Radio, Server, Users, Waves } from 'lucide-react';

export function StatCard({ label, value, detail, icon, tone = 'green' }) {
    return <article className={`dashboard-stat stat-${tone}`}><div className="stat-icon">{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

export function ChartCard({ title, subtitle, children, className = '' }) {
    return <article className={`chart-card ${className}`}><div className="chart-heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><button className="card-menu" aria-label={`${title} options`}>•••</button></div>{children}</article>;
}

export function EmptyState({ icon = <Activity size={25} />, title, description }) {
    return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{description}</p></div>;
}

export function TankStatusCard({ tanks }) {
    return <ChartCard title="Tank status overview" subtitle="Current inventory by operational status"><div className="tank-summary"><div className="tank-donut"><strong>{tanks.length}</strong><small>tanks</small></div><div className="status-legend"><p><i className="dot green" />Active <strong>{tanks.filter((tank) => tank.status === 'active').length}</strong></p><p><i className="dot amber" />Suspended <strong>{tanks.filter((tank) => tank.status === 'suspended').length}</strong></p><p><i className="dot gray" />Deactivated <strong>{tanks.filter((tank) => tank.status === 'deactivated').length}</strong></p></div></div></ChartCard>;
}

export function RecentActivity({ activities }) {
    return <ChartCard title="Recent activity" subtitle="Latest verified audit events">{activities.length ? <div className="activity-list">{activities.map((activity) => <div className="activity-row" key={activity._id}><span className="activity-icon"><CheckCircle2 size={15} /></span><div><strong>{activity.action.replaceAll('_', ' ')}</strong><small>{new Date(activity.createdAt).toLocaleString()}</small></div></div>)}</div> : <EmptyState icon={<Activity size={22} />} title="No activity recorded" description="Verified audit events will appear here." />}</ChartCard>;
}

export function CapabilityCard({ title, description, icon }) {
    return <ChartCard title={title} subtitle="Not configured in this environment"><EmptyState icon={icon} title="Not configured yet" description={description} /></ChartCard>;
}

export const icons = { tanks: <Droplets size={20} />, users: <Users size={20} />, devices: <Radio size={20} />, alerts: <AlertTriangle size={20} />, level: <Gauge size={20} />, usage: <Waves size={20} />, map: <MapPin size={22} />, server: <Server size={22} /> };
