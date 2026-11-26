import { useEffect, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api";
import { io } from "socket.io-client";

const accessRoles = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"];
const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: "⌂" },
  { label: "Organizations", path: "/organizations", icon: "◈", roles: ["SUPER_ADMIN"] },
  { label: "Users", path: "/users", icon: "♙", roles: accessRoles },
  { label: "Water Tanks", path: "/tanks", icon: "◉", roles: accessRoles, children: [
    ["Water Level", "/tanks/level"], ["Tank Status", "/tanks/status"], ["Tank History", "/tanks/history"]
  ] },
  { label: "Irrigation Control", path: "/irrigation", icon: "≈", roles: accessRoles, children: [
    ["Valve Status", "/irrigation/valves"], ["Schedule Management", "/irrigation/schedules"], ["Irrigation History", "/irrigation/history"]
  ] },
  { label: "Soil Moisture", path: "/soil-moisture", icon: "⌁", roles: accessRoles, children: [
    ["Current Sensors", "/soil-moisture/sensors"], ["Threshold Settings", "/soil-moisture/thresholds"], ["Moisture History", "/soil-moisture/history"]
  ] },
  { label: "Water Sources", path: "/water-sources", icon: "◌", roles: accessRoles },
  { label: "Water Quality", path: "/water-quality", icon: "◍", roles: accessRoles, children: [
    ["Current Readings", "/water-quality"], ["Quality History", "/water-quality/history"]
  ] },
  { label: "Devices", path: "/devices", icon: "▣", roles: accessRoles },
  { label: "Smart Alerts", path: "/alerts", icon: "⚠", roles: accessRoles },
  { label: "Notifications", path: "/notifications", icon: "♢", roles: accessRoles },
  { label: "Alert Settings", path: "/alert-settings", icon: "⚙", roles: accessRoles },
  { label: "Schedule", path: "/schedule", icon: "◷", roles: accessRoles },
  { label: "Reports", path: "/reports", icon: "▤", roles: accessRoles },
  { label: "Audit Logs", path: "/audit-logs", icon: "▥", roles: ["SUPER_ADMIN", "ORGANIZATION_ADMIN"] },
  { label: "Settings", path: "/settings", icon: <Settings size={17} />, roles: accessRoles },
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [expanded, setExpanded] = useState({});
  const systemRole = user?.systemRole || user?.role;
  const dashboardPath = systemRole === "OPERATOR" || systemRole === "user" ? "/home" : "/dashboard";
  const allowedNavigation = navigation
    .map((item, index) => index === 0 ? { ...item, path: dashboardPath } : item)
    .filter((item) => !item.roles || item.roles.includes(systemRole));
  useEffect(() => {
    api
      .get("/notifications")
      .then(({ data }) => setUnread(data.unread))
      .catch(() => {});
    const socket = io("/", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    const onNotification = () => setUnread((value) => value + 1);
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
      socket.disconnect();
    };
  }, []);
  const organizationName = user?.organizationId
    ? "Your organization"
    : "Platform overview";
  async function signOut() {
    await logout();
    navigate("/login", { replace: true });
  }
  return (
    <div
      className={`admin-shell min-h-screen bg-[#f2f9f7]${collapsed ? " sidebar-collapsed" : ""}`}
    >
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-20 flex w-[246px] flex-col bg-[#073a37] text-[#d3ebe5] transition-transform duration-200${mobileOpen ? " mobile-open" : ""}`}
      >
        <div className="sidebar-brand flex h-[76px] items-center gap-2.5 px-[22px] text-[1.28rem] font-extrabold tracking-[-.05em]">
          <span className="sidebar-logo grid h-[33px] w-[33px] place-items-center rounded-[10px] bg-[#7ce0be] text-[1.18rem] text-[#063d37]">
            H
          </span>
          {!collapsed && (
            <span>
              Hydro<span className="text-[#6de2c0]">OS</span>
            </span>
          )}
          <button
            className="mobile-close ml-auto border-0 bg-transparent text-[#c3e6dc]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-section-label px-[23px] pb-2.5 pt-[19px] text-[.64rem] tracking-[.14em] text-[#74ada0]">
          {!collapsed && "WORKSPACE"}
        </div>
        <nav className="admin-nav grid gap-[3px] px-[11px]">
          {allowedNavigation.map((item) => {
            const activeChild = item.children?.some(([, childPath]) => window.location.pathname === childPath);
            const isExpanded = Boolean(expanded[item.path] || activeChild);
            return (
              <div key={item.path}>
                <div className="flex items-center">
                  <NavLink to={item.path} end={item.path === "/dashboard"}
                    onClick={() => { setMobileOpen(false); if (item.children) setExpanded((current) => ({ ...current, [item.path]: true })); }}
                    className={({ isActive }) => `admin-nav-link flex min-w-0 flex-1 items-center gap-[13px] rounded-lg px-[13px] py-[11px] text-[.78rem] font-semibold text-[#a7ccc2] transition-colors${isActive || activeChild ? " active bg-[#a2e8cc] text-[#073a37]" : ""}`}
                    title={collapsed ? item.label : undefined}>
                    <span className="nav-glyph grid w-[18px] min-w-[18px] place-items-center text-[1.1rem]">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                  {item.children && !collapsed && <button type="button" aria-label={`Toggle ${item.label} submenu`}
                    aria-expanded={isExpanded} onClick={() => setExpanded((current) => ({ ...current, [item.path]: !current[item.path] }))}
                    className="mr-2 rounded p-1 text-[#9bc7bb] hover:bg-white/10">{isExpanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</button>}
                </div>
                {item.children && !collapsed && isExpanded && <div className="ml-[42px] mt-1 mb-2 grid gap-1 border-l border-[#47766c] pl-3">
                  {item.children.map(([childLabel, childPath]) => <NavLink key={childPath} to={childPath}
                    onClick={() => setMobileOpen(false)}
                    className={({isActive}) => `rounded-md px-2 py-2 text-[.7rem] font-medium ${isActive ? "bg-[#14554b] text-[#a2e8cc]" : "text-[#8fb9ae] hover:bg-white/5 hover:text-white"}`}>{childLabel}</NavLink>)}
                </div>}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer mt-auto px-[13px] pb-[22px] pt-4">
          {!collapsed && (
            <div className="sidebar-help mb-[17px] ml-[7px] mr-[7px] flex gap-[9px] text-[.7rem] leading-[1.4] text-[#7eb8ab]">
              <ShieldCheck size={17} />
              <span>
                Secure workspace
                <br />
                <small className="text-[#5e9489]">Protected by HydroOS</small>
              </span>
            </div>
          )}
          <button
            className="sidebar-logout flex w-full items-center justify-center gap-[9px] rounded-lg border border-[rgba(164,226,204,.16)] bg-transparent p-2.5 text-[.75rem] text-[#a9cec3]"
            onClick={signOut}
          >
            <LogOut size={17} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="admin-content w-[calc(100%-246px)] ml-[246px] transition-[margin,width] duration-200">
        <header className="admin-topbar flex h-[76px] items-center border-b border-[#e4ece9] bg-white px-[clamp(20px,3vw,42px)]">
          <button
            className="sidebar-toggle grid h-[34px] w-[34px] place-items-center rounded-lg border border-[#dfeae6] bg-white text-[#587a77]"
            onClick={() =>
              window.innerWidth < 800
                ? setMobileOpen(true)
                : setCollapsed((value) => !value)
            }
            aria-label="Toggle sidebar"
          >
            {window.innerWidth < 800 ? (
              <Menu size={21} />
            ) : collapsed ? (
              <ChevronRight size={21} />
            ) : (
              <ChevronLeft size={21} />
            )}
          </button>
          <div className="topbar-title ml-[18px] flex flex-col gap-[3px] text-[1.08rem] font-extrabold">
            <span>{title}</span>
            <small className="text-[.67rem] font-medium text-[#86a19d]">
              {organizationName}
            </small>
          </div>
          <div className="topbar-actions ml-auto flex items-center gap-[22px]">
            <NavLink
              className="topbar-icon relative grid place-items-center text-[#65807d]"
              to="/notifications"
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unread > 0 && <i>{unread > 99 ? "99+" : unread}</i>}
            </NavLink>
            {systemRole === "SUPER_ADMIN" && (
              <NavLink
                className="topbar-icon relative grid place-items-center text-[#65807d]"
                to="/change-password"
                aria-label="Change password"
              >
                <Settings size={18} />
              </NavLink>
            )}
            <div className="profile-menu flex items-center gap-[9px]">
              <span className="profile-avatar grid h-[34px] w-[34px] place-items-center rounded-full bg-[#b6ecda] font-extrabold text-[#08604f]">
                {(user?.firstname || user?.email || "H")
                  .charAt(0)
                  .toUpperCase()}
              </span>
              <div className="profile-copy flex min-w-[95px] flex-col gap-[3px]">
                <strong className="text-[.74rem]">
                  {user?.firstname || user?.email?.split("@")[0]}
                </strong>
                <small className="text-[.63rem] text-[#8ca4a0]">
                  {roleLabels[systemRole] || user?.role}
                </small>
              </div>
              <button
                className="profile-button grid place-items-center border-0 bg-transparent text-[#819692]"
                onClick={signOut}
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
        <main className="admin-main min-h-[calc(100vh-76px)] px-[clamp(20px,4vw,54px)] py-[clamp(24px,4vw,45px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
