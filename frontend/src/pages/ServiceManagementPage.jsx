import { useEffect, useState } from "react";
import { KeyRound, Link2, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { AdminLayout } from "../layouts/AdminLayout";

const serviceTypes = [
  ["water_tank", "Water Tanks"],
  ["irrigation", "Irrigation Control"],
  ["soil_moisture", "Soil Moisture"],
  ["water_source", "Water Sources"],
  ["water_quality", "Water Quality"],
];
const emptyDevice = { serviceId: "", serviceType: "water_tank", assignedToUser: "", servicePassword: "" };
const emptySubscription = { subscriptionStatus: "inactive", subscriptionPlan: "individual", monthlyFeePaid: false, subscriptionExpiresAt: "", allowedServices: [] };

export function ServiceManagementPage() {
  const { user } = useAuth();
  const isSuperAdmin = (user?.systemRole || user?.role) === "SUPER_ADMIN";
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [deviceForm, setDeviceForm] = useState(emptyDevice);
  const [linkForm, setLinkForm] = useState({ serviceId: "", servicePassword: "" });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscription);
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      if (isSuperAdmin) {
        const [serviceResponse, userResponse] = await Promise.all([
          api.get("/services/admin/devices"), api.get("/services/admin/users")
        ]);
        setServices(serviceResponse.data.services || []);
        setUsers(userResponse.data.users || []);
      } else {
        const { data } = await api.get("/services/me");
        setSubscription(data.subscription);
        setMyServices(data.services || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Service information could not be loaded.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [isSuperAdmin]);
  useEffect(() => {
    const selected = users.find((item) => item.id === selectedUserId);
    if (selected) setSubscriptionForm({
      subscriptionStatus: selected.subscriptionStatus || "inactive",
      subscriptionPlan: selected.subscriptionPlan || "individual",
      monthlyFeePaid: selected.monthlyFeePaid === true,
      subscriptionExpiresAt: selected.subscriptionExpiresAt ? new Date(selected.subscriptionExpiresAt).toISOString().slice(0, 10) : "",
      allowedServices: selected.allowedServices || [],
    });
  }, [selectedUserId, users]);

  async function createService(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess(""); setCredentials(null);
    try {
      const { data } = await api.post("/services/admin/devices", {
        ...deviceForm, assignedToUser: deviceForm.assignedToUser || null,
        servicePassword: deviceForm.servicePassword || undefined,
      });
      setCredentials(data.credentials);
      setSuccess(data.message || "Service ID created.");
      setDeviceForm(emptyDevice);
      await load();
    } catch (err) { setError(err.response?.data?.message || "Service could not be created."); }
    finally { setSaving(false); }
  }

  async function saveSubscription(event) {
    event.preventDefault(); if (!selectedUserId) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await api.patch(`/services/admin/users/${selectedUserId}/subscription`, {
        ...subscriptionForm,
        subscriptionExpiresAt: subscriptionForm.subscriptionExpiresAt || null,
      });
      setSuccess("User subscription and service permissions updated.");
      await load();
    } catch (err) { setError(err.response?.data?.message || "Subscription could not be updated."); }
    finally { setSaving(false); }
  }

  async function toggleDevice(service) {
    setError(""); setSuccess("");
    try {
      await api.patch(`/services/admin/devices/${service.id}`, { isActive: !service.isActive });
      setSuccess(`${service.serviceId} is now ${service.isActive ? "inactive" : "active"}.`);
      await load();
    } catch (err) { setError(err.response?.data?.message || "Service status could not be changed."); }
  }

  async function linkService(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const { data } = await api.post("/services/link", linkForm);
      setSuccess(data.message || "Service linked successfully.");
      setLinkForm({ serviceId: "", servicePassword: "" });
      await load();
    } catch (err) { setError(err.response?.data?.message || "Service could not be linked."); }
    finally { setSaving(false); }
  }

  function toggleAllowedService(serviceType) {
    setSubscriptionForm((current) => {
      if (current.subscriptionPlan === "all") return current;
      const exists = current.allowedServices.includes(serviceType);
      return { ...current, allowedServices: exists ? current.allowedServices.filter((item) => item !== serviceType) : [...current.allowedServices, serviceType] };
    });
  }

  const subscriptionIsActive = subscription?.subscriptionStatus === "active" && subscription?.monthlyFeePaid === true && (!subscription?.subscriptionExpiresAt || new Date(subscription.subscriptionExpiresAt) > new Date());

  return <AdminLayout title={isSuperAdmin ? "Service Activation & Management" : "My Services"}>
    <main className="mx-auto grid w-full max-w-7xl gap-6 p-1">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="dashboard-kicker"><ShieldCheck size={15}/> Subscription-controlled access</p>
          <h1 className="text-2xl font-extrabold text-[#173c3d]">{isSuperAdmin ? "Service Activation & Management" : "My Services"}</h1>
          <p className="mt-1 text-sm text-[#78918e]">{isSuperAdmin ? "Create service credentials, assign modules and manage monthly subscriptions." : "Link the service credentials supplied by your HydroOS administrator."}</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[#dce9e5] bg-white px-3 py-2 text-sm font-semibold text-[#315b59]"><RefreshCw size={15}/> Refresh</button>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}
      {credentials && <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h2 className="font-bold text-amber-950">Copy these credentials now</h2>
        <p className="mt-1 text-xs text-amber-800">The password is stored as a hash and cannot be viewed again after you leave this page.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div><small className="text-amber-800">Service ID</small><code className="block break-all rounded bg-white p-2">{credentials.serviceId}</code></div>
          <div><small className="text-amber-800">Service Password</small><code className="block break-all rounded bg-white p-2">{credentials.servicePassword}</code></div>
        </div>
        <button type="button" className="mt-3 rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white" onClick={() => navigator.clipboard?.writeText(`Service ID: ${credentials.serviceId}\nService Password: ${credentials.servicePassword}`)}>Copy credentials</button>
      </section>}

      {loading ? <div className="rounded-xl bg-white p-6 text-sm text-[#78918e]">Loading service access…</div> : isSuperAdmin ? <>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <form onSubmit={createService} className="grid content-start gap-3 rounded-xl border border-[#e0ebe7] bg-white p-5">
            <h2 className="flex items-center gap-2 font-bold text-[#214f4b]"><Plus size={17}/> Create Service ID</h2>
            <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Service ID<input required value={deviceForm.serviceId} onChange={(e) => setDeviceForm({ ...deviceForm, serviceId: e.target.value.toUpperCase() })} placeholder="e.g. IRR-002" className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"/></label>
            <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Service type<select value={deviceForm.serviceType} onChange={(e) => setDeviceForm({ ...deviceForm, serviceType: e.target.value })} className="rounded-lg border border-[#dce9e5] p-2.5 text-sm">{serviceTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Assign to user (optional)<select value={deviceForm.assignedToUser} onChange={(e) => setDeviceForm({ ...deviceForm, assignedToUser: e.target.value })} className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"><option value="">Do not assign yet</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name || item.email} · {item.email}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Custom password (optional)<input minLength={12} value={deviceForm.servicePassword} onChange={(e) => setDeviceForm({ ...deviceForm, servicePassword: e.target.value })} placeholder="Leave blank to generate securely" className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"/></label>
            <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d6254] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><KeyRound size={15}/>{saving ? "Creating…" : "Create service credentials"}</button>
          </form>

          <form onSubmit={saveSubscription} className="grid content-start gap-3 rounded-xl border border-[#e0ebe7] bg-white p-5">
            <h2 className="flex items-center gap-2 font-bold text-[#214f4b]"><Users size={17}/> User subscription & permissions</h2>
            <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Select user<select required value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"><option value="">Choose user</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name || item.email} · {item.email}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Subscription status<select value={subscriptionForm.subscriptionStatus} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, subscriptionStatus: e.target.value })} className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="expired">Expired</option></select></label>
              <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Plan<select value={subscriptionForm.subscriptionPlan} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, subscriptionPlan: e.target.value, allowedServices: e.target.value === "all" ? serviceTypes.map(([value]) => value) : subscriptionForm.allowedServices.slice(0,1) })} className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"><option value="individual">Individual (one service)</option><option value="all">All services</option></select></label>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#54716d]"><input type="checkbox" checked={subscriptionForm.monthlyFeePaid} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, monthlyFeePaid: e.target.checked })}/> Monthly fee paid</label>
            <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Subscription expiry date<input type="date" value={subscriptionForm.subscriptionExpiresAt} onChange={(e) => setSubscriptionForm({ ...subscriptionForm, subscriptionExpiresAt: e.target.value })} className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"/></label>
            <div className="grid gap-2 sm:grid-cols-2">{serviceTypes.map(([value,label]) => <label key={value} className="flex items-center gap-2 text-xs text-[#54716d]"><input type="checkbox" disabled={subscriptionForm.subscriptionPlan === "all"} checked={subscriptionForm.allowedServices.includes(value)} onChange={() => toggleAllowedService(value)}/>{label}</label>)}</div>
            <button disabled={saving || !selectedUserId} className="rounded-lg bg-[#0d6254] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save subscription & permissions"}</button>
          </form>
        </section>
        <section className="rounded-xl border border-[#e0ebe7] bg-white p-5">
          <h2 className="mb-4 font-bold text-[#214f4b]">Service credential registry</h2>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b text-xs text-[#78918e]"><tr><th className="p-2">Service ID</th><th className="p-2">Module</th><th className="p-2">Assigned user</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead><tbody>{services.map((item) => <tr key={item.id} className="border-b border-[#edf3f1]"><td className="p-2 font-semibold">{item.serviceId}</td><td className="p-2">{serviceTypes.find(([value]) => value === item.serviceType)?.[1] || item.serviceType}</td><td className="p-2">{item.assignedToUser?.name || item.assignedToUser?.email || "Unassigned"}</td><td className="p-2">{item.isActive ? "Active" : "Inactive"}</td><td className="p-2"><button onClick={() => toggleDevice(item)} className="rounded-md border border-[#dce9e5] px-2 py-1 text-xs font-semibold">{item.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table>{!services.length && <p className="py-5 text-sm text-[#78918e]">No service credentials created yet.</p>}</div>
        </section>
      </> : <>
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#e0ebe7] bg-white p-4"><small className="text-[#78918e]">Subscription status</small><strong className="mt-2 block text-lg capitalize text-[#214f4b]">{subscription?.subscriptionStatus || "inactive"}</strong></div>
          <div className="rounded-xl border border-[#e0ebe7] bg-white p-4"><small className="text-[#78918e]">Plan</small><strong className="mt-2 block text-lg capitalize text-[#214f4b]">{subscription?.subscriptionPlan || "individual"}</strong></div>
          <div className="rounded-xl border border-[#e0ebe7] bg-white p-4"><small className="text-[#78918e]">Monthly fee</small><strong className="mt-2 block text-lg text-[#214f4b]">{subscription?.monthlyFeePaid ? "Paid" : "Unpaid"}</strong></div>
        </section>
        {!subscriptionIsActive && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Your subscription is not active or the monthly fee has not been confirmed. Contact your administrator to activate service access.</p>}
        <form onSubmit={linkService} className="grid max-w-2xl gap-3 rounded-xl border border-[#e0ebe7] bg-white p-5">
          <h2 className="flex items-center gap-2 font-bold text-[#214f4b]"><Link2 size={17}/> Link a service</h2>
          <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Service ID<input required value={linkForm.serviceId} onChange={(e) => setLinkForm({ ...linkForm, serviceId: e.target.value.toUpperCase() })} placeholder="Service ID from your administrator" className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"/></label>
          <label className="grid gap-1 text-xs font-semibold text-[#54716d]">Service Password<input required type="password" value={linkForm.servicePassword} onChange={(e) => setLinkForm({ ...linkForm, servicePassword: e.target.value })} placeholder="Enter service password" className="rounded-lg border border-[#dce9e5] p-2.5 text-sm"/></label>
          <button disabled={saving || !subscriptionIsActive} className="rounded-lg bg-[#0d6254] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Linking…" : "Verify and link service"}</button>
        </form>
        <section className="rounded-xl border border-[#e0ebe7] bg-white p-5">
          <h2 className="mb-3 font-bold text-[#214f4b]">My linked services</h2>
          <div className="grid gap-3 sm:grid-cols-2">{myServices.map((item) => <div key={item._id} className="rounded-lg border border-[#edf3f1] p-3"><strong className="text-sm text-[#214f4b]">{item.serviceId}</strong><p className="mt-1 text-xs capitalize text-[#78918e]">{item.serviceType.replaceAll("_", " ")}</p><span className="mt-2 inline-block text-xs font-semibold text-emerald-700">Linked</span></div>)}</div>
          {!myServices.length && <p className="text-sm text-[#78918e]">No services linked yet.</p>}
        </section>
      </>}
    </main>
  </AdminLayout>;
}
