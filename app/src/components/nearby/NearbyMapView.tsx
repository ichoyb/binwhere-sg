'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NearbyPoint } from '@/types/app';
import type { ChannelType } from '@/types/recycling';
import type { Locale } from '@/lib/i18n/types';
import { t } from '@/lib/i18n';
import { CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';
import { formatDistance, estimateWalkTime } from '@/lib/format';
import { getNavigationUrl } from '@/lib/navigation';

interface NearbyMapViewProps {
  points: NearbyPoint[];
  userLocation: { lat: number; lng: number } | null;
  channel: ChannelType | null;
  locale?: Locale;
}

/** Get marker color from channel config */
function getMarkerColor(channel: ChannelType | null): string {
  if (!channel) return '#0077B6';
  return CHANNEL_DISPLAY_CONFIG[channel]?.color ?? '#0077B6';
}

/** Create a colored circle DivIcon (avoids Leaflet default icon webpack issues) */
function createPointIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
  });
}

/** Create a pulsing blue dot for user location */
function createUserIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#00A651;border:3px solid white;
      box-shadow:0 0 0 6px rgba(0,166,81,0.25);
      animation:pulse-dot 2s ease-in-out infinite;
    "></div>
    <style>
      @keyframes pulse-dot {
        0%,100% { box-shadow:0 0 0 6px rgba(0,166,81,0.25); }
        50% { box-shadow:0 0 0 12px rgba(0,166,81,0.1); }
      }
    </style>`,
  });
}

/** Auto-fit map bounds to include all markers */
function FitBounds({ points, userLocation }: { points: NearbyPoint[]; userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current) return;
    const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
    if (userLocation) coords.push([userLocation.lat, userLocation.lng]);
    if (coords.length === 0) return;

    const bounds = L.latLngBounds(coords);
    try {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: false });
    } catch {
      // Leaflet may throw if DOM is detached during zoom transition
    }
    fittedRef.current = true;
  }, [map, points, userLocation]);

  return null;
}

export default function NearbyMapView({ points, userLocation, channel, locale = 'en' }: NearbyMapViewProps) {
  const color = getMarkerColor(channel);
  const pointIcon = useMemo(() => createPointIcon(color), [color]);
  const userIcon = useMemo(() => createUserIcon(), []);
  // Stable key per mount to prevent "container already initialized" in StrictMode
  const mapKey = useRef(`map-${Date.now()}`);

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [1.3521, 103.8198]; // Singapore default

  return (
    <div className="relative w-full h-full">
      <MapContainer
        key={mapKey.current}
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <FitBounds points={points} userLocation={userLocation} />

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{t(locale, 'map.youAreHere')}</span>
            </Popup>
          </Marker>
        )}

        {/* Recycling point markers */}
        {points.map((point, i) => (
          <Marker key={`${point.name}-${i}`} position={[point.lat, point.lng]} icon={pointIcon}>
            <Popup>
              <div style={{ minWidth: '180px', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', lineHeight: 1.3 }}>
                  {point.name}
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                  {formatDistance(point.distanceKm)} · ~{estimateWalkTime(point.distanceKm)} {t(locale, 'shared.walk')}
                </div>
                <a
                  href={getNavigationUrl(point.lat, point.lng, point.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#0077B6',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  {t(locale, 'map.navigate')}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* OSM attribution overlay */}
      <div className="absolute bottom-1 right-1 text-[10px] text-gray-400 bg-white/80 px-1 rounded">
        &copy; OpenStreetMap
      </div>
    </div>
  );
}
