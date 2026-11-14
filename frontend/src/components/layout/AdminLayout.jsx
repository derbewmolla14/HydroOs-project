import { useEffect, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
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

const navigation = [
  ["Dashboard", "/dashboard", "⌂"],
  ["Organizations", "/organizations", "◈", ["SUPER_ADMIN"]],
  ["Users", "/users", "♙", ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"]],
  ["Water Tanks", "/tanks", "◉"],
  ["Irrigation Control", "/irrigation", "≈"],
  ["Soil Moisture", "/soil-moisture", "⌁"],
  ["Water Sources", "/water-sources", "◌"],
  ["Devices", "/devices", "▣"],
  ["Smart Alerts", "/alerts", "⚠"],
  ["Notifications", "/notifications", "♢"],
  [
    "Alert Settings",
    "/alert-settings",
    "⚙",
    ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"],
  ],
  ["Schedule", "/schedule", "◷"],
  ["Reports", "/reports", "▤"],
  ["Audit Logs", "/audit-logs", "▥"],
  ["Settings", "/settings", <Settings size={17} />],
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
  const allowedNavigation = navigation.filter(
    ([, , , roles]) => !roles || roles.includes(user?.role),
  );
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
          {allowedNavigation.map(([label, path, icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/dashboard"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `admin-nav-link flex items-center gap-[13px] rounded-lg px-[13px] py-[11px] text-[.78rem] font-semibold text-[#a7ccc2] transition-colors${isActive ? " active bg-[#a2e8cc] text-[#073a37]" : ""}`
              }
              title={collapsed ? label : undefined}
            >
              <span className="nav-glyph grid w-[18px] min-w-[18px] place-items-center text-[1.1rem]">
                {icon}
              </span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
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
            {user?.role === "SUPER_ADMIN" && (
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
                  {roleLabels[user?.role] || user?.role}
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
