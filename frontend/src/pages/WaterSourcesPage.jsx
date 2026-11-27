import { useEffect, useState } from "react";
import { Plus, RefreshCw, Droplets } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { AdminLayout } from "../layouts/AdminLayout";
import SatelliteLocationPicker from "../components/location/SatelliteLocationPicker";
import { LocationSummary } from "../components/location/LocationSummary";

const emptyLocation = { coordinates: { latitude: 11.0849, longitude: 39.7366 }, adminLocation: { country: "Ethiopia", region: "Amhara", zone: "South Wollo", woreda: "", kebele: "" }, mapAdded: false };
const initialForm = () => ({ name: "", code: "", sourceType: "spring", description: "", ...emptyLocation });

export function WaterSourcesPage() {
  const { user } = useAuth();
  const role = user?.systemRole || user?.role;
  const canManage = ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "SUB_ADMIN"].includes(role);
  const [sources, setSources] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [organizationId, setOrganizationId] = useState(user?.organizationId || "");
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { const { data } = await api.get("/sources"); setSources(data.sources || []); setError(""); }
    catch (e) { setError(e.response?.data?.message || "Water sources could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); if (role === "SUPER_ADMIN") api.get("/dashboard/overview").then(({data}) => setOrganizations(data.organizations || [])).catch(() => {}); }, [role]);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, organizationId: role === "SUPER_ADMIN" ? organizationId : user.organizationId };
      await api.post("/sources", payload);
      setForm(initialForm()); setShowForm(false); await load();
    } catch (e) { setError(e.response?.data?.message || "Water source could not be saved."); }
    finally { setSaving(false); }
  }

  return <AdminLayout title="Water Sources">
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="dashboard-kicker">HydroOS water infrastructure</p><h1 className="text-3xl font-extrabold text-[#173c3d]">Water sources</h1><p className="mt-2 text-sm text-[#78918e]">Register springs, boreholes, rivers, wells and other supply points with verified map locations.</p></div>
        <div className="flex gap-2"><button type="button" onClick={load} className="rounded-lg border border-[#dcebe5] bg-white px-3 py-2 text-sm font-bold text-[#315d56]"><RefreshCw size={15}/></button>{canManage && <button type="button" onClick={() => setShowForm(v => !v)} className="inline-flex items-center gap-2 rounded-lg bg-[#0d6655] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Register source</button>}</div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {showForm && <form onSubmit={save} className="rounded-xl border border-[#dcebe5] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-[#214f4b]">Register water source</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {role === "SUPER_ADMIN" && <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Organization<select required value={organizationId} onChange={e => setOrganizationId(e.target.value)} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"><option value="">Select organization</option>{organizations.map(o => <option key={o._id} value={o._id}>{o.name} ({o.code})</option>)}</select></label>}
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Source name<input required value={form.name} onChange={e => setForm(v => ({...v,name:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Identification code<input required value={form.code} onChange={e => setForm(v => ({...v,code:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Source type<select value={form.sourceType} onChange={e => setForm(v => ({...v,sourceType:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm">{["spring","borehole","river","well","reservoir","piped_scheme","other"].map(x=><option key={x} value={x}>{x.replace("_"," ")}</option>)}</select></label>
        </div>
        <label className="mt-3 grid gap-1 text-xs font-semibold text-[#67827c]">Description<textarea rows="2" value={form.description} onChange={e => setForm(v => ({...v,description:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
        <SatelliteLocationPicker value={form} onChange={value => setForm(v => ({...v,...value}))}/>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#0d6655] px-4 py-2 text-sm font-bold text-white">{saving ? "Saving…" : "Save water source"}</button></div>
      </form>}
      {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-[#78918e]">Loading water sources…</div> : sources.length ? <div className="grid gap-3 md:grid-cols-2">{sources.map(source => <article key={source._id} className="rounded-xl border border-[#e0ebe7] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#e7f6ef] p-2 text-[#176c59]"><Droplets size={19}/></span><div><strong className="text-sm text-[#315b59]">{source.name}</strong><p className="text-xs text-[#8ca4a0]">{source.code} · {source.sourceType}</p></div></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{source.status}</span></div>
        <div className="mt-3"><LocationSummary value={source}/></div>
        <button type="button" onClick={() => setExpandedId(v => v === source._id ? "" : source._id)} className="mt-3 text-xs font-bold text-[#176c59]">{expandedId === source._id ? "Hide saved map" : "View saved satellite map"}</button>
        {expandedId === source._id && <SatelliteLocationPicker readOnly value={{coordinates:source.coordinates,adminLocation:source.adminLocation,mapAdded:source.mapAdded}}/>}
      </article>)}</div> : <div className="rounded-xl border border-dashed border-[#cfe2da] bg-white p-10 text-center text-sm text-[#78918e]">No water sources registered yet.</div>}
    </section>
  </AdminLayout>;
}
