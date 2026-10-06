"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, Search } from "lucide-react";

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapMarker extends MapCoordinate {
  label?: string;
}

interface OpenStreetMapProps {
  center: MapCoordinate;
  zoom?: number;
  markers?: MapMarker[];
  selectable?: boolean;
  address?: string;
  onAddressChange?: (value: string) => void;
  initialLocation?: MapCoordinate | null;
  selectedLocation?: MapCoordinate | null;
  onSelect?: (location: MapCoordinate) => void;
  height?: number;
  className?: string;
}

const defaultCenter = { latitude: 20.95, longitude: 106.06 };

function isCoordinate(value: unknown): value is MapCoordinate {
  if (typeof value !== "object" || value === null) return false;
  const point = value as { latitude?: unknown; longitude?: unknown };
  return typeof point.latitude === "number" && Number.isFinite(point.latitude) &&
    point.latitude >= -90 && point.latitude <= 90 &&
    typeof point.longitude === "number" && Number.isFinite(point.longitude) &&
    point.longitude >= -180 && point.longitude <= 180;
}

function createMapDocument(
  center: MapCoordinate,
  zoom: number,
  markers: MapMarker[],
  selectable: boolean,
  initialLocation: MapCoordinate | null,
) {
  const config = JSON.stringify({
    center,
    zoom,
    markers,
    selectable,
    initialLocation,
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>html,body,#map{height:100%;width:100%;margin:0}.leaflet-container{font:13px Arial,sans-serif}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    const config = ${config};
    const notify = (data) => parent.postMessage(data, "*");
    const startMap = () => {
      const map = L.map("map", { scrollWheelZoom: true }).setView(
        [config.center.latitude, config.center.longitude],
        config.zoom
      );
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri — Sources: Esri, HERE, Garmin, FAO, NOAA, USGS, EPA, NPS"
      }).addTo(map);

      let selectedMarker = null;
      const placeMarker = (latitude, longitude, shouldNotify) => {
        const point = [latitude, longitude];
        if (selectedMarker) selectedMarker.setLatLng(point);
        else selectedMarker = L.marker(point).addTo(map);
        if (shouldNotify) notify({
          type: "hubstay-map-pin",
          latitude,
          longitude
        });
      };

      if (config.initialLocation) {
        placeMarker(config.initialLocation.latitude, config.initialLocation.longitude, false);
      }
      config.markers.forEach((point) => {
        const marker = L.marker([point.latitude, point.longitude]).addTo(map);
        if (point.label) {
          const label = document.createElement("span");
          label.textContent = point.label;
          marker.bindPopup(label);
        }
      });

      if (config.selectable) {
        map.on("click", (event) => {
          placeMarker(event.latlng.lat, event.latlng.lng, true);
        });
        window.addEventListener("message", (event) => {
          const data = event.data;
          if (data?.type === "hubstay-map-center" &&
              Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
            placeMarker(data.latitude, data.longitude, false);
            map.setView([data.latitude, data.longitude], data.zoom || 15);
          }
        });
      }

      setTimeout(() => map.invalidateSize(), 100);
      notify({ type: "hubstay-map-ready" });
    };
  </script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onload="startMap()" onerror="parent.postMessage({type:'hubstay-map-error'},'*')"></script>
</body>
</html>`;
}

export function OpenStreetMap({
  center,
  zoom = 14,
  markers = [],
  selectable = false,
  address = "",
  onAddressChange,
  initialLocation = null,
  selectedLocation = null,
  onSelect,
  height = 320,
  className = "",
}: OpenStreetMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [readyDocument, setReadyDocument] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const srcDoc = createMapDocument(center, zoom, markers, selectable, initialLocation);
  const mapReady = readyDocument === srcDoc;

  useEffect(() => {
    function receiveMapMessage(event: MessageEvent<unknown>) {
      if (event.source !== iframeRef.current?.contentWindow || typeof event.data !== "object" || event.data === null) {
        return;
      }

      const message = event.data as { type?: string; latitude?: number; longitude?: number };
      if (message.type === "hubstay-map-ready") {
        setReadyDocument(srcDoc);
        return;
      }
      if (message.type === "hubstay-map-error") {
        setSearchError("Không tải được bản đồ. Vui lòng kiểm tra kết nối rồi thử lại.");
        return;
      }
      const point = { latitude: message.latitude, longitude: message.longitude };
      if (message.type === "hubstay-map-pin" && isCoordinate(point)) {
        onSelect?.(point);
      }
    }

    window.addEventListener("message", receiveMapMessage);
    return () => window.removeEventListener("message", receiveMapMessage);
  }, [onSelect, srcDoc]);

  useEffect(() => {
    if (!selectable || !mapReady || !selectedLocation || !isCoordinate(selectedLocation)) return;
    iframeRef.current?.contentWindow?.postMessage({
      type: "hubstay-map-center",
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      zoom: 15,
    }, "*");
  }, [mapReady, selectable, selectedLocation]);

  async function findAddress() {
    if (!address.trim()) {
      setSearchError("Nhập địa chỉ trước khi tìm trên bản đồ.");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=vi&q=${encodeURIComponent(address.trim())}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Dịch vụ tìm địa chỉ hiện không khả dụng.");

      const results: Array<{ lat: string; lon: string }> = await response.json();
      const result = results[0];
      const location = result
        ? { latitude: Number(result.lat), longitude: Number(result.lon) }
        : null;
      if (!location || !isCoordinate(location)) {
        setSearchError("Không tìm thấy địa chỉ. Bạn có thể chạm trực tiếp lên bản đồ để ghim vị trí.");
        return;
      }

      onSelect?.(location);
      setSearchError("");
      iframeRef.current?.contentWindow?.postMessage({
        type: "hubstay-map-center",
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: 15,
      }, "*");
    } catch (reason) {
      setSearchError(reason instanceof Error ? reason.message : "Không thể tìm địa chỉ trên bản đồ.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void findAddress();
    }
  }

  return (
    <div className={className}>
      {selectable ? (
        <div className="mb-2.5 space-y-2">
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={address}
                onChange={(event) => onAddressChange?.(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                placeholder="Nhập địa chỉ để tìm trên bản đồ"
                aria-label="Địa chỉ cần tìm trên bản đồ"
              />
            </label>
            <button
              type="button"
              onClick={() => void findAddress()}
              disabled={isSearching}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5" />
              {isSearching ? "Đang tìm..." : "Tìm"}
            </button>
          </div>
          {searchError ? <p role="alert" className="text-[12px] text-rose-600">{searchError}</p> : null}
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        title={selectable ? "Chọn vị trí trên bản đồ OpenStreetMap" : "Bản đồ OpenStreetMap"}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="block w-full rounded-lg border border-slate-200 bg-slate-100"
        style={{ height }}
      />
      <p className="mt-1.5 text-[10px] text-slate-500">
        Bản đồ Tiles &copy; Esri — Sources: Esri, HERE, Garmin, FAO, NOAA, USGS, EPA, NPS
      </p>
    </div>
  );
}

export { defaultCenter };
