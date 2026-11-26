import { useEffect, useState } from "react";
import { Building2, Plus, Settings2, RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { api } from "../api";
import { AdminLayout } from "../layouts/AdminLayout";

const emptyForm = { name: "", code: "", type: "water_utility", region: "", zone: "", woreda: "", city: "", physicalAddress: "", contact: { phone: "", email: "" } };

export function OrganizationsPage() {
  const { pathname } = useLocation();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [limits, setLimits] = useState({ userLimit: 10, tankLimit: 20, subAdminLimit: 2, modules: [] });
  const [saving, setSaving] = useState(false);
  const isSettings = pathname.endsWith("/settings");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/overview");
      setOrganizations(data.organizations || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Organizations could not be loaded.");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (pathname.endsWith("/new")) setForm({ ...emptyForm, contact: { ...emptyForm.contact } }); }, [pathname]);

  async function create(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api.post("/organizations", form);
      setForm(null); await load();
      window.history.replaceState({}, "", "/organizations");
    } catch (err) { setError(err.response?.data?.message || "Organization could not be created."); }
    finally { setSaving(false); }
  }
  async function saveSettings(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await api.patch(`/organizations/${selectedId}/entitlements`, limits);
      await load();
    } catch (err) { setError(err.response?.data?.message || "Organization settings could not be saved."); }
    finally { setSaving(false); }
  }

  return <AdminLayout title="Organizations">
    <section className="module-page space-y-5">
      <header className="module-header">
        <div><p className="dashboard-kicker"><Building2 size={15}/> Platform administration</p><h1>{isSettings ? "Organization settings" : "Organization management"}</h1><p>Manage tenant organizations and their platform entitlements.</p></div>
        {!isSettings && <button className="module-action-button" onClick={() => setForm({ ...emptyForm, contact: { ...emptyForm.contact } })}><Plus size={16}/> Add organization</button>}
      </header>
      {error && <p role="alert" className="form-message error">{error}</p>}
      {isSettings && <form className="monitoring-toolbar" onSubmit={saveSettings}>
        <label>Organization<select required value={selectedId} onChange={(e) => {
          setSelectedId(e.target.value);
          const item = organizations.find((org) => org._id === e.target.value);
          setLimits({ userLimit: item?.subscription?.userLimit || 10, tankLimit: item?.subscription?.tankLimit || 20, subAdminLimit: item?.subscription?.subAdminLimit || 2, modules: item?.subscription?.modules || [] });
        }}><option value="">Select organization</option>{organizations.map((org) => <option key={org._id} value={org._id}>{org.name} ({org.code})</option>)}</select></label>
        <label>User limit<input type="number" min="1" value={limits.userLimit} onChange={(e) => setLimits({ ...limits, userLimit: Number(e.target.value) })}/></label>
        <label>Tank limit<input type="number" min="1" value={limits.tankLimit} onChange={(e) => setLimits({ ...limits, tankLimit: Number(e.target.value) })}/></label>
        <label>Sub-admin limit<input type="number" min="0" value={limits.subAdminLimit} onChange={(e) => setLimits({ ...limits, subAdminLimit: Number(e.target.value) })}/></label>
        <button className="module-action-button" disabled={!selectedId || saving}><Settings2 size={15}/>{saving ? "Saving…" : "Save settings"}</button>
      </form>}
      {loading ? <div className="module-empty">Loading organizations…</div> : <div className="tank-table-wrap">
        <table className="tank-management-table"><thead><tr><th>Organization</th><th>Code</th><th>Type</th><th>Location</th><th>Status</th><th>Plan</th></tr></thead><tbody>
          {organizations.map((org) => <tr key={org._id}><td><strong>{org.name}</strong><small>{org.contact?.email || "No contact email"}</small></td><td>{org.code}</td><td>{org.type}</td><td>{[org.city, org.zone, org.region].filter(Boolean).join(", ") || "—"}</td><td><span className={`status-pill ${org.status}`}>{org.status}</span></td><td>{org.subscription?.plan || "starter"}</td></tr>)}
        </tbody></table>
        {!organizations.length && <div className="module-empty">No organizations found.</div>}
      </div>}
      {form && <div className="modal-backdrop"><div className="tank-modal" role="dialog" aria-modal="true">
        <div className="modal-heading"><div><p className="dashboard-kicker">Tenant onboarding</p><h2>New organization</h2></div><button type="button" onClick={() => setForm(null)} aria-label="Close">×</button></div>
        <form className="form-grid" onSubmit={create}>
          <label>Organization name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
          <label>Organization code<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}/></label>
          <label>Organization type<input required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}/></label>
          <label>Region<input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}/></label>
          <label>Zone<input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}/></label>
          <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></label>
          <label>Contact email<input type="email" value={form.contact.email} onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })}/></label>
          <label>Contact phone<input value={form.contact.phone} onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })}/></label>
          <div className="form-actions form-span-two"><button type="button" className="secondary-button" onClick={() => setForm(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Creating…" : "Create organization"}</button></div>
        </form>
      </div></div>}
    </section>
  </AdminLayout>;
}
