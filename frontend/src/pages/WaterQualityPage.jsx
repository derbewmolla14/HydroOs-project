import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Beaker, Droplets, MapPin, Plus, RefreshCw, ShieldCheck, Waves } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { AdminLayout } from "../layouts/AdminLayout";
import SatelliteLocationPicker from "../components/location/SatelliteLocationPicker";
import { LocationSummary } from "../components/location/LocationSummary";

const emptyReading = { targetId: "", targetType: "tank", ph: "", turbidity: "", chlorine: "", technician: "", testingMethod: "", remarks: "" };
const statusText = (status) => status === "Unsafe - HWTS Required" ? "Unsafe - HWTS Recommended" : status || "Needs Attention";
const statusClass = (status) => status === "Safe" ? "bg-emerald-50 text-emerald-700" : status?.startsWith("Unsafe") ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
const qualityStatus = ({ ph, turbidity, chlorine }) => {
  if ([ph, turbidity, chlorine].some(v => v === null || v === undefined || v === "")) return "Needs Attention";
  if (Number(turbidity) > 5) return "Unsafe - HWTS Required";
  if (Number(ph) < 6.5 || Number(ph) > 8.5 || Number(chlorine) < 0.2 || Number(chlorine) > 0.5) return "Needs Attention";
  return "Safe";
};
const latestByTarget = (tests) => {
  const map = new Map();
  tests.forEach(test => {
    const isTank = Boolean(test.tankId);
    const id = isTank ? (test.tankId?._id || test.tankId) : (test.waterSourceId?._id || test.waterSourceId);
    const key = (isTank ? "tank:" : "source:") + id;
    if (id && !map.has(key)) map.set(key, test);
  });
  return map;
};

export function WaterQualityPage() {
  const { user } = useAuth();
  const role = user?.systemRole || user?.role;
  const canRecord = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN", "OPERATOR"].includes(role);
  const [tanks, setTanks] = useState([]);
  const [sources, setSources] = useState([]);
  const [tests, setTests] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState(user?.organizationId || "");
  const [form, setForm] = useState(emptyReading);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api.get("/tanks?limit=100"),
      api.get("/sources?limit=100"),
      api.get("/water-quality?limit=100")
    ]);
    if (results[0].status === "fulfilled") setTanks(results[0].value.data.tanks || []);
    if (results[1].status === "fulfilled") setSources(results[1].value.data.sources || []);
    if (results[2].status === "fulfilled") setTests(results[2].value.data.tests || []);
    const failed = results.find(result => result.status === "rejected");
    if (failed) setError(failed.reason?.response?.data?.message || "Some water quality data could not be loaded. Check service access and API connectivity.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (role === "SUPER_ADMIN") api.get("/organizations").then(({ data }) => setOrganizations(data.organizations || [])).catch(() => {});
  }, [load, role]);

  const latest = useMemo(() => latestByTarget(tests), [tests]);
  const rows = useMemo(() => [
    ...tanks.map(item => ({ ...item, kind: "tank", displayName: item.name, targetId: item._id, reading: latest.get("tank:" + item._id) })),
    ...sources.map(item => ({ ...item, kind: "source", displayName: item.name, targetId: item._id, reading: latest.get("source:" + item._id) }))
  ].filter(item => filter === "all" || item.kind === filter), [tanks, sources, latest, filter]);

  const summary = useMemo(() => {
    const values = Array.from(latestByTarget(tests).values());
    const pH = values.find(x => x.ph !== null && x.ph !== undefined);
    const turbidity = values.find(x => x.turbidity !== null && x.turbidity !== undefined);
    const chlorine = values.find(x => x.chlorine !== null && x.chlorine !== undefined);
    const overall = values.length ? values.reduce((worst, item) => {
      const current = item.washStatus || qualityStatus(item);
      const rank = s => s === "Unsafe - HWTS Required" ? 2 : s === "Needs Attention" ? 1 : 0;
      return rank(current) > rank(worst) ? current : worst;
    }, "Safe") : "Needs Attention";
    return { pH, turbidity, chlorine, overall };
  }, [tests]);

  async function submit(event) {
    event.preventDefault();
    const id = form.targetId;
    if (!id) return setError("Select a tank or water source first.");
    setSaving(true); setError("");
    try {
      const payload = {
        ...(role === "SUPER_ADMIN" ? { organizationId } : {}),
        ...(form.targetType === "tank" ? { tankId: id } : { waterSourceId: id }),
        ph: form.ph === "" ? null : Number(form.ph),
        turbidity: form.turbidity === "" ? null : Number(form.turbidity),
        chlorine: form.chlorine === "" ? null : Number(form.chlorine),
        technician: form.technician, testingMethod: form.testingMethod, remarks: form.remarks
      };
      await api.post("/water-quality", payload);
      setForm(emptyReading); setShowForm(false); await load();
    } catch (e) { setError(e.response?.data?.message || "Water quality reading could not be recorded."); }
    finally { setSaving(false); }
  }

  const metricCard = (label, value, unit, target, icon, tone) => (
    <article className="rounded-2xl border border-[#e1eee8] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-[#77918a]">{label}</span><span className={`rounded-xl p-2 ${tone}`}>{icon}</span></div>
      <div className="mt-3 flex items-baseline gap-2"><strong className="text-2xl font-extrabold text-[#174b43]">{value ?? "—"}</strong><span className="text-xs text-[#819892]">{unit}</span></div>
      <p className="mt-1 text-xs text-[#8ba09a]">Target: {target}</p>
    </article>
  );

  return <AdminLayout title="Water Quality">
    <main className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="dashboard-kicker">HydroOS · WASH monitoring</p><h1 className="text-3xl font-extrabold text-[#173c3d]">Water quality</h1><p className="mt-2 text-sm text-[#78918e]">Latest tank and source readings against operational WHO and WASH screening targets.</p></div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#dcebe5] bg-white px-3 py-2 text-sm font-bold text-[#315d56]"><RefreshCw size={15}/>Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCard("pH", summary.pH?.ph, "pH units", "6.5 – 8.5", <Beaker size={18}/>, "bg-sky-50 text-sky-700")}
        {metricCard("Turbidity", summary.turbidity?.turbidity, "NTU", "< 5 NTU", <Waves size={18}/>, "bg-cyan-50 text-cyan-700")}
        {metricCard("Free chlorine", summary.chlorine?.chlorine, "mg/L", "0.2 – 0.5 mg/L", <Droplets size={18}/>, "bg-teal-50 text-teal-700")}
        <article className="rounded-2xl border border-[#dcebe5] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-[#77918a]">Overall WASH compliance</span><ShieldCheck className="text-[#0d8068]" size={20}/></div><div className="mt-4"><span className={`inline-flex rounded-full px-3 py-2 text-sm font-extrabold ${statusClass(summary.overall)}`}>{statusText(summary.overall)}</span></div><p className="mt-2 text-xs text-[#8ba09a]">Based on available latest test records</p></article>
      </div>
      <div className="flex flex-wrap gap-2">
        {canRecord && <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-2 rounded-lg bg-[#0d6655] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Record Water Quality</button>}
        <Link to="/tanks/new" className="inline-flex items-center gap-2 rounded-lg border border-[#cfe3da] bg-white px-4 py-2.5 text-sm font-bold text-[#176c59]"><Plus size={16}/>Add Water Tank</Link>
        <button onClick={() => setExpanded(v => v === "__all" ? "" : "__all")} className="inline-flex items-center gap-2 rounded-lg border border-[#cfe3da] bg-white px-4 py-2.5 text-sm font-bold text-[#176c59]"><MapPin size={16}/>See Satellite Map</button>
      </div>
      {showForm && <form onSubmit={submit} className="rounded-2xl border border-[#dcebe5] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-[#214f4b]">Record a water quality test</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {role === "SUPER_ADMIN" && <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Organization<select required value={organizationId} onChange={e=>setOrganizationId(e.target.value)} className="rounded-lg border p-2.5 text-sm"><option value="">Select organization</option>{organizations.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}</select></label>}
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Record for<select value={form.targetType} onChange={e=>setForm(v=>({...v,targetType:e.target.value,targetId:""}))} className="rounded-lg border p-2.5 text-sm"><option value="tank">Water tank</option><option value="source">Water source</option></select></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Tank / source<select required value={form.targetId} onChange={e=>setForm(v=>({...v,targetId:e.target.value}))} className="rounded-lg border p-2.5 text-sm"><option value="">Select site</option>{(form.targetType === "tank" ? tanks : sources).map(x=><option key={x._id} value={x._id}>{x.name} · {x.code}</option>)}</select></label>
          {["ph","turbidity","chlorine"].map((key,i)=><label key={key} className="grid gap-1 text-xs font-semibold text-[#67827c]">{["pH","Turbidity (NTU)","Free chlorine (mg/L)"][i]}<input required type="number" step="any" min="0" value={form[key]} onChange={e=>setForm(v=>({...v,[key]:e.target.value}))} className="rounded-lg border p-2.5 text-sm"/></label>)}
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Technician<input value={form.technician} onChange={e=>setForm(v=>({...v,technician:e.target.value}))} className="rounded-lg border p-2.5 text-sm"/></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Testing method<input value={form.testingMethod} onChange={e=>setForm(v=>({...v,testingMethod:e.target.value}))} className="rounded-lg border p-2.5 text-sm"/></label>
        </div>
        <label className="mt-3 grid gap-1 text-xs font-semibold text-[#67827c]">Remarks<textarea rows="2" value={form.remarks} onChange={e=>setForm(v=>({...v,remarks:e.target.value}))} className="rounded-lg border p-2.5 text-sm"/></label>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#0d6655] px-4 py-2 text-sm font-bold text-white">{saving?"Saving…":"Save reading"}</button></div>
      </form>}
      <section className="overflow-hidden rounded-2xl border border-[#e0ebe7] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8f0ec] p-4"><div><h2 className="font-extrabold text-[#214f4b]">Tanks & water sources</h2><p className="text-xs text-[#8ba09a]">Most recent quality result for each registered site</p></div><select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-[#dce9e4] px-3 py-2 text-xs font-semibold"><option value="all">All sites</option><option value="tank">Water tanks</option><option value="source">Water sources</option></select></div>
        {loading ? <p className="p-8 text-center text-sm text-[#78918e]">Loading monitoring records…</p> : rows.length ? <div className="divide-y divide-[#edf3ef]">{rows.map(item=>{const q=item.reading;const coordinates=item.coordinates || {latitude:item.latitude,longitude:item.longitude};return <article key={item.kind+item._id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><strong className="text-sm text-[#315b59]">{item.displayName}</strong><span className="rounded-full bg-[#edf7f2] px-2 py-1 text-[10px] font-bold uppercase text-[#347766]">{item.kind}</span></div><p className="mt-1 text-xs text-[#8ca4a0]">{item.code} · Water level: {item.currentWaterLevel !== undefined ? `${Number(item.currentWaterLevel).toLocaleString()} L` : "Not available"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(q?.washStatus || "Needs Attention")}`}>{statusText(q?.washStatus || "Needs Attention")}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-[#f7faf8] p-2"><span className="text-[10px] text-[#819892]">pH</span><p className="text-sm font-bold text-[#315b59]">{q?.ph ?? "—"}</p></div><div className="rounded-lg bg-[#f7faf8] p-2"><span className="text-[10px] text-[#819892]">Turbidity</span><p className="text-sm font-bold text-[#315b59]">{q?.turbidity ?? "—"} {q && "NTU"}</p></div><div className="rounded-lg bg-[#f7faf8] p-2"><span className="text-[10px] text-[#819892]">Free chlorine</span><p className="text-sm font-bold text-[#315b59]">{q?.chlorine ?? "—"} {q && "mg/L"}</p></div></div><div className="mt-3"><LocationSummary value={item}/></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-[#8ba09a]">{q?.measuredAt ? `Last tested: ${new Date(q.measuredAt).toLocaleString()}` : "No quality test recorded"}</span><button onClick={()=>setExpanded(v=>v===item._id?"":item._id)} className="inline-flex items-center gap-1 text-xs font-bold text-[#176c59]"><MapPin size={14}/>{expanded===item._id?"Hide Satellite Map":"See Satellite Map"}</button></div>{(expanded===item._id || expanded==="__all") && coordinates?.latitude != null && <SatelliteLocationPicker readOnly value={{coordinates,adminLocation:item.adminLocation,mapAdded:true}}/>}</article>})}</div> : <p className="p-8 text-center text-sm text-[#78918e]">No tanks or water sources are available for this account.</p>}
      </section>
      <p className="text-[11px] leading-relaxed text-[#8ba09a]">Screening note: these cards use the thresholds configured for this HydroOS workflow. pH is an operational/acceptability indicator; this status is not a substitute for comprehensive laboratory testing or a full WHO drinking-water safety assessment.</p>
    </main>
  </AdminLayout>;
}
