import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, Satellite, PencilLine } from "lucide-react";
import { api } from "../../api";

const SatelliteMapCanvas = lazy(() => import("./SatelliteMapCanvas"));

function getTankCoordinates(tank) {
  const latitude = tank?.coordinates?.latitude ?? tank?.latitude;
  const longitude = tank?.coordinates?.longitude ?? tank?.longitude;
  if (latitude === "" || longitude === "" || latitude == null || longitude == null) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

function hierarchyOf(tank) {
  const location = tank?.adminLocation || {};
  return ["country", "region", "zone", "woreda", "kebele"]
    .map((key) => location[key])
    .filter(Boolean)
    .join(" › ") || "Administrative location not recorded";
}

export default function TankSatelliteViewer({ className = "" }) {
  const [tanks, setTanks] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAllTanks() {
      try {
        const first = await api.get("/tanks", { params: { limit: 100, page: 1 } });
        const firstRecords = Array.isArray(first.data.tanks) ? first.data.tanks : [];
        const pages = Math.max(1, Number(first.data.pagination?.pages || 1));
        const remaining = await Promise.all(
          Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
            api.get("/tanks", { params: { limit: 100, page: index + 2 } })
          )
        );
        if (!active) return;
        const records = [...firstRecords, ...remaining.flatMap(({ data }) => Array.isArray(data.tanks) ? data.tanks : [])];
        setTanks(records);
        setSelectedId((current) => current || records[0]?._id || "");
      } catch (e) {
        if (active) setError(e.response?.data?.message || "Registered tanks could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAllTanks();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tanks;
    return tanks.filter((tank) => [tank.name, tank.code, tank.location, hierarchyOf(tank)]
      .some((value) => String(value || "").toLowerCase().includes(term)));
  }, [tanks, search]);

  const visibleSelectedId = filtered.some((tank) => tank._id === selectedId) ? selectedId : (filtered[0]?._id || "");
  const selected = tanks.find((tank) => tank._id === visibleSelectedId) || null;
  const coordinates = getTankCoordinates(selected);

  return <section className={`overflow-hidden rounded-2xl border border-[#dcebe5] bg-white shadow-sm ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8f0ec] p-4 sm:p-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0d8068]"><Satellite size={15}/> Tank location explorer</p>
        <h2 className="mt-1 text-lg font-extrabold text-[#214f4b]">Select a tank · View satellite location</h2>
        <p className="mt-1 text-xs text-[#819892]">Choose any registered tank to inspect its details and map position</p>
      </div>
      <span className="rounded-full bg-[#edf7f2] px-3 py-1.5 text-xs font-bold text-[#347766]">{tanks.length} registered</span>
    </div>
    <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.6fr)]">
      <div className="min-w-0 space-y-3">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#dce9e4] px-3 text-[#78918e]">
          <Search size={16}/>
          <input aria-label="Search registered tanks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tank name, code or location" className="w-full min-w-0 border-0 bg-transparent text-sm text-[#214f4b] outline-none"/>
        </label>
        <label className="grid gap-1 text-xs font-bold text-[#67827c]">
          Select registered tank
          <select value={visibleSelectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={loading || !filtered.length} className="min-h-11 w-full rounded-xl border border-[#dce9e4] bg-white px-3 text-sm text-[#214f4b]">
            {filtered.length ? filtered.map((tank) => <option key={tank._id} value={tank._id}>{tank.name}{tank.code ? ` · ${tank.code}` : ""}</option>) : <option value="">{loading ? "Loading tanks…" : "No matching tanks"}</option>}
          </select>
        </label>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {filtered.map((tank) => <button key={tank._id} type="button" onClick={() => setSelectedId(tank._id)} className={`block min-h-14 w-full rounded-xl border p-3 text-left transition ${selectedId === tank._id ? "border-[#4a9a83] bg-[#eff9f4]" : "border-[#e5efea] bg-white hover:bg-[#f7fbf9]"}`}>
            <span className="block truncate text-sm font-bold text-[#28564f]">{tank.name}</span>
            <span className="mt-1 block truncate text-xs text-[#819892]">{tank.code || "No tank code"} · {tank.tankType || "Tank"}</span>
          </button>)}
        </div>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        {!loading && !error && !tanks.length && <p className="rounded-xl bg-[#f7faf8] p-3 text-sm text-[#819892]">No registered tanks are available in your authorized scope.</p>}
      </div>

      <div className="min-w-0 space-y-3">
        {selected ? <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f5faf7] p-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#819892]">Tank</span>
              <p className="mt-1 break-words text-sm font-extrabold text-[#214f4b]">{selected.name}</p>
              <p className="mt-1 text-xs text-[#78918e]">{selected.code || "No code"} · {selected.status || "Status unavailable"}</p>
            </div>
            <div className="rounded-xl bg-[#f5faf7] p-3">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#819892]">Capacity</span>
              <p className="mt-1 text-sm font-extrabold text-[#214f4b]">{Number(selected.capacity || 0).toLocaleString()} L</p>
              <p className="mt-1 text-xs text-[#78918e]">{selected.tankType || "Tank type not specified"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-[#e5efea] p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#819892]"><MapPin size={13}/> Administrative location</span>
            <p className="mt-1 break-words text-sm font-semibold leading-relaxed text-[#315d56]">{hierarchyOf(selected)}</p>
            <p className="mt-2 text-xs text-[#78918e]">Latitude: {coordinates ? coordinates.latitude.toFixed(6) : "Not set"} <span className="px-1">·</span> Longitude: {coordinates ? coordinates.longitude.toFixed(6) : "Not set"}</p>
          </div>
          {coordinates ? <div className="overflow-hidden rounded-xl border border-[#dcebe5]">
            <div className="flex items-center justify-between gap-2 border-b border-[#e8f0ec] px-3 py-2">
              <strong className="flex items-center gap-2 text-xs text-[#315d56]"><Satellite size={14}/> Esri World Imagery</strong>
              <span className="text-[10px] font-semibold text-[#819892]">Selected tank</span>
            </div>
            <Suspense fallback={<div className="grid h-[280px] place-items-center bg-[#edf4f0] text-sm text-[#78918e] sm:h-[380px] lg:h-[440px]">Loading satellite map…</div>}>
              <SatelliteMapCanvas latitude={coordinates.latitude} longitude={coordinates.longitude} readOnly popupTitle={selected.name} popupDescription={`${selected.code || "Tank"} · ${hierarchyOf(selected)}`}/>
            </Suspense>
          </div> : <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5">
            <p className="font-bold text-amber-900">No map coordinates are set for this tank yet.</p>
            <p className="mt-1 text-sm text-amber-800">An administrator can edit this tank and set its latitude and longitude using the satellite location picker.</p>
            <Link to="/tanks" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0d6655] px-3 py-2 text-xs font-bold text-white"><PencilLine size={14}/> Open tank management</Link>
          </div>}
        </> : <div className="grid min-h-48 place-items-center rounded-xl bg-[#f7faf8] p-5 text-center text-sm text-[#819892]">{loading ? "Loading registered tanks…" : "Select a tank to view its information and satellite map."}</div>}
      </div>
    </div>
  </section>;
}
