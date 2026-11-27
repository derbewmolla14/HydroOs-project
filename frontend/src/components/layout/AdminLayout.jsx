import { useEffect, useState } from "react";
import {
  Activity, Bell, Building2, ChevronDown, ChevronLeft, ChevronRight, Cpu,
  Droplets, FlaskConical, Gauge, History, Leaf, Link2, LogOut, Menu, Radio,
  Settings, ShieldAlert, ShieldCheck, Users, Waves, X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api";
import { io } from "socket.io-client";

const accessRoles = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"];
const navigation = [
  { section: "OVERVIEW", label: "Dashboard", path: "/dashboard", icon: Gauge, children: [
    ["System Overview", "/dashboard"], ["Analytics & Metrics", "/dashboard/analytics"],
  ] },
  { section: "ADMINISTRATION", label: "Organizations", path: "/organizations", icon: Building2, roles: ["SUPER_ADMIN"], children: [
    ["View Organizations", "/organizations"], ["Add New Organization", "/organizations/new"], ["Organization Settings", "/organizations/settings"],
  ] },
  { section: "ADMINISTRATION", label: "Users & Management", path: "/users", icon: Users, roles: accessRoles, children: [
    ["View & Manage Users", "/users"], ["Create New Admin", "/users/create-admin"], ["User Roles & Permissions", "/users/roles"],
  ] },
  { section: "ADMINISTRATION", label: "Service Activation", path: "/services", icon: Link2, roles: ["SUPER_ADMIN"] },
  { section: "WATER OPERATIONS", label: "Water Tanks", path: "/tanks", icon: Droplets, roles: accessRoles, serviceType: "water_tank", children: [
    ["Live Tank Levels", "/tanks/level"], ["Add New Tanker", "/tanks/new"], ["Tank History & Logs", "/tanks/history"], ["Tank Hardware Status", "/tanks/hardware"],
  ] },
  { section: "WATER OPERATIONS", label: "Irrigation Control", path: "/irrigation", icon: Waves, roles: accessRoles, serviceType: "irrigation", children: [
    ["Valve Controls", "/irrigation/valves"], ["Irrigation History", "/irrigation/history"], ["Schedules & Automation", "/irrigation/schedules"],
  ] },
  { section: "WATER OPERATIONS", label: "Soil Moisture", path: "/soil-moisture", icon: Leaf, roles: accessRoles, serviceType: "soil_moisture", children: [
    ["Current Sensor Readings", "/soil-moisture/sensors"], ["Moisture History Logs", "/soil-moisture/history"], ["Threshold Configuration", "/soil-moisture/thresholds"],
  ] },
  { section: "WATER OPERATIONS", label: "Water Sources", path: "/water-sources", icon: Radio, roles: accessRoles, serviceType: "water_source", children: [
    ["Source Intake Status", "/water-sources/intake"], ["Flow Rate Monitoring", "/water-sources/flow"], ["Source History", "/water-sources/history"],
  ] },
  { section: "WATER OPERATIONS", label: "Water Quality", path: "/water-quality", icon: FlaskConical, roles: accessRoles, serviceType: "water_quality", children: [
    ["Live Parameters (pH, TDS, Turbidity)", "/water-quality"], ["Quality History Logs", "/water-quality/history"], ["Sensor Calibration", "/water-quality/calibration"],
  ] },

  { section: "FIELD OPERATIONS", label: "Field Assessment", path: "/field-assessment", icon: ClipboardCheck, roles: accessRoles, children: [
    ["New Field Assessment Form", "/field-assessment"], ["Submitted Assessments & Map", "/field-assessment/submitted"],
  ] },
  { section: "DEVICE & ALERTS", label: "Devices", path: "/devices", icon: Cpu, roles: accessRoles, children: [
    ["Connected Hardware List", "/devices"], ["Register New Device", "/devices/register"], ["Device Diagnostics", "/devices/diagnostics"],
  ] },
  { section: "DEVICE & ALERTS", label: "Smart Alerts", path: "/alerts", icon: ShieldAlert, roles: accessRoles, children: [
    ["Active Alerts", "/alerts"], ["Alert History", "/alerts/history"],
  ] },
  { section: "DEVICE & ALERTS", label: "Alert Settings", path: "/alert-settings", icon: Settings, roles: accessRoles },
  { section: "DEVICE & ALERTS", label: "Notifications", path: "/notifications", icon: Bell, roles: accessRoles, children: [
    ["System Broadcasts", "/notifications/broadcasts"], ["User Notifications", "/notifications"], ["Notification Settings", "/notifications/settings"],
  ] },
  { section: "SYSTEM", label: "Reports", path: "/reports", icon: History, roles: accessRoles },
  { section: "SYSTEM", label: "Audit Logs", path: "/audit-logs", icon: Activity, roles: ["SUPER_ADMIN", "ORGANIZATION_ADMIN"] },
  { section: "SYSTEM", label: "Settings", path: "/settings", icon: Settings, roles: accessRoles },
  { section: "MY ACCOUNT", label: "My Services", path: "/services", icon: Link2, roles: ["OPERATOR"] },
];

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  ORGANIZATION_ADMIN: "Organization Admin",
  SUB_ADMIN: "Sub-Admin",
  OPERATOR: "Operator",
};

export function AdminLayout({ children, title = "Dashboard" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [expanded, setExpanded] = useState({});
  const systemRole = user?.systemRole || user?.role;
  const dashboardPath = systemRole === "OPERATOR" || systemRole === "user" ? "/home" : "/dashboard";
  const subscriptionCurrent = user?.subscriptionStatus === "active"
    && user?.monthlyFeePaid === true
    && user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date();
  const allowedNavigation = navigation
    .filter((item) => {
      if (systemRole === "OPERATOR") {
        if (item.label === "Dashboard" || item.label === "My Services") return true;
        if (!item.serviceType || !subscriptionCurrent) return false;
        const allowedServices = user?.allowedServices || [];
        return allowedServices.includes(item.serviceType);
      }
      return !item.roles || item.roles.includes(systemRole);
    })
    .map((item) => item.label === "Dashboard" ? {
      ...item,
      path: dashboardPath,
      children: systemRole === "OPERATOR"
        ? [["System Overview", dashboardPath]]
        : item.children.map(([label, path]) => [label, path === "/dashboard" ? dashboardPath : path]),
    } : systemRole === "OPERATOR" && item.serviceType
      ? { ...item, children: item.children.filter(([label]) => label !== "+ Add Water Tank" && label !== "Add New Tanker") }
      : item);
  const activePath = location.pathname;
  const activeGroups = new Set(allowedNavigation
    .filter((item) => item.children?.some(([, path]) => activePath === path || (path !== item.path && activePath.startsWith(path + "/"))))
    .map((item) => item.path));

  useEffect(() => {
    api.get("/notifications").then(({ data }) => setUnread(data.unread)).catch(() => {});
    const socket = io("/", { withCredentials: true, transports: ["websocket", "polling"] });
    const onNotification = () => setUnread((value) => value + 1);
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
      socket.disconnect();
    };
  }, []);

  const organizationName = user?.organizationId ? "Your organization" : "Platform overview";
  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={`admin-shell min-h-screen bg-[#f2f9f7]${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-20 flex w-[246px] flex-col bg-[#073a37] text-[#d3ebe5] transition-transform duration-200${mobileOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-brand flex h-[76px] items-center gap-2.5 px-[22px] text-[1.28rem] font-extrabold tracking-[-.05em]">
          <span className="sidebar-logo grid h-[33px] w-[33px] place-items-center rounded-[10px] bg-[#7ce0be] text-[1.18rem] text-[#063d37]">H</span>
          {!collapsed && <span>Hydro<span className="text-[#6de2c0]">OS</span></span>}
          <button className="mobile-close ml-auto border-0 bg-transparent text-[#c3e6dc]" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20}/></button>
        </div>
        <div className="sidebar-section-label px-[23px] pb-2.5 pt-[19px] text-[.64rem] tracking-[.14em] text-[#74ada0]">{!collapsed && "WORKSPACE"}</div>
        <nav className="admin-nav grid flex-1 content-start gap-1 overflow-y-auto px-[11px] pb-3" aria-label="Admin navigation">
          {(() => {
            let previousSection = "";
            return allowedNavigation.map((item) => {
              const sectionHeading = item.section !== previousSection;
              previousSection = item.section;
              const Icon = item.icon;
              const activeChild = item.children?.some(([, path]) => activePath === path || (path !== item.path && activePath.startsWith(path + "/")));
              const isExpanded = Boolean(expanded[item.path] || activeGroups.has(item.path));
              return (
                <div key={item.path}>
                  {sectionHeading && !collapsed && <p className="px-3 pb-1 pt-4 text-[.59rem] font-bold tracking-[.16em] text-[#6fa397]">{item.section}</p>}
                  <div className={`flex items-center rounded-xl transition-colors ${activeChild || activePath === item.path ? "bg-white/10" : "hover:bg-white/[.06]"}`}>
                    <NavLink to={item.path} end={item.path === dashboardPath}
                      onClick={() => { setMobileOpen(false); if (item.children) setExpanded((current) => ({ ...current, [item.path]: true })); }}
                      className={({ isActive }) => `flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-[10px] text-[.76rem] font-semibold transition-colors ${isActive || activeChild ? "text-[#9af0cf]" : "text-[#b2d1c8]"}`}
                      title={collapsed ? item.label : undefined}>
                      <Icon size={17} strokeWidth={1.9} className="shrink-0"/>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                    {item.children && !collapsed && <button type="button" aria-label={`Toggle ${item.label} submenu`} aria-expanded={isExpanded}
                      onClick={() => setExpanded((current) => ({ ...current, [item.path]: !current[item.path] }))}
                      className="mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#9bc7bb] hover:bg-white/10 hover:text-white">
                      {isExpanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                    </button>}
                  </div>
                  {item.children && !collapsed && isExpanded && <div className="ml-[22px] mb-2 mt-1 grid gap-1 border-l border-[#47766c] pl-3">
                    {item.children.map(([childLabel, childPath]) => <NavLink key={childPath} to={childPath}
                      onClick={() => setMobileOpen(false)}
                      className={({isActive}) => `rounded-lg px-3 py-[8px] text-[.68rem] font-medium leading-snug transition-colors ${isActive ? "bg-[#14554b] text-[#a2e8cc]" : "text-[#91b9ae] hover:bg-white/5 hover:text-white"}`}>{childLabel}</NavLink>)}
                  </div>}
                </div>
              );
            });
          })()}
        </nav>
        <div className="sidebar-footer mt-auto px-[13px] pb-[22px] pt-4">
          {!collapsed && <div className="sidebar-help mb-[17px] ml-[7px] mr-[7px] flex gap-[9px] text-[.7rem] leading-[1.4] text-[#7eb8ab]">
            <ShieldCheck size={17}/><span>Secure workspace<br/><small className="text-[#5e9489]">Protected by HydroOS</small></span>
          </div>}
          <button className="sidebar-logout flex w-full items-center justify-center gap-[9px] rounded-lg border border-[rgba(164,226,204,.16)] bg-transparent p-2.5 text-[.75rem] text-[#a9cec3]" onClick={signOut}>
            <LogOut size={17}/>{!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
      <div className="admin-content ml-[246px] w-[calc(100%-246px)] transition-[margin,width] duration-200">
        <header className="admin-topbar flex h-[76px] items-center border-b border-[#e4ece9] bg-white px-[clamp(20px,3vw,42px)]">
          <button className="sidebar-toggle grid h-[34px] w-[34px] place-items-center rounded-lg border border-[#dfeae6] bg-white text-[#587a77]"
            onClick={() => window.innerWidth < 800 ? setMobileOpen(true) : setCollapsed((value) => !value)} aria-label="Toggle sidebar">
            {window.innerWidth < 800 ? <Menu size={21}/> : collapsed ? <ChevronRight size={21}/> : <ChevronLeft size={21}/>}
          </button>
          <div className="topbar-title ml-[18px] flex flex-col gap-[3px] text-[1.08rem] font-extrabold">
            <span>{title}</span><small className="text-[.67rem] font-medium text-[#86a19d]">{organizationName}</small>
          </div>
          <div className="topbar-actions ml-auto flex items-center gap-[22px]">
            {systemRole !== "OPERATOR" && <NavLink className="topbar-icon relative grid place-items-center text-[#65807d]" to="/notifications" aria-label="Notifications">
              <Bell size={19}/>{unread > 0 && <i>{unread > 99 ? "99+" : unread}</i>}
            </NavLink>}
            {systemRole === "SUPER_ADMIN" && <NavLink className="topbar-icon relative grid place-items-center text-[#65807d]" to="/change-password" aria-label="Change password"><Settings size={18}/></NavLink>}
            <div className="profile-menu flex items-center gap-[9px]">
              <span className="profile-avatar grid h-[34px] w-[34px] place-items-center rounded-full bg-[#b6ecda] font-extrabold text-[#08604f]">{(user?.firstname || user?.email || "H").charAt(0).toUpperCase()}</span>
              <div className="profile-copy flex min-w-[95px] flex-col gap-[3px]">
                <strong className="text-[.74rem]">{user?.firstname || user?.email?.split("@")[0]}</strong>
                <small className="text-[.63rem] text-[#8ca4a0]">{roleLabels[systemRole] || user?.role}</small>
              </div>
              <button className="profile-button grid place-items-center border-0 bg-transparent text-[#819692]" onClick={signOut} aria-label="Sign out"><LogOut size={16}/></button>
            </div>
          </div>
        </header>
        <main className="admin-main min-h-[calc(100vh-76px)] px-[clamp(20px,4vw,54px)] py-[clamp(24px,4vw,45px)]">{children}</main>
      </div>
    </div>
  );
}
