import { useEffect, useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { AdminLayout } from "../layouts/AdminLayout";
import SatelliteLocationPicker from "../components/location/SatelliteLocationPicker";
import { LocationSummary } from "../components/location/LocationSummary";

const emptyLocation = { coordinates: { latitude: 11.0849, longitude: 39.7366 }, adminLocation: { country: "Ethiopia", region: "Amhara", zone: "South Wollo", woreda: "", kebele: "" }, mapAdded: false };
const freshForm = () => ({ siteName: "", sourceType: "Spring", infrastructureStatus: "", sanitaryRisks: [], waterSecurityImpact: "", priorityIntervention: "Rehabilitation", initialWaterQuality: { ph: "", turbidity: "", chlorine: "" }, notes: "", assessedBy: "", ...emptyLocation });

export function FieldAssessmentPage() {
  const { user } = useAuth();
  const role = user?.systemRole || user?.role;
  const [assessments, setAssessments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState(user?.organizationId || "");
  const [form, setForm] = useState(freshForm);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() { try { const {data} = await api.get("/field-assessments"); setAssessments(data.assessments || []); } catch(e) { setError(e.response?.data?.message || "Assessments could not be loaded."); } }
  useEffect(() => { load(); if (role === "SUPER_ADMIN") api.get("/dashboard/overview").then(({data})=>setOrganizations(data.organizations || [])).catch(()=>{}); }, [role]);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, organizationId: role === "SUPER_ADMIN" ? organizationId : user.organizationId,
        initialWaterQuality: Object.fromEntries(Object.entries(form.initialWaterQuality).map(([key,value])=>[key,value === "" ? null : Number(value)])) };
      await api.post("/field-assessments", payload); setForm(freshForm()); setShowForm(false); await load();
    } catch(e) { setError(e.response?.data?.message || "Field assessment could not be saved."); }
    finally { setSaving(false); }
  }

  return <AdminLayout title="Field Assessment">
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="dashboard-kicker">Drop of Water · WASH field operations</p><h1 className="text-3xl font-extrabold text-[#173c3d]">Field assessments</h1><p className="mt-2 text-sm text-[#78918e]">Capture sanitary inspections, water security risks and precise field coordinates.</p></div><button type="button" onClick={()=>setShowForm(v=>!v)} className="inline-flex items-center gap-2 rounded-lg bg-[#0d6655] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>New assessment</button></header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {showForm && <form onSubmit={save} className="rounded-xl border border-[#dcebe5] bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-[#214f4b]"><ClipboardCheck size={18}/>New field assessment</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {role === "SUPER_ADMIN" && <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Organization<select required value={organizationId} onChange={e=>setOrganizationId(e.target.value)} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"><option value="">Select organization</option>{organizations.map(o=><option key={o._id} value={o._id}>{o.name} ({o.code})</option>)}</select></label>}
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Site / community name<input required value={form.siteName} onChange={e=>setForm(v=>({...v,siteName:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Water source type<select value={form.sourceType} onChange={e=>setForm(v=>({...v,sourceType:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm">{["Spring","Borehole/Handpump","Piped Scheme","Water Tank","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Infrastructure status<input value={form.infrastructureStatus} onChange={e=>setForm(v=>({...v,infrastructureStatus:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Priority intervention<select value={form.priorityIntervention} onChange={e=>setForm(v=>({...v,priorityIntervention:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm">{["Rehabilitation","Spring Development & Protection","Water Quality Improvement","WASH Promotion","Sustainable Water Supply"].map(x=><option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-[#67827c]">Assessed by<input value={form.assessedBy} onChange={e=>setForm(v=>({...v,assessedBy:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
        </div>
        <fieldset className="mt-4 rounded-lg border border-[#e3eee9] p-3"><legend className="px-1 text-xs font-bold text-[#315d56]">Initial water quality (optional)</legend><div className="grid gap-3 sm:grid-cols-3">{["ph","turbidity","chlorine"].map(key=><label key={key} className="grid gap-1 text-xs font-semibold text-[#67827c]">{key.toUpperCase()}<input type="number" step="any" min="0" value={form.initialWaterQuality[key]} onChange={e=>setForm(v=>({...v,initialWaterQuality:{...v.initialWaterQuality,[key]:e.target.value}}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>)}</div></fieldset>
        <label className="mt-3 grid gap-1 text-xs font-semibold text-[#67827c]">Water security impact<textarea rows="2" value={form.waterSecurityImpact} onChange={e=>setForm(v=>({...v,waterSecurityImpact:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
        <label className="mt-3 grid gap-1 text-xs font-semibold text-[#67827c]">Sanitary risks (comma-separated)<input value={form.sanitaryRisks.join(", ")} onChange={e=>setForm(v=>({...v,sanitaryRisks:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
        <label className="mt-3 grid gap-1 text-xs font-semibold text-[#67827c]">Notes<textarea rows="3" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))} className="rounded-lg border border-[#dce9e4] p-2.5 text-sm"/></label>
        <SatelliteLocationPicker value={form} onChange={value=>setForm(v=>({...v,...value}))}/>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#0d6655] px-4 py-2 text-sm font-bold text-white">{saving?"Submitting…":"Submit assessment"}</button></div>
      </form>}
      {assessments.length ? <div className="grid gap-3 md:grid-cols-2">{assessments.map(item=><article key={item._id} className="rounded-xl border border-[#e0ebe7] bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><strong className="text-sm text-[#315b59]">{item.siteName}</strong><p className="mt-1 text-xs text-[#8ca4a0]">{item.sourceType} · {item.priorityIntervention}</p></div><span className="text-[10px] text-[#8ca4a0]">{new Date(item.createdAt).toLocaleDateString()}</span></div><div className="mt-3"><LocationSummary value={item}/></div><button type="button" onClick={()=>setExpandedId(v=>v===item._id?"":item._id)} className="mt-3 text-xs font-bold text-[#176c59]">{expandedId===item._id?"Hide saved map":"View submitted assessment & map"}</button>{expandedId===item._id && <><p className="mt-2 text-xs text-[#67827c]">{item.waterSecurityImpact || item.notes || "No additional notes."}</p><SatelliteLocationPicker readOnly value={{coordinates:item.coordinates,adminLocation:item.adminLocation,mapAdded:item.mapAdded}}/></>}</article>)}</div>:<div className="rounded-xl border border-dashed border-[#cfe2da] bg-white p-10 text-center text-sm text-[#78918e]">No field assessments submitted yet.</div>}
    </section>
  </AdminLayout>;
}
