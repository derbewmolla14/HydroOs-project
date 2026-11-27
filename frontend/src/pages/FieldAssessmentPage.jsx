import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Filter, Plus, Search } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { AdminLayout } from "../layouts/AdminLayout";
import SatelliteLocationPicker from "../components/location/SatelliteLocationPicker";
import { LocationSummary } from "../components/location/LocationSummary";

const infrastructureChecks = ["Source structure intact", "Apron / drainage functional", "Fence or protection present", "Water collection point accessible", "Storage tank / reservoir in good condition", "Handwashing facility available"];
const riskChecks = ["Open defecation nearby", "Animal access to source", "Flooding / stagnant water", "Unprotected well or spring", "Waste disposal near source", "Cracked platform / poor drainage", "No cover or insecure storage", "Visible contamination / unusual odour"];
const interventions = ["Rehabilitation", "Spring Development & Protection", "Water Quality Improvement", "WASH Promotion", "Sustainable Water Supply"];
const emptyLocation = { coordinates: { latitude: 11.0849, longitude: 39.7366 }, adminLocation: { country: "Ethiopia", region: "Amhara", zone: "South Wollo", woreda: "", kebele: "" }, mapAdded: false };
const freshForm = () => ({ siteName: "", sourceType: "Spring", infrastructureStatus: "", infrastructureChecks: [], sanitaryRisks: [], waterSecurityImpact: "", priorityIntervention: "Rehabilitation", initialWaterQuality: { ph: "", turbidity: "", chlorine: "" }, notes: "", assessedBy: "", ...emptyLocation });

export function FieldAssessmentPage() {
  const { user } = useAuth();
  const role = user?.systemRole || user?.role;
  const [assessments, setAssessments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState(user?.organizationId || "");
  const [form, setForm] = useState(freshForm);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const { data } = await api.get("/field-assessments?limit=100"); setAssessments(data.assessments || []); setError(""); }
    catch (e) { setError(e.response?.data?.message || "Assessments could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    load();
    if (role === "SUPER_ADMIN") api.get("/organizations").then(({ data }) => setOrganizations(data.organizations || [])).catch(() => {});
  }, [role]);

  const visibleAssessments = useMemo(() => assessments.filter(item =>
    (!search || [item.siteName, item.sourceType, item.adminLocation?.woreda, item.adminLocation?.kebele].some(v => String(v || "").toLowerCase().includes(search.toLowerCase())))
    && (priorityFilter === "all" || item.priorityIntervention === priorityFilter)
  ), [assessments, search, priorityFilter]);

  function toggleList(key, value) {
    setForm(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }));
  }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        organizationId: role === "SUPER_ADMIN" ? organizationId : user.organizationId,
        infrastructureStatus: [form.infrastructureStatus, ...form.infrastructureChecks].filter(Boolean).join("; "),
        initialWaterQuality: Object.fromEntries(Object.entries(form.initialWaterQuality).map(([key, value]) => [key, value === "" ? null : Number(value)]))
      };
      delete payload.infrastructureChecks;
      await api.post("/field-assessments", payload);
      setForm(freshForm()); setShowForm(false); await load();
    } catch (e) { setError(e.response?.data?.message || "Field assessment could not be saved."); }
    finally { setSaving(false); }
  }

  const labelClass = "grid gap-1 text-xs font-semibold text-[#67827c]";
  const inputClass = "rounded-lg border border-[#dce9e4] bg-white p-2.5 text-sm text-[#315b59] outline-none focus:border-[#4b9b83]";

  return <AdminLayout title="Field Assessment">
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="dashboard-kicker">Community WASH · Sanitary inspection</p><h1 className="text-3xl font-extrabold text-[#173c3d]">Field assessment</h1><p className="mt-2 text-sm text-[#78918e]">Assess water infrastructure, sanitary risks and the impact of water insecurity on community wellbeing.</p></div><button type="button" onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-2 rounded-lg bg-[#0d6655] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>New assessment</button></header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {showForm && <form onSubmit={save} className="space-y-5 rounded-2xl border border-[#dcebe5] bg-white p-5 shadow-sm">
        <div><p className="dashboard-kicker">Community WASH inspection</p><h2 className="text-xl font-extrabold text-[#214f4b]">Assessment details</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {role === "SUPER_ADMIN" && <label className={labelClass}>Organization<select required value={organizationId} onChange={e => setOrganizationId(e.target.value)} className={inputClass}><option value="">Select organization</option>{organizations.map(o => <option key={o._id} value={o._id}>{o.name} ({o.code})</option>)}</select></label>}
          <label className={labelClass}>Site / community name<input required value={form.siteName} onChange={e => setForm(v => ({ ...v, siteName: e.target.value }))} className={inputClass} placeholder="Community or site name"/></label>
          <label className={labelClass}>Water source type<select value={form.sourceType} onChange={e => setForm(v => ({ ...v, sourceType: e.target.value }))} className={inputClass}>{["Spring", "Borehole/Handpump", "Piped Scheme", "Water Tank", "Other"].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className={labelClass}>Inspection date<input type="date" defaultValue={new Date().toISOString().slice(0,10)} className={inputClass} readOnly/></label>
          <label className={labelClass}>Assessed by<input value={form.assessedBy} onChange={e => setForm(v => ({ ...v, assessedBy: e.target.value }))} className={inputClass} placeholder="Inspector name"/></label>
          <label className={labelClass}>Infrastructure notes<input value={form.infrastructureStatus} onChange={e => setForm(v => ({ ...v, infrastructureStatus: e.target.value }))} className={inputClass} placeholder="Condition / functionality"/></label>
        </div>
        <div className="rounded-xl border border-[#e2eee8] p-4"><h3 className="mb-3 text-sm font-extrabold text-[#315d56]">Infrastructure inspection checklist</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{infrastructureChecks.map(item => <label key={item} className="flex items-start gap-2 text-xs text-[#58756e]"><input type="checkbox" checked={form.infrastructureChecks.includes(item)} onChange={() => toggleList("infrastructureChecks", item)} className="mt-0.5 accent-emerald-700"/>{item}</label>)}</div></div>
        <div className="rounded-xl border border-[#e2eee8] p-4"><h3 className="mb-3 text-sm font-extrabold text-[#315d56]">Sanitary risk checklist</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{riskChecks.map(item => <label key={item} className="flex items-start gap-2 text-xs text-[#58756e]"><input type="checkbox" checked={form.sanitaryRisks.includes(item)} onChange={() => toggleList("sanitaryRisks", item)} className="mt-0.5 accent-emerald-700"/>{item}</label>)}</div></div>
        <label className={labelClass}>Community water-security impact<textarea rows="4" value={form.waterSecurityImpact} onChange={e => setForm(v => ({ ...v, waterSecurityImpact: e.target.value }))} className={inputClass} placeholder="Describe effects on health, safety, dignity, school attendance, and the time burden on women and children."/></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Priority intervention<select value={form.priorityIntervention} onChange={e => setForm(v => ({ ...v, priorityIntervention: e.target.value }))} className={inputClass}>{interventions.map(x => <option key={x}>{x}</option>)}</select></label><label className={labelClass}>Additional notes<textarea rows="2" value={form.notes} onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} className={inputClass}/></label></div>
        <fieldset className="rounded-xl border border-[#e2eee8] p-4"><legend className="px-1 text-sm font-extrabold text-[#315d56]">Optional field water-quality readings</legend><div className="grid gap-3 sm:grid-cols-3">{[["ph","pH"],["turbidity","Turbidity (NTU)"],["chlorine","Free chlorine (mg/L)"]].map(([key,title]) => <label key={key} className={labelClass}>{title}<input type="number" min="0" step="any" value={form.initialWaterQuality[key]} onChange={e => setForm(v => ({ ...v, initialWaterQuality: { ...v.initialWaterQuality, [key]: e.target.value } }))} className={inputClass} placeholder="Optional"/></label>)}</div></fieldset>
        <SatelliteLocationPicker value={form} onChange={value => setForm(v => ({ ...v, ...value }))}/>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-[#dce9e4] px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#0d6655] px-4 py-2 text-sm font-bold text-white">{saving ? "Submitting…" : "Submit assessment"}</button></div>
      </form>}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e0ebe7] bg-white p-3"><div className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-3 text-[#8ba09a]"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search site, source, woreda or kebele" className="w-full rounded-lg border border-[#dce9e4] py-2 pl-9 pr-3 text-sm"/></div><div className="flex items-center gap-2 text-xs text-[#78918e]"><Filter size={14}/><select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="rounded-lg border border-[#dce9e4] p-2"><option value="all">All interventions</option>{interventions.map(x => <option key={x}>{x}</option>)}</select></div></div>
      {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-[#78918e]">Loading assessments…</div> : visibleAssessments.length ? <div className="grid gap-3 md:grid-cols-2">{visibleAssessments.map(item => <article key={item._id} className="rounded-2xl border border-[#e0ebe7] bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><strong className="text-sm text-[#315b59]">{item.siteName}</strong><p className="mt-1 text-xs text-[#8ca4a0]">{item.sourceType} · {item.priorityIntervention}</p></div><span className="text-[10px] text-[#8ca4a0]">{new Date(item.createdAt).toLocaleDateString()}</span></div><div className="mt-3"><LocationSummary value={item}/></div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#edf7f2] px-2.5 py-1 text-[10px] font-bold text-[#347766]">{item.sanitaryRisks?.length || 0} sanitary risks</span><span className="rounded-full bg-[#f3f7f5] px-2.5 py-1 text-[10px] font-bold text-[#668078]">{item.initialWaterQuality?.ph != null ? "Quality readings recorded" : "No quality readings"}</span></div><button type="button" onClick={() => setExpandedId(v => v === item._id ? "" : item._id)} className="mt-3 text-xs font-bold text-[#176c59]">{expandedId === item._id ? "Hide assessment & map" : "View assessment & satellite map"}</button>{expandedId === item._id && <div className="mt-3 space-y-2 border-t border-[#edf3ef] pt-3"><p className="text-xs text-[#67827c]"><strong>Community impact:</strong> {item.waterSecurityImpact || "Not recorded"}</p><p className="text-xs text-[#67827c]"><strong>Sanitary risks:</strong> {item.sanitaryRisks?.join(", ") || "None selected"}</p><p className="text-xs text-[#67827c]"><strong>Infrastructure:</strong> {item.infrastructureStatus || "Not recorded"}</p><SatelliteLocationPicker readOnly value={{ coordinates: item.coordinates, adminLocation: item.adminLocation, mapAdded: item.mapAdded || true }}/></div>}</article>)}</div> : <div className="rounded-xl border border-dashed border-[#cfe2da] bg-white p-10 text-center text-sm text-[#78918e]">No matching field assessments found.</div>}
    </section>
  </AdminLayout>;
}
