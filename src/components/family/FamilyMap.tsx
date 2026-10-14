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
}

interface FamilyMapProps {
  locations: FamilyLocation[];
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
