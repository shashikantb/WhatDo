"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Avatar } from "@/components/design-system/Avatar";
import { Badge } from "@/components/design-system/Badge";
import Link from "next/link";
import { MapPin, Users } from "lucide-react";

interface MapPost {
  id: string;
  slug: string;
  question: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  hideLocation: boolean;
  distanceKm: number;
  creator: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  category: { id: string; name: string } | null;
}

interface FamilyLocation {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  lastLocationUpdatedAt?: Date | string | null;
}

interface LocalPulseMapProps {
  posts: MapPost[];
  familyLocations?: FamilyLocation[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

// Fix default marker icon paths for Leaflet.
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

// Self (you-are-here): pulsing blue dot — clearly different from posts.
const selfIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="position:relative;width:26px;height:26px;">
    <div style="position:absolute;inset:-6px;border-radius:50%;background:#3b82f6;opacity:0.35;animation:lpulse 1.8s infinite;"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;border:4px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.25);"></div>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -12],
});

// Posts: indigo pin with a chat bubble icon.
const postIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#6366f1;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
    <span style="transform:rotate(45deg);color:white;font-size:15px;line-height:1;">💬</span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
});

// Custom icon for family members (green circle)
const familyIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#16a34a;width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:15px;">👨‍👩‍👧</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -14],
});

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function formatLastSeen(ts: Date | string | null | undefined): string {
  if (!ts) return "";
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

export const LocalPulseMap: React.FC<LocalPulseMapProps> = ({
  posts,
  familyLocations = [],
  centerLat,
  centerLng,
  radiusKm,
}) => {
  const visiblePosts = posts.filter(
    (p) => p.latitude != null && p.longitude != null,
  );

  return (
    <div className="rounded-xl overflow-hidden border border-border h-[calc(100vh-220px)] min-h-[400px] relative">
      <style>{`
        @keyframes lpulse {
          0% { transform: scale(0.7); opacity: 0.7; }
          70% { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location marker */}
        <Marker position={[centerLat, centerLng]} icon={selfIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                You are here
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Radius circle */}
        <Circle
          center={[centerLat, centerLng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.08 }}
        />

        {/* Nearby posts */}
        {visiblePosts.map((post) => (
          <Marker
            key={post.id}
            position={[post.latitude!, post.longitude!]}
            icon={postIcon}
          >
            <Popup>
              <div className="min-w-[220px]">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar
                    avatarUrl={post.creator?.avatarUrl ?? undefined}
                    displayName={post.creator?.displayName ?? "User"}
                    username={post.creator?.username ?? undefined}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {post.creator?.displayName || post.creator?.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {post.city ? `${post.city} · ` : ""}
                      {formatDistance(post.distanceKm)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium line-clamp-3 mb-2">
                  {post.question}
                </p>
                <div className="flex items-center justify-between">
                  {post.category && (
                    <Badge variant="default" size="sm">
                      {post.category.name}
                    </Badge>
                  )}
                  <Link
                    href={`/post/${post.slug}`}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    View post →
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Family member locations */}
        {familyLocations.map((loc) => (
          <Marker
            key={loc.userId}
            position={[loc.latitude, loc.longitude]}
            icon={familyIcon}
          >
            <Popup>
              <div className="flex items-center gap-2 min-w-[160px]">
                <Avatar
                  avatarUrl={loc.avatarUrl}
                  displayName={loc.displayName}
                  username={loc.username}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {loc.displayName || loc.username}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Family
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline block"
                  >
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                  </a>
                  {loc.lastLocationUpdatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Updated {formatLastSeen(loc.lastLocationUpdatedAt)}
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LocalPulseMap;
