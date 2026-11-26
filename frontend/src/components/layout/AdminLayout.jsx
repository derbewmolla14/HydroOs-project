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
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api";
import { io } from "socket.io-client";

const accessRoles = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"];
const navigation = [
  { section: "OVERVIEW", label: "Dashboard", path: "/dashboard", icon: Gauge, children: [
    ["System Overview", "/dashboard"], ["Analytics & Metrics", "/dashboard/analytics"]
  ] },
  { section: "ADMINISTRATION", label: "Organizations", path: "/organizations", icon: Building2, roles: ["SUPER_ADMIN"], children: [
    ["View Organizations", "/organizations"], ["Add New Organization", "/organizations/new"], ["Organization Settings", "/organizations/settings"]
  ] },
  { section: "ADMINISTRATION", label: "Users & Management", path: "/users", icon: Users, roles: accessRoles, children: [
    ["View & Manage Users", "/users"], ["Create New Admin", "/users/create-admin"], ["User Roles & Permissions", "/users/roles"]
  ] },
  { section: "WATER OPERATIONS", label: "Water Tanks", path: "/tanks", icon: Droplets, roles: accessRoles, children: [
    ["Live Tank Levels", "/tanks/level"], ["Add New Tanker", "/tanks/new"], ["Tank History & Logs", "/tanks/history"], ["Tank Hardware Status", "/tanks/hardware"]
  ] },
  { section: "WATER OPERATIONS", label: "Irrigation Control", path: "/irrigation", icon: Waves, roles: accessRoles, children: [
    ["Valve Controls", "/irrigation/valves"], ["Irrigation History", "/irrigation/history"], ["Schedules & Automation", "/irrigation/schedules"]
  ] },
  { section: "WATER OPERATIONS", label: "Soil Moisture", path: "/soil-moisture", icon: Leaf, roles: accessRoles, children: [
    ["Current Sensor Readings", "/soil-moisture/sensors"], ["Moisture History Logs", "/soil-moisture/history"], ["Threshold Configuration", "/soil-moisture/thresholds"]
  ] },
  { section: "WATER OPERATIONS", label: "Water Sources", path: "/water-sources", icon: Radio, roles: accessRoles, children: [
    ["Source Intake Status", "/water-sources/intake"], ["Flow Rate Monitoring", "/water-sources/flow"], ["Source History", "/water-sources/history"]
  ] },
  { section: "WATER OPERATIONS", label: "Water Quality", path: "/water-quality", icon: FlaskConical, roles: accessRoles, children: [
    ["Live Parameters (pH, TDS, Turbidity)", "/water-quality"], ["Quality History Logs", "/water-quality/history"], ["Sensor Calibration", "/water-quality/calibration"]
  ] },
  { section: "DEVICE & ALERTS", label: "Devices", path: "/devices", icon: Cpu, roles: accessRoles, children: [
    ["Connected Hardware List", "/devices"], ["Register New Device", "/devices/register"], ["Device Diagnostics", "/devices/diagnostics"]
  ] },
  { section: "DEVICE & ALERTS", label: "Smart Alerts", path: "/alerts", icon: ShieldAlert, roles: accessRoles, children: [
    ["Active Alerts", "/alerts"], ["Alert Rules & Triggers", "/alert-settings"], ["Alert History", "/alerts/history"]
  ] },
  { section: "DEVICE & ALERTS", label: "Notifications", path: "/notifications", icon: Bell, roles: accessRoles, children: [
    ["System Broadcasts", "/notifications/broadcasts"], ["User Notifications", "/notifications"], ["Notification Settings", "/notifications/settings"]
  ] },
  { section: "SYSTEM", label: "Reports", path: "/reports", icon: History, roles: accessRoles },
  { section: "SYSTEM", label: "Audit Logs", path: "/audit-logs", icon: Activity, roles: ["SUPER_ADMIN", "ORGANIZATION_ADMIN"] },
  { section: "SYSTEM", label: "Settings", path: "/settings", icon: Settings, roles: accessRoles },
];        <nav className="admin-nav grid gap-1 overflow-y-auto px-[11px] pb-3" aria-label="Admin navigation">
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
                    <NavLink to={item.path} end={item.path === "/dashboard"}
                      onClick={() => { setMobileOpen(false); if (item.children) setExpanded((current) => ({ ...current, [item.path]: true })); }}
                      className={({ isActive }) => `flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-[10px] text-[.76rem] font-semibold transition-colors ${isActive || activeChild ? "text-[#9af0cf]" : "text-[#b2d1c8]"}`}
                      title={collapsed ? item.label : undefined}>
                      <Icon size={17} strokeWidth={1.9} className="shrink-0"/>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                    {item.children && !collapsed && <button type="button" aria-label={`Toggle ${item.label} submenu`}
                      aria-expanded={isExpanded} onClick={() => setExpanded((current) => ({ ...current, [item.path]: !current[item.path] }))}
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
        </nav>ffect, useState } from "react";
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
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../api";
import { io } from "socket.io-client";

const accessRoles = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"];
const navigation = [
  { section: "OVERVIEW", label: "Dashboard", path: "/dashboard", icon: Gauge, children: [
    ["System Overview", "/dashboard"], ["Analytics & Metrics", "/dashboard/analytics"]
  ] },
  { section: "ADMINISTRATION", label: "Organizations", path: "/organizations", icon: Building2, roles: ["SUPER_ADMIN"], children: [
    ["View Organizations", "/organizations"], ["Add New Organization", "/organizations/new"], ["Organization Settings", "/organizations/settings"]
  ] },
  { section: "ADMINISTRATION", label: "Users & Management", path: "/users", icon: Users, roles: accessRoles, children: [
    ["View & Manage Users", "/users"], ["Create New Admin", "/users/create-admin"], ["User Roles & Permissions", "/users/roles"]
  ] },
  { section: "WATER OPERATIONS", label: "Water Tanks", path: "/tanks", icon: Droplets, roles: accessRoles, children: [
    ["Live Tank Levels", "/tanks/level"], ["Add New Tanker", "/tanks/new"], ["Tank History & Logs", "/tanks/history"], ["Tank Hardware Status", "/tanks/hardware"]
  ] },
  { section: "WATER OPERATIONS", label: "Irrigation Control", path: "/irrigation", icon: Waves, roles: accessRoles, children: [
    ["Valve Controls", "/irrigation/valves"], ["Irrigation History", "/irrigation/history"], ["Schedules & Automation", "/irrigation/schedules"]
  ] },
  { section: "WATER OPERATIONS", label: "Soil Moisture", path: "/soil-moisture", icon: Leaf, roles: accessRoles, children: [
    ["Current Sensor Readings", "/soil-moisture/sensors"], ["Moisture History Logs", "/soil-moisture/history"], ["Threshold Configuration", "/soil-moisture/thresholds"]
  ] },
  { section: "WATER OPERATIONS", label: "Water Sources", path: "/water-sources", icon: Radio, roles: accessRoles, children: [
    ["Source Intake Status", "/water-sources/intake"], ["Flow Rate Monitoring", "/water-sources/flow"], ["Source History", "/water-sources/history"]
  ] },
  { section: "WATER OPERATIONS", label: "Water Quality", path: "/water-quality", icon: FlaskConical, roles: accessRoles, children: [
    ["Live Parameters (pH, TDS, Turbidity)", "/water-quality"], ["Quality History Logs", "/water-quality/history"], ["Sensor Calibration", "/water-quality/calibration"]
  ] },
  { section: "DEVICE & ALERTS", label: "Devices", path: "/devices", icon: Cpu, roles: accessRoles, children: [
    ["Connected Hardware List", "/devices"], ["Register New Device", "/devices/register"], ["Device Diagnostics", "/devices/diagnostics"]
  ] },
  { section: "DEVICE & ALERTS", label: "Smart Alerts", path: "/alerts", icon: ShieldAlert, roles: accessRoles, children: [
    ["Active Alerts", "/alerts"], ["Alert Rules & Triggers", "/alert-settings"], ["Alert History", "/alerts/history"]
  ] },
  { section: "DEVICE & ALERTS", label: "Notifications", path: "/notifications", icon: Bell, roles: accessRoles, children: [
    ["System Broadcasts", "/notifications/broadcasts"], ["User Notifications", "/notifications"], ["Notification Settings", "/notifications/settings"]
  ] },
  { section: "SYSTEM", label: "Reports", path: "/reports", icon: History, roles: accessRoles },
  { section: "SYSTEM", label: "Audit Logs", path: "/audit-logs", icon: Activity, roles: ["SUPER_ADMIN", "ORGANIZATION_ADMIN"] },
  { section: "SYSTEM", label: "Settings", path: "/settings", icon: Settings, roles: accessRoles },
];
