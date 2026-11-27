import { lazy, Suspense, useMemo, useState } from "react";
import { MapPin, Satellite, Layers, ChevronDown, ChevronUp } from "lucide-react";
import "./satellite-location.css";

const SatelliteMapCanvas = lazy(() => import("./SatelliteMapCanvas"));

const DEFAULT_LOCATION = {
  coordinates: { latitude: 11.0849, longitude: 39.7366 },
  adminLocation: { country: "Ethiopia", region: "Amhara", zone: "South Wollo", woreda: "", kebele: "" },
  mapAdded: false,
};

function normalizeValue(value) {
  return {
    coordinates: { ...DEFAULT_LOCATION.coordinates, ...(value?.coordinates || {}) },
    adminLocation: { ...DEFAULT_LOCATION.adminLocation, ...(value?.adminLocation || {}) },
    mapAdded: Boolean(value?.mapAdded),
  };
}

export function SatelliteLocationPicker({ value, onChange, readOnly = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [layer, setLayer] = useState("satellite");
  const current = useMemo(() => normalizeValue(value), [value]);
  const { latitude, longitude } = current.coordinates;
  const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const hierarchy = ["country", "region", "zone", "woreda", "kebele"]
    .map((key) => current.adminLocation[key]?.trim())
    .filter(Boolean)
    .join(" › ");

  function update(patch) {
    if (readOnly) return;
    onChange?.({ ...current, ...patch, mapAdded: true });
  }
  function updateCoordinates(next) {
    update({ coordinates: { ...current.coordinates, ...next } });
  }
  function updateAdmin(key, next) {
    update({ adminLocation: { ...current.adminLocation, [key]: next } });
  }
  function selectMapPoint(point) {
    updateCoordinates({ latitude: Number(point.lat.toFixed(6)), longitude: Number(point.lng.toFixed(6)) });
  }
  function validateCoordinate(key, raw) {
    if (raw === "") return updateCoordinates({ [key]: "" });
    const number = Number(raw);
    const min = key === "latitude" ? -90 : -180;
    const max = key === "latitude" ? 90 : 180;
    if (Number.isFinite(number) && number >= min && number <= max) updateCoordinates({ [key]: number });
  }

  return <section className="hydroos-location-picker">
    <div className="hydroos-location-toolbar">
      <div className="min-w-0">
        <strong className="flex items-center gap-2 text-sm text-[#174c45]"><MapPin size={16}/> Satellite location</strong>
        {hierarchy && <p className="mt-1 truncate text-xs text-[#78918e]">{hierarchy}</p>}
      </div>
      {!readOnly && <button type="button" className="hydroos-map-trigger" onClick={() => { if (!current.mapAdded) onChange?.({ ...current, mapAdded: true }); setOpen((state) => !state); }}>
        {current.mapAdded ? <><Satellite size={15}/>{open ? "Hide Satellite Map" : "See Satellite Map"}</> : <><MapPin size={15}/>{open ? "Close Map" : "Add Map"}</>}
        {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>}
      {readOnly && <span className="rounded-full bg-[#e5f6ef] px-3 py-1.5 text-xs font-bold text-[#176c59]">Saved location</span>}
    </div>
    {hierarchy && <div className="hydroos-location-hierarchy">{hierarchy}</div>}
    {(open || readOnly) && <>
      <div className="hydroos-location-grid">
        <div className="hydroos-location-map-column">
          <div className="hydroos-map-heading">
            <strong><Satellite size={15}/> Interactive satellite map</strong>
            {!readOnly && <button type="button" onClick={() => setLayer((value) => value === "satellite" ? "hybrid" : "satellite")}><Layers size={14}/>{layer === "satellite" ? "Hybrid Labels" : "Satellite Map"}</button>}
            {readOnly && <span>{layer === "satellite" ? "Satellite Map" : "Hybrid Labels"}</span>}
          </div>
          {hasCoordinates ? <Suspense fallback={<div className="hydroos-map-loading">Loading satellite imagery…</div>}>
            <SatelliteMapCanvas latitude={latitude} longitude={longitude} onChange={selectMapPoint} layer={layer} readOnly={readOnly}/>
          </Suspense> : <div className="hydroos-map-loading">Enter valid latitude and longitude to show the map.</div>}
          <p className="hydroos-map-help">{readOnly ? "Saved map coordinates" : "Click the map or drag the marker to choose the exact location."}</p>
        </div>
        <div className="hydroos-location-fields">
          <h4>Coordinates</h4>
          <label>Latitude<input type="number" step="any" min="-90" max="90" value={latitude ?? ""} disabled={readOnly} onChange={(event) => validateCoordinate("latitude", event.target.value)}/></label>
          <label>Longitude<input type="number" step="any" min="-180" max="180" value={longitude ?? ""} disabled={readOnly} onChange={(event) => validateCoordinate("longitude", event.target.value)}/></label>
          <h4 className="pt-2">Administrative location</h4>
          <label>Country<input value={current.adminLocation.country} disabled={readOnly} onChange={(event) => updateAdmin("country", event.target.value)}/></label>
          <label>Region<input value={current.adminLocation.region} disabled={readOnly} onChange={(event) => updateAdmin("region", event.target.value)}/></label>
          <label>Zone<input value={current.adminLocation.zone} disabled={readOnly} onChange={(event) => updateAdmin("zone", event.target.value)}/></label>
          <label>Woreda<input value={current.adminLocation.woreda} disabled={readOnly} placeholder="e.g. Kombolcha / Kalu" onChange={(event) => updateAdmin("woreda", event.target.value)}/></label>
          <label>Kebele<input value={current.adminLocation.kebele} disabled={readOnly} onChange={(event) => updateAdmin("kebele", event.target.value)}/></label>
          <div className="hydroos-coordinate-readout"><span>Selected coordinates</span><strong>{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</strong></div>
        </div>
      </div>
    </>}
  </section>;
}

export default SatelliteLocationPicker;
