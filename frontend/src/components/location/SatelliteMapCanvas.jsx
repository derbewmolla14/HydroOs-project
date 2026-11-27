import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const markerIcon = L.divIcon({
  className: "hydroos-map-marker",
  html: '<span class="hydroos-map-marker-pulse"><span></span></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapController({ center, onSelect, readOnly }) {
  const map = useMap();
  useEffect(() => { map.setView(center, Math.max(map.getZoom(), 14), { animate: true }); }, [center[0], center[1], map]);
  useMapEvents({ click(event) { if (!readOnly) onSelect(event.latlng); } });
  return null;
}

export default function SatelliteMapCanvas({ latitude, longitude, onChange, layer, readOnly = false, popupTitle, popupDescription }) {
  const center = [Number(latitude), Number(longitude)];
  return <MapContainer center={center} zoom={14} scrollWheelZoom className="hydroos-leaflet-map h-[280px] sm:h-[380px] lg:h-[440px]">
    <TileLayer
      attribution='Tiles © <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics'
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      maxZoom={19}
    />
    {layer === "hybrid" && <TileLayer
      attribution='Labels © <a href="https://www.esri.com/">Esri</a>'
      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      maxZoom={19}
    />}
    <Marker
      position={center}
      icon={markerIcon}
      draggable={!readOnly}
      eventHandlers={{ dragend(event) { if (!readOnly) onChange(event.target.getLatLng()); } }}
    />
    <MapController center={center} onSelect={onChange} readOnly={readOnly}/>
  </MapContainer>;
}
