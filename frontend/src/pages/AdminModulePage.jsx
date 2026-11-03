import { useLocation } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { AdminLayout } from '../layouts/AdminLayout';
import { EmptyState } from '../components/dashboard/DashboardComponents';

const labels = { '/organizations': 'Organizations', '/users': 'Users', '/tanks': 'Water Tanks', '/irrigation': 'Irrigation Control', '/soil-moisture': 'Soil Moisture', '/water-sources': 'Water Sources', '/devices': 'Devices', '/schedule': 'Schedule', '/reports': 'Reports', '/audit-logs': 'Audit Logs', '/settings': 'Settings' };

export function AdminModulePage() {
    const { pathname } = useLocation(); const title = labels[pathname] || 'HydroOS';
    return <AdminLayout title={title}><section className="module-page"><div className="module-header"><div><p className="dashboard-kicker">HydroOS workspace</p><h1>{title}</h1><p>Manage this area using verified HydroOS data and permissions.</p></div></div><div className="module-empty"><EmptyState icon={<Settings2 size={26} />} title="Module connection in progress" description="This area is ready for its backend data contract. No placeholder records are shown." /></div></section></AdminLayout>;
}
