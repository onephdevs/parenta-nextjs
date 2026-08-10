'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  ScaleControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { NearbyPlace } from '@/lib/maps/nearby-amenities';

import 'leaflet/dist/leaflet.css';

/** Apartment pin — Alfonso house mark from /public/brand/logo-mark.png */
const homeIcon = L.divIcon({
  className: 'nearby-home-marker',
  html: `
    <div style="
      width:44px;height:44px;border-radius:12px;
      background:#fff;border:2px solid #fff;
      box-shadow:0 2px 10px rgba(17,24,39,.35);
      overflow:hidden;display:flex;align-items:center;justify-content:center;
    ">
      <img
        src="/brand/logo-mark.png"
        alt=""
        width="44"
        height="44"
        style="display:block;width:44px;height:44px;object-fit:cover;"
        draggable="false"
      />
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
  popupAnchor: [0, -40],
});

const placeIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#0EA5E9;border:2px solid #fff;box-shadow:0 1px 4px rgba(17,24,39,.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const selectedPlaceIcon = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#F59E0B;border:3px solid #fff;box-shadow:0 2px 8px rgba(17,24,39,.45);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function FitRoute({
  home,
  visiblePlaces,
  routeCoordinates,
  selectedPlaceId,
}: {
  home: { latitude: number; longitude: number };
  visiblePlaces: NearbyPlace[];
  routeCoordinates: [number, number][] | null;
  selectedPlaceId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    let points: L.LatLngExpression[] = [];

    if (routeCoordinates && routeCoordinates.length >= 2) {
      points = routeCoordinates;
    } else if (selectedPlaceId) {
      const selected = visiblePlaces.find((p) => p.id === selectedPlaceId);
      if (selected) {
        points = [
          [home.latitude, home.longitude],
          [selected.latitude, selected.longitude],
        ];
      }
    } else {
      points = [
        [home.latitude, home.longitude],
        ...visiblePlaces.map((p) => [p.latitude, p.longitude] as L.LatLngExpression),
      ];
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }

    const bounds = L.latLngBounds(points);
    const diagonalM = map.distance(bounds.getSouthWest(), bounds.getNorthEast());
    const maxZoom = diagonalM < 120 ? 19 : diagonalM < 400 ? 18 : 16;

    map.fitBounds(bounds, {
      padding: [56, 56],
      maxZoom,
      animate: true,
    });
  }, [
    map,
    home.latitude,
    home.longitude,
    visiblePlaces,
    routeCoordinates,
    selectedPlaceId,
  ]);

  return null;
}

export interface NearbyMapProps {
  home: { latitude: number; longitude: number; name: string };
  places: NearbyPlace[];
  selectedPlaceId?: string | null;
  /** Street route only — never a straight preview line */
  routeCoordinates?: [number, number][] | null;
  onSelectPlace?: (place: NearbyPlace) => void;
  className?: string;
}

export default function NearbyMap({
  home,
  places,
  selectedPlaceId = null,
  routeCoordinates = null,
  onSelectPlace,
  className,
}: NearbyMapProps) {
  const visiblePlaces = useMemo(() => {
    if (!selectedPlaceId) return places;
    return places.filter((p) => p.id === selectedPlaceId);
  }, [places, selectedPlaceId]);

  const streetPath =
    routeCoordinates && routeCoordinates.length >= 2 ? routeCoordinates : null;

  return (
    <div className={className ?? 'h-full w-full'}>
      <MapContainer
        center={[home.latitude, home.longitude]}
        zoom={15}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full rounded-2xl [&_.leaflet-control-zoom]:border-slate-200 [&_.leaflet-control-zoom]:shadow-md [&_.leaflet-control-zoom-in]:text-lg [&_.leaflet-control-zoom-out]:text-lg"
        style={{ minHeight: 320, zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" imperial={false} />
        <FitRoute
          home={home}
          visiblePlaces={visiblePlaces}
          routeCoordinates={streetPath}
          selectedPlaceId={selectedPlaceId}
        />
        <Marker position={[home.latitude, home.longitude]} icon={homeIcon} zIndexOffset={800}>
          <Popup>
            <strong>{home.name}</strong>
            <br />
            Your apartment
          </Popup>
        </Marker>
        {visiblePlaces.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={place.id === selectedPlaceId ? selectedPlaceIcon : placeIcon}
            zIndexOffset={place.id === selectedPlaceId ? 700 : 400}
            eventHandlers={{
              click: () => onSelectPlace?.(place),
            }}
          >
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.distanceMeters < 1000
                ? `${place.distanceMeters} m`
                : `${(place.distanceMeters / 1000).toFixed(1)} km`}{' '}
              · ~{place.walkMinutes} min walk
            </Popup>
          </Marker>
        ))}
        {streetPath && (
          <>
            <Polyline
              key={`outline-${selectedPlaceId}-${streetPath.length}`}
              positions={streetPath}
              pathOptions={{
                color: '#ffffff',
                weight: 10,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              key={`path-${selectedPlaceId}-${streetPath.length}`}
              positions={streetPath}
              pathOptions={{
                color: '#2563EB',
                weight: 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
