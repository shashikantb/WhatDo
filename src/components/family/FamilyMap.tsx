"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Avatar } from "@/components/design-system/Avatar";

interface FamilyLocation {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  lastLocationUpdatedAt: Date | string | null;
}

interface FamilyMapProps {
  locations: FamilyLocation[];
}

function formatLastSeen(ts: Date | string | null): string {
  if (!ts) return "Unknown";
  const date = typeof ts === "string" ? new Date(ts) : ts;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

// Fix default marker icon paths for Leaflet (bundler compatibility).
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export const FamilyMap: React.FC<FamilyMapProps> = ({ locations }) => {
  const center: [number, number] =
    locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : [20.5937, 78.9629]; // India center fallback

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => (
          <Marker key={loc.userId} position={[loc.latitude, loc.longitude]}>
            <Popup>
              <div className="flex items-center gap-2">
                <Avatar
                  avatarUrl={loc.avatarUrl}
                  displayName={loc.displayName}
                  username={loc.username}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium">{loc.displayName || loc.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatLastSeen(loc.lastLocationUpdatedAt)}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default FamilyMap;
