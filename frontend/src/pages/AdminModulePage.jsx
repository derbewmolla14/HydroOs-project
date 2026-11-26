import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Droplets, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../api";
import { AdminLayout } from "../layouts/AdminLayout";

const modules = {
  tanks: { title: "Water Tanks", paths: [["Overview", "/tanks"], ["Water Level", "/tanks/level"], ["Tank Status", "/tanks/status"], ["Tank History", "/tanks/history"]] },
  irrigation: { title: "Irrigation Control", paths: [["Overview", "/irrigation"], ["Valve Status", "/irrigation/valves"], ["Schedule Management", "/irrigation/schedules"], ["Irrigation History", "/irrigation/history"]] },
  soil: { title: "Soil Moisture", paths: [["Overview", "/soil-moisture"], ["Current Sensors", "/soil-moisture/sensors"], ["Threshold Settings", "/soil-moisture/thresholds"], ["Moisture History", "/soil-moisture/history"]] },
  sources: { title: "Water Sources", paths: [["Overview", "/water-sources"]] },
  quality: { title: "Water Quality", paths: [["Current Readings", "/water-quality"], ["Quality History", "/water-quality/history"]] },
};
const moduleForPath = (path) => path.startsWith("/tanks/") ? "tanks" : path.startsWith("/irrigation") ? "irrigation" : path.startsWith("/soil-moisture") ? "soil" : path.startsWith("/water-quality") ? "quality" : "sources";
const formatValue = (value, unit = "") => value === null || value === undefined ? "—" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`;
const ago = (value) => value ? new Date(value).toLocaleString() : "No telemetry received";

function Metric({ label, value, unit, detail, icon: Icon = Activity }) {
  return <article className="rounded-xl border border-[#e0ebe7] bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between text-xs font-semibold text-[#78918e]"><span>{label}</span><Icon size={17} className="text-[#29977d]"/></div>
    <strong className="mt-3 block text-2xl font-extrabold text-[#145d50]">{formatValue(value, unit)}</strong>
    <small className="mt-1 block text-xs text-[#8ca4a0]">{detail || "Waiting for device telemetry"}</small>
  </article>;
}

export function AdminModulePage() {
  const { pathname } = useLocation();
  const key = moduleForPath(pathname);
  const module = modules[key];
  const isHistory = pathname.endsWith("/history");
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [overviewResponse, historyResponse] = await Promise.all([
        api.get("/monitoring/overview"),
        api.get("/monitoring/history", { params: { granularity: "hour" } }),
      ]);
      setOverview(overviewResponse.data);
      setHistory(historyResponse.data.points || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load monitoring data. Check the API connection and your access permissions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (pathname === "/tanks/level") return undefined;
    load();
    const timer = window.setInterval(() => load(true), 30000);
    let socket;
    try {
      const socketOrigin = new URL(api.defaults.baseURL, window.location.origin).origin;
      socket = io(socketOrigin, { withCredentials: true, transports: ["websocket", "polling"] });
      const refreshFromTelemetry = () => load(true);
      socket.on("telemetry:reading", refreshFromTelemetry);
      socket.on("tank:water-level", refreshFromTelemetry);
    } catch {
      // The periodic refresh remains available if realtime transport is unavailable.
    }
    return () => {
      window.clearInterval(timer);
      socket?.disconnect();
    };
  }, [load, pathname]);

  const readings = overview?.latestReadings || [];
  const devices = overview?.devices || [];
  const tanks = overview?.tanks || [];
  const relevantReadings = useMemo(() => {
    if (key === "quality") return readings.filter((r) => r.ph != null || r.turbidity != null || r.electricalConductivity != null || r.temperature != null);
    if (key === "soil") return readings.filter((r) => r.soilMoisture != null);
    if (key === "sources" || key === "irrigation") return readings.filter((r) => r.flowRate != null);
    return readings.filter((r) => r.waterLevel != null || r.waterVolume != null);
  }, [readings, key]);
  const latest = relevantReadings[0] || readings[0] || {};

  const title = module.title;
  const pageTitle = module.paths.find(([, path]) => path === pathname)?.[0] || title;
  const metricCards = key === "quality" ? [
    ["pH", latest.ph, "", "0–14 scale", Droplets],
    ["Turbidity", latest.turbidity, " NTU", "Water clarity", Activity],
    ["TDS / EC", latest.electricalConductivity, " µS/cm", "Electrical conductivity proxy", Activity],
    ["Temperature", latest.temperature, " °C", "Latest sensor temperature", Activity],
  ] : key === "soil" ? [
    ["Soil moisture", latest.soilMoisture, " %", "Latest soil probe reading", Droplets],
    ["Connected devices", overview?.summary?.connectedDevices, "", "Online hardware", Wifi],
    ["Offline devices", overview?.summary?.offlineDevices, "", "No recent heartbeat", WifiOff],
  ] : key === "sources" || key === "irrigation" ? [
    ["Flow rate", latest.flowRate, " L/min", "Latest measured intake / flow", Activity],
    ["Connected devices", overview?.summary?.connectedDevices, "", "Online hardware", Wifi],
    ["Offline devices", overview?.summary?.offlineDevices, "", "No recent heartbeat", WifiOff],
  ] : [
    ["Water availability", overview?.summary?.waterAvailabilityLiters, " L", "Sum of latest tank levels", Droplets],
    ["Average tank level", overview?.summary?.averageWaterLevel, " %", "Across monitored tanks", Activity],
    ["Connected devices", overview?.summary?.connectedDevices, "", "Online hardware", Wifi],
    ["Offline devices", overview?.summary?.offlineDevices, "", "No recent heartbeat", WifiOff],
  ];

  return <AdminLayout title={pageTitle}>
    {pathname === "/tanks/level" ? <WaterLevelLive /> : <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="dashboard-kicker">HydroOS monitoring workspace</p><h1 className="text-3xl font-extrabold tracking-tight text-[#173c3d]">{pageTitle}</h1>
          <p className="mt-2 text-sm text-[#78918e]">Live device telemetry, connectivity status and verified historical readings.</p></div>
        <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg bg-[#a2e8cc] px-4 py-2.5 text-sm font-bold text-[#073a37] disabled:opacity-60"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""}/>Refresh</button>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-[#dce9e5] pb-3">
        {module.paths.map(([label, path]) => <NavLink key={path} to={path} className={({isActive}) => `rounded-lg px-3 py-2 text-xs font-bold ${isActive ? "bg-[#dff6ec] text-[#116456]" : "bg-white text-[#6f8984] hover:bg-[#edf7f2]"}`}>{label}</NavLink>)}
      </nav>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e0ebe7] bg-white px-4 py-3 text-xs">
        <span className="inline-flex items-center gap-2 font-bold text-[#50726e]">{overview?.summary?.connectedDevices > 0 ? <CheckCircle2 size={15} className="text-emerald-600"/> : <AlertTriangle size={15} className="text-amber-600"/>}{overview?.summary?.connectedDevices || 0} device(s) online</span>
        <span className="text-[#9aadaa]">•</span><span className="text-[#78918e]">Last synced: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[#78918e]"><Clock3 size={13}/> Auto refresh: 30 sec</span>
      </div>

      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><strong>Monitoring API unavailable</strong><p className="mt-1">{error}</p><p className="mt-1 text-xs">Hardware values are not simulated; they appear when registered devices send telemetry.</p></div>}

      {loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((n)=><div key={n} className="h-28 animate-pulse rounded-xl bg-[#e4efeb]"/>)}</div> : <>
        {!isHistory && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map(([label,value,unit,detail,Icon])=><Metric key={label} label={label} value={value} unit={unit} detail={detail} icon={Icon}/>)}</div>}

        {key === "tanks" && <section className="rounded-xl border border-[#e0ebe7] bg-white p-4"><h2 className="mb-3 font-bold text-[#214f4b]">Tank status</h2>{tanks.length ? <div className="grid gap-3 md:grid-cols-2">{tanks.map((tank)=><div key={tank._id} className="rounded-lg border border-[#edf3f1] p-3"><div className="flex justify-between gap-3"><strong className="text-sm text-[#315b59]">{tank.name}</strong><span className="text-xs capitalize text-[#66847e]">{tank.status}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e5f1ee]"><div className="h-full rounded-full bg-[#51bfa2]" style={{width:`${Math.min(100, tank.capacity ? tank.currentWaterLevel / tank.capacity * 100 : 0)}%`}}/></div><p className="mt-2 text-xs text-[#78918e]">{formatValue(tank.currentWaterLevel," L")} / {formatValue(tank.capacity," L")} · Updated {ago(tank.lastMeasuredAt)}</p></div>)}</div> : <p className="text-sm text-[#78918e]">No tanks are assigned to this account yet.</p>}</section>}

        {(key === "sources" || key === "irrigation" || key === "soil") && <section className="rounded-xl border border-[#e0ebe7] bg-white p-4"><h2 className="mb-2 font-bold text-[#214f4b]">{key === "sources" ? "Source intake telemetry" : key === "irrigation" ? "Controller and valve connectivity" : "Soil probe connectivity"}</h2><p className="mb-3 text-xs text-[#78918e]">{key === "sources" ? "Flow-rate readings from registered source meters. Source inventory and availability require source records to be configured." : key === "irrigation" ? "Connected controllers are shown below. Valve state and executed irrigation cycles require controller telemetry fields." : "Soil moisture values are shown when compatible probes report soilMoisture in percent."}</p><DeviceList devices={devices}/></section>}

        {key === "quality" && <section className="rounded-xl border border-[#e0ebe7] bg-white p-4"><h2 className="mb-2 font-bold text-[#214f4b]">Water quality sensor status</h2><p className="mb-3 text-xs text-[#78918e]">pH, turbidity, electrical conductivity (TDS proxy) and temperature are read from the same authenticated device telemetry stream.</p><DeviceList devices={devices}/></section>}

        <section className="overflow-hidden rounded-xl border border-[#e0ebe7] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf3f1] px-4 py-3"><h2 className="font-bold text-[#214f4b]">{isHistory ? "Historical readings" : "Latest telemetry"}</h2><span className="text-xs text-[#8ca4a0]">{isHistory ? history.length : relevantReadings.length} data point(s)</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-[#f7fbf9] text-[#78918e]"><tr>{["Measured at","Device","Water level / volume","Flow rate","pH","Turbidity","Temperature","Soil moisture"].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{(isHistory ? history : relevantReadings).map((row,i)=><tr key={row._id || row.timestamp || i} className="border-t border-[#edf3f1] text-[#50726e]"><td className="whitespace-nowrap px-3 py-3">{ago(row.measuredAt || row.timestamp)}</td><td className="px-3 py-3">{row.deviceId?.name || row.deviceId || "—"}</td><td className="px-3 py-3">{formatValue(row.waterVolume ?? row.waterLevel," L")}</td><td className="px-3 py-3">{formatValue(row.flowRate," L/min")}</td><td className="px-3 py-3">{formatValue(row.ph)}</td><td className="px-3 py-3">{formatValue(row.turbidity," NTU")}</td><td className="px-3 py-3">{formatValue(row.temperature," °C")}</td><td className="px-3 py-3">{formatValue(row.soilMoisture," %")}</td></tr>)}</tbody></table></div>
          {(isHistory ? history : relevantReadings).length === 0 && <p className="p-6 text-center text-sm text-[#78918e]">No matching telemetry has been received for this module in the selected period.</p>}
        </section>
      </>}
    </section>}
  </AdminLayout>;
}

function WaterLevelLive() {
  const fallbackReading = {
    distanceCm: 113.1,
    waterLevelCm: 6.9,
    waterPercent: 6,
    source: "Tinkercad Simulation",
    updatedAt: new Date().toISOString(),
  };
  const [reading, setReading] = useState(fallbackReading);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiOrigin = new URL(api.defaults.baseURL || "/api/v1", window.location.origin).origin;
    const endpoint = new URL("/api/water-level", apiOrigin).toString();
    let disposed = false;
    let inFlight = false;
    let controller;

    const poll = async () => {
      if (inFlight || disposed) return;
      inFlight = true;
      controller = new AbortController();
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Water level endpoint returned ${response.status}`);
        const nextReading = await response.json();
        if (![nextReading.distanceCm, nextReading.waterLevelCm, nextReading.waterPercent].every((value) => Number.isFinite(Number(value)))) {
          throw new Error("Water level response contains invalid measurements.");
        }
        if (!disposed) {
          setReading(nextReading);
          setConnected(true);
        }
      } catch (error) {
        if (!disposed && error.name !== "AbortError") setConnected(false);
      } finally {
        inFlight = false;
      }
    };

    poll();
    const timer = window.setInterval(poll, 1000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      controller?.abort();
    };
  }, []);

  const percentage = Math.max(0, Math.min(100, Number(reading.waterPercent) || 0));
  const updatedLabel = reading.updatedAt ? new Date(reading.updatedAt).toLocaleTimeString() : "Waiting for first update";

  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="dashboard-kicker">HydroOS live telemetry</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#173c3d]">Water Level</h1>
        <p className="mt-2 text-sm text-[#78918e]">Live ultrasonic sensor measurements from your Tinkercad bridge.</p>
      </div>
      <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${connected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        {connected ? `Live: ${reading.source || "Sensor"}` : `Reconnecting · ${reading.source || "Sensor"}`}
      </span>
    </header>

    <article className="rounded-xl border border-[#e0ebe7] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#78918e]">Current water level</p>
          <strong className="mt-2 block text-4xl font-extrabold text-[#145d50]">{Number(reading.waterLevelCm).toFixed(1)} <span className="text-xl">cm</span></strong>
        </div>
        <span className="rounded-lg bg-[#eaf7f1] px-3 py-2 text-lg font-bold text-[#187761]">{percentage.toFixed(0)}%</span>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#e5f1ee]" role="progressbar" aria-label="Water level percentage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-[#51bfa2] transition-[width] duration-500" style={{ width: `${percentage}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-[#8ca4a0]"><span>0%</span><span>100%</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#edf3f1] p-3">
          <span className="text-xs font-semibold text-[#78918e]">Distance to water</span>
          <strong className="mt-1 block text-xl font-bold text-[#315b59]">{Number(reading.distanceCm).toFixed(1)} cm</strong>
        </div>
        <div className="rounded-lg border border-[#edf3f1] p-3">
          <span className="text-xs font-semibold text-[#78918e]">Last updated</span>
          <strong className="mt-1 block text-sm font-bold text-[#315b59]">{updatedLabel}</strong>
        </div>
      </div>
      {!connected && <p role="status" className="mt-3 text-xs text-[#8a7660]">The live endpoint is temporarily unavailable. The last available reading is being kept on screen.</p>}
    </article>
  </section>;
}

function DeviceList({ devices }) {
  if (!devices.length) return <p className="text-sm text-[#78918e]">No devices registered for this organization.</p>;
  return <div className="grid gap-2 md:grid-cols-2">{devices.map((device)=><div key={device._id} className="flex items-center justify-between gap-3 rounded-lg border border-[#edf3f1] px-3 py-2.5"><div><strong className="block text-sm text-[#315b59]">{device.name}</strong><small className="text-xs text-[#8ca4a0]">{device.identifier} · Last seen {ago(device.lastSeenAt)}</small></div><span className={`rounded-full px-2 py-1 text-[.65rem] font-bold ${device.connectionStatus === "online" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{device.connectionStatus || "offline"}</span></div>)}</div>;
}
